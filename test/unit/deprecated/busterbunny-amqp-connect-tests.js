var mockery = require('mockery');
var assert = require('assert');
var sinon = require('sinon');

describe('deprecated.js - amqp connect callback', function() {

    before(function() {
        mockery.enable({
            useCleanCache: true
        });
    });

    beforeEach(function(){
        mockery.registerMock('buffer', {});
        mockery.registerMock('os', {hostname: function(){return 'mock-host'}});
        mockery.registerMock('ip', {address: function(){return '127.0.0.1'}});

        mockery.registerAllowable('../../lib/deprecated.js');
        mockery.registerAllowable('./mock-amqp.js');
        mockery.registerAllowable('util');
        mockery.registerAllowable('string-format');
        mockery.registerAllowable('events');
        mockery.registerAllowable('merge');
    });

    afterEach(function() {
        mockery.deregisterAll();
        mockery.resetCache();
    });

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



    it('should emit a RECONNECTING event when _amqp.connect calls back with an error', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        var connectWithError;

        amqpMock.connect = function(url, options, onConnect) {
            connectWithError = onConnect;
        };

        fakeConfig.thresholds = {maxConsumers: 2};
        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');

        var bb = new BusterBunny(fakeConfig);
        bb.removeAllListeners(bb.EVENTS.RECONNECTING);
        bb.removeAllListeners(bb.EVENTS.CONNECTING);

        bb.on(bb.EVENTS.RECONNECTING, function() {
            assert.ok('RECONNECTING was emitted.');
            done();
        });

        connectWithError(new Error('whatever'));
    });

    it('should emit a CONNECTING event when _amqp.connect calls back without an error', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        var connectWithoutError;

        amqpMock.connect = function(url, options, onConnect) {
            connectWithoutError = onConnect;
        };

        fakeConfig.thresholds = {maxConsumers: 2};
        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');

        var bb = new BusterBunny(fakeConfig);
        bb.removeAllListeners(bb.EVENTS.RECONNECTING);
        bb.removeAllListeners(bb.EVENTS.CONNECTING);

        bb.on(bb.EVENTS.CONNECTING, function() {
            assert.ok('CONNECTING was emitted.');
            done();
        });

        connectWithoutError(null, {});
    });

    it('should emit a RECONNECTING event but not a CONNECTING event when _amqp.connect calls back with an error', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        var connectWithError;

        amqpMock.connect = function(url, options, onConnect) {
            connectWithError = onConnect;
        };

        fakeConfig.thresholds = {maxConsumers: 2};
        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');

        var bb = new BusterBunny(fakeConfig);
        bb.removeAllListeners(bb.EVENTS.RECONNECTING);
        bb.removeAllListeners(bb.EVENTS.CONNECTING);

        var connectingCalled = false;
        bb.on(bb.EVENTS.CONNECTING, function() {
            connectingCalled = true;
        });

        var reconnectingCalled = false;
        bb.on(bb.EVENTS.RECONNECTING, function() {
            reconnectingCalled = true;
        });

        bb.on('verify', function() {
            assert.strictEqual(connectingCalled, false);
            assert.strictEqual(reconnectingCalled, true);
            done();
        });

        connectWithError(new Error('whatever'));
        bb.emit('verify');
    });

    it('should include client IP in the clientProperties hash on connect', function(done) {
        var amqpMock = {};

        amqpMock.connect = function(url, options, onConnect) {
            assert.strictEqual(options['clientProperties']['ip'], '127.0.0.1');
            done();
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');
        var bb = new BusterBunny(fakeConfig);
    });

    it('should include client hostname in the clientProperties hash on connect', function(done) {
        var amqpMock = {};

        amqpMock.connect = function(url, options, onConnect) {
            assert.strictEqual(options['clientProperties']['hostname'], 'mock-host');
            done();
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');
        var bb = new BusterBunny(fakeConfig);
    });

    it('should include client application name in the clientProperties hash on connect', function(done) {
        var amqpMock = {};

        process.env.npm_package_name = 'myTestApp';

        amqpMock.connect = function(url, options, onConnect) {
            assert.strictEqual(options['clientProperties']['application'], process.env.npm_package_name);
            done();
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');
        var bb = new BusterBunny(fakeConfig);
    });

    it('should emit a CONNECTING event but not a RECONNECTING event when _amqp.connect calls back without an error', function(done) {
        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        var connectWithoutError;

        amqpMock.connect = function(url, options, onConnect) {
            connectWithoutError = onConnect;
        };

        fakeConfig.thresholds = {maxConsumers: 2};
        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');

        var bb = new BusterBunny(fakeConfig);
        bb.removeAllListeners(bb.EVENTS.RECONNECTING);
        bb.removeAllListeners(bb.EVENTS.CONNECTING);

        var connectingCalled = false;
        bb.on(bb.EVENTS.CONNECTING, function() {
            connectingCalled = true;
        });

        var reconnectingCalled = false;
        bb.on(bb.EVENTS.RECONNECTING, function() {
            reconnectingCalled = true;
        });

        bb.on('verify', function() {
            assert.strictEqual(connectingCalled, true);
            assert.strictEqual(reconnectingCalled, false);
            done();
        });

        connectWithoutError(null, {});
        bb.emit('verify');
    });
});