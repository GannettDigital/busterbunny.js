module.exports = function() {
    function EventPublisher(eventBus) {
        var self = this;
        var _eventBus = eventBus;
        var _queue = [];
        var _channel = {};

        _eventBus.on('connected', function() {
            _eventBus.getChannel(function (err, channel) {
                if (err) {
                    throw new Error('Unexpected error encountered: ' + err);
                }

                _channel = channel;
                publishQueuedRequestsRecursively();
            });
        });

        self.raiseEvents = function (eventId, event, options, afterRaised) {
            if (options instanceof Function) {
                afterRaised = options;
                options = null;
            }

            var eventData = new Buffer(JSON.stringify(event));
            publishOrQueue(config.amqp.exchange, eventId, eventData, options);
            afterRaised();
        };

        function publishOrQueue(exchange, eventId, eventData, options) {
            _queue.push([exchange, eventId, eventData, options]);
            publishQueuedRequestsRecursively();
        }

        function publishQueuedRequestsRecursively() {
            if (!_eventBus.connected || !_channel) return;
            var args = _queue.pop();
            _channel.publish.apply(_channel, args);
            publishQueuedRequestsRecursively();
        }

        return self;
    }

    return EventPublisher;
};