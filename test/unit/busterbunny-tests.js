describe("busterbunny.js", function() {
    var EventEmitter = require('events').EventEmitter;
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

    before(function() {
        mockery.enable({ useCleanCache: true });
    });

    afterEach(function() {
        mockery.deregisterAll();
    });

    it("require should return constructor", function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var type = typeof BusterBunny;
        assert.equal(type, 'function');
    });

    it('should callback when ready', function(done) {
        function AmqpMock() {
            this.connect = function(url, connectionCallback) {
                var connection = new EventEmitter();
                connection.createChannel = function() {};
                connectionCallback(null, connection);
            };

            return this;
        }

        AmqpMock.prototype = new EventEmitter();

        var amqpMock = new AmqpMock();

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');

        try {
            new BusterBunny(fakeConfig, function () {
                assert.ok(true);
                done();
            });
        } catch (err) {
            assert.fail(true, err);
            done();
        }
    });


    it('should attempt reconnect on failure', function(done) {
        var connection = new EventEmitter();

        function AmqpMock() {
            this.connect = function(url, connectionCallback) {
                connection.createChannel = function() {};
                connectionCallback(null, connection);
            };

            return this;
        }

        AmqpMock.prototype = new EventEmitter();

        var amqpMock = new AmqpMock();

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');

        var bb = new BusterBunny(fakeConfig, function () {
            assert.ok(true);
            done();
        });

        bb.on('reonnecting', function() {
            assert.ok(true);
            done();
        });

        connection.emit('error', {});
    });
});