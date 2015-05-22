module.exports = (function() {
    var EventEmitter = require('events').EventEmitter;

    function BusterBunny(config, onReady) {
        var self = this;
        var _connection;
        var _onReady = onReady;
        var _connected = false;
        var _eventPublishQueue = [];
        var _eventSubscribers = [];
        var _channel;
        var _stats = { queuedEventsToRaise : 0, subscribers : 0, reconnects: 0 };
        var _amqp = require('amqplib/callback_api');
        var format = require('string-format');

        const READY_EVENT = 'ready',
            CONNECTING_EVENT = 'connecting',
            RECONNECTING_EVENT = 'reconnecting',
            CONNECTED_EVENT  = 'connected',
            ERROR_EVENT = 'error',
            PUBLISH_CHANNEL_ESTABLISHED_EVENT = 'publish-channel-established',
            PUBLISH_REQUESTED_EVENT = 'publish-requested',
            EVENT_RECEIVED_EVENT = 'event-received';


        if (typeof _onReady != 'function') {
            throw new Error('onReady not defined for event bus');
        }

        // Url format: amqp://{username}:{password}@{hostname}:{port}/{vhost}?heartbeat={heartbeat}
        var url = format(
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
        };

        function publishOrQueue(exchange, eventId, eventData, options, afterRaised) {
            var args = [exchange, eventId, eventData];
            if (options) args.push(options);
            if (afterRaised) args.push(afterRaised);
            _eventPublishQueue.push(args);
            self.emit(PUBLISH_REQUESTED_EVENT);
        }

        function publishQueuedRequestsRecursively() {
            if (!_connected || !_channel) return;
            var args = _eventPublishQueue.pop();

            //the last arg is a method for after invoking publish
            var afterRaised = args.splice(args.length-1, 1)[0];
            _channel.publish.apply(_channel, args);
            _stats.queuedEventsToRaise--;
            afterRaised();

            publishQueuedRequestsRecursively();
        }

        function connect() {
            _amqp.connect(url, function (err, conn) {
                if (err) {
                    self.emit(RECONNECTING_EVENT);
                }

                self.emit(CONNECTING_EVENT, conn);
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

                _channel = channel;
                self.emit(PUBLISH_CHANNEL_ESTABLISHED_EVENT);
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
                            message.reject = function (requeue) {
                                channel.nack(message, false, requeue);
                            };

                            message.acknowledge = function () {
                                channel.ack(message, false)
                            };

                            self.emit(EVENT_RECEIVED_EVENT, event, message);
                        } catch (err) {
                            channel.nack(message, false, true);
                        }
                    });
                });
            });
        }

        self.on(EVENT_RECEIVED_EVENT, function(event, message) {
            _eventSubscribers.forEach(function(onNext) {
                onNext(event, message);
            });
        });

        self.on(CONNECTING_EVENT, function(conn) {
            _connection = conn;
            _connection.on(ERROR_EVENT, function() {
                self.emit(RECONNECTING_EVENT);
            });

            _connected = true;
            self.emit(CONNECTED_EVENT);
        });

        self.on(RECONNECTING_EVENT, function(){
            reconnect();
        });

        self.on(CONNECTED_EVENT, function() {
            createPublisherChannel();

            if (_eventSubscribers.length > 0) {
                createSubscriberChannel();
            }

            self.emit(READY_EVENT);
        });

        self.on(READY_EVENT, function() {
            _onReady(self);
        });

        self.on(PUBLISH_CHANNEL_ESTABLISHED_EVENT, publishQueuedRequestsRecursively);
        self.on(PUBLISH_REQUESTED_EVENT, publishQueuedRequestsRecursively);

        connect();
    }

    BusterBunny.prototype = new EventEmitter();

    return BusterBunny;
})();