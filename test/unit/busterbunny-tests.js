describe("busterbunny.js", function() {
    var mockery = require('mockery');
    var assert = require('assert');
    var fakeConfig = {
        cluster: {
            host: 'host.host.it',
            port: 5672,
            vhost: '/',
            login: 'someguy',
            password: '2insecure',
            heartbeat: 10
        },
        queues: [
            {
                name: 'i.read.from.this1'
            },
            {
                name: 'i.read.from.this2'
            }
        ],
        exchange: 'i.write.2.this1'
    };
    var BusterBunny = require('../../src/busterbunny.js');

    before(function() {
        mockery.enable({ useCleanCache: true });
    });

    afterEach(function() {
        mockery.deregisterAll();
    });

    it('should callback when ready', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        mockery.registerMock('amqplib/callback_api', amqpMock);

        try {
            var bb = new BusterBunny(fakeConfig, function () {
                assert.ok(true);
                done();
            });
        } catch (err) {
            assert.fail(true, err);
        }
    });

    it('should attempt reconnect on failure', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');

        var bb = new BusterBunny(fakeConfig, function () {});

        bb.on('reconnecting', function() {
            assert.ok(true);
            done();
        });

        amqpMock.causeConnectionError();
    });
});