'use strict';

module.exports = function() {
    var EventEmitter = require('events').EventEmitter;
    var config = require('config');
    var format = require('string-format');
    var amqp = require('amqplib/callback_api');

    function EventBus(onReady) {
        var bus = {};
        var _connection;

        // Url format: amqp://{username}:{password}@{hostname}:{port}/{vhost}?heartbeat={heartbeat}
        var url = format(
            'amqp://{0}:{1}@{2}:{3}/{4}?heartbeat={5}'
            , config.amqp.cluster.login
            , config.amqp.cluster.password
            , config.amqp.cluster.host
            , config.amqp.cluster.port
            , encodeURIComponent(config.amqp.cluster.vhost)
            , config.amqp.cluster.heartbeat
        );

        function connect() {
            amqp.connect(url, function (err, conn) {
                if (err) {
                    setTimeout(1000, connect);
                }
                _connection = conn;
                onReady(bus);
            });
        }
    }

    EventBus.prototype = new EventEmitter();

    return EventBus;
};