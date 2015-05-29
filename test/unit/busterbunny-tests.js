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

    before(function() {
        mockery.enable({ useCleanCache: true });
    });

    afterEach(function() {
        mockery.deregisterAll();
    });

    it('should attempt reconnect on failure', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');

        var bb = new BusterBunny(fakeConfig);

        bb.on('reconnecting', function() {
            assert.ok(true);
            done();
        });

        amqpMock.causeConnectionError();
    });

    it('should raiseEvents on open connection', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connection.createChannel = function(cb) {
            var channel = {
                publish: function () {
                    assert.ok(true);
                    done();
                }
            };

            cb(null, channel);
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.raiseEvents('eventId', {}, {}, function() {});
    });

    it('should raiseEvents with just eventId and event data', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connection.createChannel = function(cb) {
            var channel = {
                publish: function () {
                    assert.ok(true);
                    done();
                }
            };

            cb(null, channel);
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.raiseEvents('eventId', {});
    });

    it('should raiseEvents with eventId and event data', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connection.createChannel = function(cb) {
            var channel = {
                publish: function () {
                    assert.ok(true);
                    done();
                }
            };

            cb(null, channel);
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.raiseEvents('eventId', {});
    });

    it('should raiseEvents with eventId, event data, and an afterRaised function', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connection.createChannel = function(cb) {
            var channel = {
                publish: function () {
                    assert.ok(true);
                    done();
                }
            };

            cb(null, channel);
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.raiseEvents('eventId', {}, function() {});
    });

    it('should raiseEvents on open connection with no options and no callback', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connection.createChannel = function(cb) {
            var channel = {
                publish: function () {
                    assert.ok(true);
                    done();
                }
            };

            cb(null, channel);
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.raiseEvents('eventId', {});
    });

    it('should call after raised when calling raiseEvents on open connection with options and callback', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connection.createChannel = function(cb) {
            var channel = {
                publish: function () {
                }
            };

            cb(null, channel);
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.raiseEvents('eventId', {}, {}, function(err) {
            if (err)
                assert.fail(true, err);
            else
                assert.ok(true);

            done();
        });
    });

    it('should callback with failure after publish error thrown by amqplib', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connection.createChannel = function(cb) {
            var channel = {
                publish: function () {
                    throw new Error('EVIL!!!!');
                }
            };

            cb(null, channel);
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.raiseEvents('eventId', {}, {}, function(err) {
            if (err)
                assert.ok(true, err);
            else
                assert.fail(true);

            done();
        });
    });

    it('should receive event when received event triggered', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.subscribe(function() {
            assert.ok(true);
            done();
        });

        bb.emit('event-received', {}, {});
    });

    it('should receive event when sent from amqplib', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connection.createChannel = function(cb) {
            var channel = {};
            channel.assertQueue = function() {};
            channel.consume = function(name, callback) {
                var message = {
                    content : {
                        toString : function() {
                            return "{}";
                        }
                    }
                };
                callback(message, {});
            };

            cb(null, channel);
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        fakeConfig.queues = [
            {
                name: 'i.read.from.this1'
            }
        ];


        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.subscribe(function () {
            assert.ok(true);
            done();
        });
    });

    it('should create well formed amqp connection urls', function() {
        var AmqpMock = require('./mock-amqp.js');
        var format = require('string-format');
        var amqpMock = new AmqpMock();

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        var expectedUrl = format(
            'amqp://{0}:{1}@{2}:{3}/{4}?heartbeat={5}'
            , fakeConfig.cluster.login
            , fakeConfig.cluster.password
            , fakeConfig.cluster.host
            , fakeConfig.cluster.port
            , encodeURIComponent(fakeConfig.cluster.vhost)
            , fakeConfig.cluster.heartbeat
        );

        var actualUrl = bb.getUrl();

        assert.equal(actualUrl, expectedUrl);
    });

    it('should warn raising more events than the max queued threshold.', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connect = function() {};

        fakeConfig.thresholds = { maxRaisedEvents : 2 };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.on(bb.EVENTS.WARNING_RAISED, function(msg) {
            var expected = '2 events queued is greater than or equal to max of 2';
            assert.equal(msg, expected);
            done();
        });

        bb.raiseEvents('id', {}, {}, function() {});
        bb.raiseEvents('id', {}, {}, function() {});
    });

    it('should warn after the max number of subscribers is reached', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connect = function() {};

        fakeConfig.thresholds = { maxConsumers : 2 };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        bb.on(bb.EVENTS.WARNING_RAISED, function(msg) {
            var expected = '2 consumers is greater than or equal to max of 2';
            assert.equal(msg, expected);
            done();
        });

        bb.subscribe(function() {});
        bb.subscribe(function() {});
    });
});