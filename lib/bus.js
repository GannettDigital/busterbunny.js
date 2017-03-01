var format = require('string-format');
var connect = require('./connect.js');
var buses = {};

module.exports = function(config, callback) {
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

    if (buses[url]) return callback(null, buses[url]);

    connect(url, function(error, connectionState) {
        if (error) return callback(error);
        buses[url] = connectionState;
        callback(null, connectionState);
    });
};
