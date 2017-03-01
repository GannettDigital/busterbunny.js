var amqp = require('amqplib');

module.exports = function(url, callback) {
    var connectionState = {url: url};
    amqp.connect(url).then(function(conn) {
        connectionState.connection = conn;
        return conn.createChannel();
    }).then(function(ch) {
        connectionState.channel = ch;
        return connectionState;
    }).asCallback(callback);
};
