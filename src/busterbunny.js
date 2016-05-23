module.exports = (function() {
    var EventEmitter = require('events').EventEmitter;
    var merge = require('merge');
    var util = require('util');
    var format = require('string-format');
    var ip = require('ip');
    var os = require('os');

    /**
     * @class
     * @param {Object} config - the configuration object for the queues and exchange for this instance of the event bus
     * @constructor
     */
    function BusterBunny(config) {
        var self = this;
        var _connection;
        var _connected = false;
        var _eventPublishQueue = [];
        var _eventSubscribers = [];
        var _publishingChannel;
        var _clientProperties = buildClientProperties();
        var _disconnecting = false;
        var _statsTimeoutId;
        var _stats = {
            queuedEventsToRaise: 0,
            subscribers: 0,
            reconnects: 0,
            messagesAcknowledged: 0,
            messagesRejected: 0,
            messagesRejectedWithRetry: 0
        };

        var _amqp = require('amqplib/callback_api');
        var _thresholds = {maxRaisedEvents: 100000, maxConsumers: 1000};

        if(config.thresholds)
            merge(_thresholds, config.thresholds);

        self.EVENTS = Object.freeze({
            WARNING_RAISED: 'warning-raised',
            STATS: 'stats',
            READY: 'ready',
            CONNECTING: 'connecting',
            RECONNECTING: 'reconnecting',
            CONNECTED: 'connected',
            DISCONNECTING: 'disconnecting',
            DISCONNECTED: 'disconnected',
            AMQP_ERROR: 'amqp-error',
            PUBLISH_CHANNEL_ESTABLISHED: 'publish-channel-established',
            PUBLISH_REQUESTED: 'publish-requested',
            EVENT_RECEIVED: 'event-received',
            EVENT_ACKED: 'event-acknowledged',
            EVENT_NACKED: 'event-nacked'
        });

        self.emitStats = function() {
            if (config.statsInterval) {
                var eventListeners = EventEmitter.listenerCount(self, self.EVENTS.STATS);
                if (eventListeners) {
                    self.emit(self.EVENTS.STATS, deepCopy(_stats));
                }
                _statsTimeoutId = setTimeout(self.emitStats, (config.statsInterval * 1000));
            }
        };

        self.emitStats();

        // Url format: amqp://{username}:{password}@{hostname}:{port}/{vhost}?heartbeat={heartbeat}
        var _url = format(
            'amqp://{0}:{1}@{2}:{3}/{4}?heartbeat={5}'
            , config.cluster.login
            , config.cluster.password
            , config.cluster.host
            , config.cluster.port
            , encodeURIComponent(config.cluster.vhost)
            , config.cluster.heartbeat
        );

        self.getStats = function() {
            return _stats;
        };
        
        self.getUrl = function() {
            return _url;
        };

        self.disconnect = function() {
            _disconnect();
        };

        self.encoder = {
            encodeEvent: function(event) {
                return new Buffer(JSON.stringify(event));
            },
            decodeEvent: function(message) {
                var eventContent = message.content.toString('utf8');
                return JSON.parse(eventContent);
            }
        };

        /**
         * The callback defines what to do after an event has been raised on the bus
         * @callback BusterBunny~afterRaised
         * @param err - if truthy, then an error occurred, otherwise success can be assumed
         */

        /**
         *
         * @param {string} eventId - the identifier for the event
         * @param event - the event to place on the bus
         * @param {Object} [options] - AMQPlib options object
         * @param {BusterBunny~afterRaised} afterRaised - required callback for after an event has been raised
         */
        self.raiseEvents = function(eventId, event, options, afterRaised) {
            if(options instanceof Function && afterRaised) {
                throw new Error('the third argument must be an object when a fourth argument is provided');
            }

            if(options instanceof Function && !afterRaised) {
                afterRaised = options;
                options = null;
            }

            if(!(afterRaised instanceof Function)) {
                throw new Error('the argument provided for callback is not a Function');
            }

            if(typeof eventId !== 'string') {
                afterRaised(new Error('eventId is required and must be a string'));
            } else {
                _stats.queuedEventsToRaise++;

                var eventData = self.encoder.encodeEvent(event);
                publishOrQueue(config.exchange, eventId, eventData, options, afterRaised);
            }
        };

        /**
         * The callback that defines what a given subscriber does when an event is read from the bus
         * @callback BusterBunny~onNextEventCallback
         * @param {Object} event - the event that was decoded from the AMQP message
         * @param {Object} message - the encapsulating AMQP message
         */

        /**
         * Subscribe to events from the configured queue(s)
         * @param {BusterBunny~onNextEventCallback} onNextEventCallback - callback for subscribers to the bus
         */
        self.subscribe = function(onNextEventCallback) {
            _eventSubscribers.push(onNextEventCallback);
            _stats.subscribers++;

            if(_eventSubscribers.length == 1) {
                createSubscriberChannel();
            }

            if(_eventSubscribers.length >= _thresholds.maxConsumers) {
                self.emit(self.EVENTS.WARNING_RAISED, _eventSubscribers.length + ' consumers is greater than or equal to max of ' + _thresholds.maxConsumers);
            }
        };

        function deepCopy(stats){
            return JSON.parse(JSON.stringify(stats));
        }

        function buildClientProperties(){
            var properties = {};
            properties['ip'] = ip.address();
            properties['hostname'] = os.hostname();
            properties['application'] = process.env.npm_package_name;
            return properties;
        }

        function publishOrQueue(exchange, eventId, eventData, options, afterRaised) {
            var args = [exchange, eventId, eventData];
            if(options) args.push(options);
            args.push(afterRaised);

            _eventPublishQueue.push(args);

            if(_eventPublishQueue.length >= _thresholds.maxRaisedEvents) {
                self.emit(self.EVENTS.WARNING_RAISED, _eventPublishQueue.length + ' events queued is greater than or equal to max of ' + _thresholds.maxRaisedEvents);
            }

            self.emit(self.EVENTS.PUBLISH_REQUESTED);
        }

        function publishQueuedRequestsRecursively() {
            if(!_connected || !_publishingChannel) return;

            var args = _eventPublishQueue.pop();

            if(!args) return;

            var afterRaised = args.splice(args.length - 1, 1)[0];

            try {
                _publishingChannel.publish.apply(_publishingChannel, args);
                _stats.queuedEventsToRaise--;
                afterRaised();
            } catch(err) {
                var eventId = args[1];
                var error = new Error('Event ' + eventId + ' failed to publish due to error: ' + err);
                afterRaised(error);
            }
            publishQueuedRequestsRecursively();
        }

        function connect() {
            _amqp.connect(_url, { clientProperties: _clientProperties }, function(err, conn) {
                if(err) {
                    if (!_disconnecting)
                        self.emit(self.EVENTS.RECONNECTING);
                } else {
                    self.emit(self.EVENTS.CONNECTING, conn);
                }
            });
        }

        function reconnect() {
            connect();
            _stats.reconnects++;
        }

        function _disconnect() {
            _disconnecting = true;
            self.emit(self.EVENTS.DISCONNECTING);
        }

        function createPublisherChannel() {
            if(!_connected) return;

            _connection.createChannel(function(err, channel) {
                if(err) {
                    throw new Error('Unexpected error encountered: ' + err);
                }

                _publishingChannel = channel;
                self.emit(self.EVENTS.PUBLISH_CHANNEL_ESTABLISHED);
            });
        }

        function createSubscriberChannel() {
            if(!_connected) return;

            if(!config.queues) {
                throw new Error("No queue configured");
            }

            _connection.createChannel(function(err, channel) {
                if(config.channelPrefetchCount) {
                    channel.prefetch(config.channelPrefetchCount);
                }
                config.queues.forEach(function(queue) {
                    channel.assertQueue(queue.name);
                    channel.consume(queue.name, function(message) {
                        var event;
                        try {
                            event = self.encoder.decodeEvent(message);
                        } catch(err) {
                            channel.nack(message, false, false);
                            _stats.messagesRejected++;
                            self.emit(self.EVENTS.EVENT_NACKED, null, message, false, new Date().getTime());
                        }

                        if(event) {
                            var messageObj = {
                                reject: function(requeue) {
                                    channel.nack(message, false, requeue);
                                    if(requeue === true) {
                                        _stats.messagesRejectedWithRetry++;
                                    } else {
                                        _stats.messagesRejected++;
                                    }
                                    self.emit(self.EVENTS.EVENT_NACKED, event, message, requeue, new Date().getTime());

                                },
                                acknowledge: function() {
                                    channel.ack(message, false);
                                    _stats.messagesAcknowledged++;
                                    self.emit(self.EVENTS.EVENT_ACKED, event, message, new Date().getTime());
                                }
                            };

                            self.emit(self.EVENTS.EVENT_RECEIVED, event, messageObj);
                        }
                    });
                });
            });
        }

        self.on(self.EVENTS.EVENT_RECEIVED, function(event, message) {
            _eventSubscribers.forEach(function(onNext) {
                onNext(event, message);
            });
        });

        self.on(self.EVENTS.CONNECTING, function(conn) {
            _connection = conn;
            _connection.on(self.EVENTS.AMQP_ERROR, function() {
                self.emit(self.EVENTS.RECONNECTING);
            });

            _connected = true;
            self.emit(self.EVENTS.CONNECTED);
        });

        self.on(self.EVENTS.RECONNECTING, function() {
            reconnect();
        });

        self.on(self.EVENTS.CONNECTED, function() {
            createPublisherChannel();

            if(_eventSubscribers.length == 1) {
                createSubscriberChannel();
            }

            self.emit(self.EVENTS.READY);
        });

        self.on(self.EVENTS.DISCONNECTING, function() {
            try{
                if(_connection && _connected)
                    _connection.close(function(){});
            }
            catch(err)
            {
                _connected = false;
            }
            finally
            {
                self.emitStats();
                self.emit(self.EVENTS.DISCONNECTED);
            }
        });

        self.on(self.EVENTS.PUBLISH_CHANNEL_ESTABLISHED, publishQueuedRequestsRecursively);
        self.on(self.EVENTS.PUBLISH_REQUESTED, publishQueuedRequestsRecursively);

        connect();

        return self;
    }

    util.inherits(BusterBunny, EventEmitter);

    return BusterBunny;
})();