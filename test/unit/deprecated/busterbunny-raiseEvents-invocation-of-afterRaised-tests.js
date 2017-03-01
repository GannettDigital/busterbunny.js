var assert = require('assert');
var expect = require('chai').expect;
var mockery = require('mockery');
var AmqpMock = require('./mock-amqp.js');

describe('deprecated.js - raiseEvents invocation of the afterRaised callback', function() {

    var amqpMock;

    before(function() {
        mockery.enable({
            useCleanCache: true
        });
    });

    beforeEach(function(){
        amqpMock = new AmqpMock();

        mockery.registerAllowable('../../lib/deprecated.js');
        mockery.registerAllowable('./mock-amqp.js');

        mockery.registerAllowable('util');
        mockery.registerAllowable('string-format');
        mockery.registerAllowable('events');
        mockery.registerAllowable('merge');

        mockery.registerMock('buffer', {});
        mockery.registerMock('os', {hostname: function(){return 'mock-host'}});
        mockery.registerMock('ip', {address: function(){return '127.0.0.1'}});
    });

    afterEach(function() {
        mockery.deregisterAll();
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

    it('should invoke afterRaised without parameters when options are specified and channel publish is successful', function(done) {
        var eventId = 'someValidString';
        var event = {};
        var options = {};
        var afterRaised = function(err) {
            expect(err).to.be.undefined;
            done();
        };

        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connect = function(someUrl, options, onConnected) {
            onConnected(null, {
                createChannel: function(onChannelCreated) {
                    onChannelCreated(null, {
                        publish: function(exchange, routingKey, content, options) {
                        }
                    });
                },
                on: function() {
                }
            });
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');
        var busterBunny = new BusterBunny(fakeConfig);

        busterBunny.raiseEvents(eventId, event, options, afterRaised);
    });

    it('should invoke afterRaised without parameters when options are not specified and channel publish is successful', function(done) {
        var eventId = 'someValidString';
        var event = {};
        var options = undefined;
        var afterRaised = function(err) {
            expect(err).to.be.undefined;
            done();
        };

        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connect = function(someUrl, options, onConnected) {
            onConnected(null, {
                createChannel: function(onChannelCreated) {
                    onChannelCreated(null, {
                        publish: function(exchange, routingKey, content, options) {
                        }
                    });
                },
                on: function() {
                }
            });
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');
        var busterBunny = new BusterBunny(fakeConfig);

        busterBunny.raiseEvents(eventId, event, options, afterRaised);
    });

    it('should invoke afterRaised with an error when options are specified and channel publish throws an error', function(done) {
        var eventId = 'someValidString';
        var event = {};
        var options = {};
        var publishError = new Error('it done blowed up');
        var expectedError = new Error('Event ' + eventId + ' failed to publish due to error: ' + publishError);

        var afterRaised = function(err) {
            expect(err).to.be.instanceof(Error)
                .with.deep.property('message')
                .that.equals(expectedError.message);
            done();
        };

        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connect = function(someUrl, options, onConnected) {
            onConnected(null, {
                createChannel: function(onChannelCreated) {
                    onChannelCreated(null, {
                        publish: function(exchange, routingKey, content, options) {
                            throw publishError;
                        }
                    });
                },
                on: function() {
                }
            });
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');
        var busterBunny = new BusterBunny(fakeConfig);

        busterBunny.raiseEvents(eventId, event, options, afterRaised);
    });

    it('should invoke afterRaised with an error when options are not specified and channel publish throws an error', function(done) {
        var eventId = 'someValidString';
        var event = {};
        var options = undefined;
        var publishError = new Error('it done blowed up');
        var expectedError = new Error('Event ' + eventId + ' failed to publish due to error: ' + publishError);

        var afterRaised = function(err) {
            expect(err).to.be.instanceof(Error)
                .with.deep.property('message')
                .that.equals(expectedError.message);
            done();
        };

        var AmqpMock = require('./mock-amqp.js');
        var amqpMock = new AmqpMock();

        amqpMock.connect = function(someUrl, options, onConnected) {
            onConnected(null, {
                createChannel: function(onChannelCreated) {
                    onChannelCreated(null, {
                        publish: function(exchange, routingKey, content, options) {
                            throw publishError;
                        }
                    });
                },
                on: function() {
                }
            });
        };

        mockery.registerMock('amqplib/callback_api', amqpMock);

        var BusterBunny = require('.././deprecated.js');
        var busterBunny = new BusterBunny(fakeConfig);

        busterBunny.raiseEvents(eventId, event, options, afterRaised);
    });
});