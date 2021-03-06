var sinon = require('sinon');

module.exports = (function() {
    var util = require('util');
    var EventEmitter = require('events').EventEmitter;

    function AmqpMock() {
        var mock = this;
        mock.connection = new EventEmitter();
        mock.connection.createChannel = sinon.spy();
        mock.connection.close = sinon.stub().callsArgWith(0);

        mock.connect = function(url, options, connectionCallback) {
            connectionCallback(null, mock.connection);
        };

        mock.causeConnectionError = function() {
            mock.connection.emit('amqp-error', {});
        };

        return mock;
    }

    util.inherits(AmqpMock, EventEmitter);

    return AmqpMock;
})();