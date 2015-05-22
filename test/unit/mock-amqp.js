module.exports = (function() {
    var EventEmitter = require('events').EventEmitter;

    function AmqpMock() {
        var connection = new EventEmitter();

        this.connect = function(url, connectionCallback) {
            connection.createChannel = function() {};
            connectionCallback(null, connection);
        };

        this.causeConnectionError = function() {
            connection.emit('error', {});
        };

        return this;
    }

    AmqpMock.prototype = new EventEmitter();

    return AmqpMock;
})();