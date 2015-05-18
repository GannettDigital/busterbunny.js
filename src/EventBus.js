'use strict';

module.exports = function() {
    var EventEmitter = require('events').EventEmitter;
    var config = require('config');
    var format = require('string-format');
    var amqp = require('amqplib/callback_api');

    function EventBus(opts, onReady) {
        var bus = {};
        var _opts = opts;
        var _connection;
        var _onReady = onReady;

        if (arguments.length == 1) {
            _opts = {reconnectTimeout: 1000};
            _onReady = opts;
        }

        if (typeof _onReady != 'function') {
            throw new Error('onReady not defined for event bus')
        }

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
                    setTimeout(opts.reconnectTimeout, connect);
                }
                _connection = conn;
                onReady(bus);
            });
        }
    }

    EventBus.prototype = new EventEmitter();

    return EventBus;
};