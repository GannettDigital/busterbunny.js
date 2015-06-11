module.exports = (function() {
    var EventEmitter = require('events').EventEmitter;
    var merge = require('merge');
    var util = require('util');
    var format = require('string-format');

    function BusterBunny(config) {
        var self = this;
        var _connection;
        var _connected = false;
        var _eventPublishQueue = [];
        var _eventSubscribers = [];
        var _publishingChannel;
        var _stats = { queuedEventsToRaise : 0, subscribers : 0, reconnects: 0 };
        var _amqp = require('amqplib/callback_api');
        var _thresholds = { maxRaisedEvents : 100000, maxConsumers : 1000 };

        if (config.thresholds)
            merge(_thresholds, config.thresholds);

        self.EVENTS = Object.freeze({
            WARNING_RAISED: 'warning-raised',
            READY: 'ready',
            CONNECTING: 'connecting',
            RECONNECTING: 'reconnecting',
            CONNECTED: 'connected',
            AMQP_ERROR: 'amqp-error',
            PUBLISH_CHANNEL_ESTABLISHED: 'publish-channel-established',
            PUBLISH_REQUESTED: 'publish-requested',
            EVENT_RECEIVED: 'event-received'
        });

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

        self.encoder = {
            encodeEvent : function(event) {
                return new Buffer(JSON.stringify(event));
            },
            decodeEvent : function(message) {
                var eventContent = message.content.toString('utf8');
                return JSON.parse(eventContent);
            }
        };

        self.raiseEvents = function (eventId, event, options, afterRaised) {
            _stats.queuedEventsToRaise++;
            if (options instanceof Function) {
                afterRaised = options;
                options = null;
            }

            var eventData = self.encoder.encodeEvent(event);
            publishOrQueue(config.exchange, eventId, eventData, options, afterRaised);
        };

        self.subscribe = function(onNextEventCallback) {
            _eventSubscribers.push(onNextEventCallback);
            _stats.subscribers++;

            if (_eventSubscribers.length == 1) {
                createSubscriberChannel();
            }

            if (_eventSubscribers.length >= _thresholds.maxConsumers) {
                self.emit(self.EVENTS.WARNING_RAISED, _eventSubscribers.length + ' consumers is greater than or equal to max of ' + _thresholds.maxConsumers);
            }
        };

        function publishOrQueue(exchange, eventId, eventData, options, afterRaised) {
            var args = [exchange, eventId, eventData];
            if (options) args.push(options);
            if (afterRaised) args.push(afterRaised);
            _eventPublishQueue.push(args);

            if (_eventPublishQueue.length >= _thresholds.maxRaisedEvents) {
                self.emit(self.EVENTS.WARNING_RAISED, _eventPublishQueue.length + ' events queued is greater than or equal to max of ' + _thresholds.maxRaisedEvents);
            }

            self.emit(self.EVENTS.PUBLISH_REQUESTED);
        }

        function publishQueuedRequestsRecursively() {
            if (!_connected || !_publishingChannel) return;

            var args = _eventPublishQueue.pop();

            if (!args) return;

            //the last arg is a method for after invoking publish
            var afterRaised;
            var error;

            if (args.length == 5)
                afterRaised = args.splice(args.length-1, 1)[0];

            try {
                _publishingChannel.publish.apply(_publishingChannel, args);
                _stats.queuedEventsToRaise--;
            } catch (err) {
                var eventId = args[1];
                error = new Error('Event ' + eventId + ' failed to publish due to error: ' + err);
            }

            if (afterRaised)
                afterRaised(error);

            publishQueuedRequestsRecursively();
        }

        function connect() {
            _amqp.connect(_url, function(err, conn) {
                if(err) {
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

        function createPublisherChannel() {
            if (!_connected) return;

            _connection.createChannel(function (err, channel) {
                if (err) {
                    throw new Error('Unexpected error encountered: ' + err);
                }

                _publishingChannel = channel;
                self.emit(self.EVENTS.PUBLISH_CHANNEL_ESTABLISHED);
            });
        }

        function createSubscriberChannel() {
            if (!_connected) return;

            if (!config.queues) {
                throw new Error("No queue configured");
            }

            _connection.createChannel(function (err, channel) {
                config.queues.forEach(function (queue) {
                    channel.assertQueue(queue.name);
                    channel.consume(queue.name, function (message) {
                        try {
                            var event = self.encoder.decodeEvent(message);

                            var messageObj = {
                                reject: function (requeue) {
                                    channel.nack(message, false, requeue);
                                },
                                acknowledge: function () {
                                    channel.ack(message, false)
                                }
                            };

                            self.emit(self.EVENTS.EVENT_RECEIVED, event, messageObj);
                        } catch (err) {
                            channel.nack(message, false, true);
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

        self.on(self.EVENTS.RECONNECTING, function(){
            reconnect();
        });

        self.on(self.EVENTS.CONNECTED, function() {
            createPublisherChannel();

            if (_eventSubscribers.length == 1) {
                createSubscriberChannel();
            }

            self.emit(self.EVENTS.READY);
        });

        self.on(self.EVENTS.PUBLISH_CHANNEL_ESTABLISHED, publishQueuedRequestsRecursively);
        self.on(self.EVENTS.PUBLISH_REQUESTED, publishQueuedRequestsRecursively);

        connect();

        return self;
    }

    util.inherits(BusterBunny, EventEmitter);

    return BusterBunny;
})();