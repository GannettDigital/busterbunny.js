module.exports = (function() {
    var EventEmitter = require('events').EventEmitter;

    function AmqpMock() {
        this.connection = new EventEmitter();
        this.connection.createChannel = function() {};

        this.connect = function(url, connectionCallback) {
            connectionCallback(null, this.connection);
        };

        this.causeConnectionError = function() {
            this.connection.emit('error', {});
        };

        return this;
    }

    AmqpMock.prototype = new EventEmitter();

    return AmqpMock;
})();