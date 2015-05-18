module.exports = function() {
    function EventSubscriber(bus, onNext) {
        var self = this;
        self._bus = bus;
        self._onNext = onNext;

        bus.on('connected', function() {
            if (!config.amqp.queues) {
                throw new Error("No queue configured");
            }

            _connection.createChannel(function (err, channel) {
                config.amqp.queues.forEach(function (queue) {
                    channel.assertQueue(queue.name);
                    channel.consume(queue.name, function (message) {
                        try {
                            var eventContent = message.content.toString('utf8');
                            var event = JSON.parse(eventContent);
                            message.reject = function (requeue) {
                                channel.nack(message, false, requeue);
                            };

                            message.acknowledge = function () {
                                channel.ack(message, false)
                            };
                            onNext(event, message);
                        } catch (err) {
                            channel.nack(message, false, true);
                        }
                    });
                });
            });
        });
    }

    return EventSubscriber;
}