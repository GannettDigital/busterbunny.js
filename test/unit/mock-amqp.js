module.exports = (function() {
    var EventEmitter = require('events').EventEmitter;

    function AmqpMock() {
        var mock = this;
        mock.connection = new EventEmitter();
        mock.connection.createChannel = function() {};

        mock.connect = function(url, connectionCallback) {
            connectionCallback(null, mock.connection);
        };

        mock.causeConnectionError = function() {
            mock.connection.emit('error', {});
        };

        return mock;
    }

    AmqpMock.prototype = new EventEmitter();

    return AmqpMock;
})();