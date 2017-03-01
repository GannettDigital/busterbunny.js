'use strict';

// note: this integration test expects that the cluster, user, queue, exchange, and binding is already established.
//
// the test expects that the queue is bound to the exchange, and that the exchange is a fanout exchange.
// please create a copy of this file in this directory, but rename the file "local.js" and make any necessary adjustments.

module.exports = {
    amqp: {
        cluster: {
            host: 'localhost',
            port: 5672,
            vhost: '/',
            login: 'user',
            password: 'password',
            heartbeat: 10
        },
        queues: [
            {
                name: 'busterbunny_test_q1'
            }
        ],
        exchange: 'busterbunny.test.fx'
    },
    statsInterval: 10
};