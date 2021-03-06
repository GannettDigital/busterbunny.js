var mockery = require('mockery');
var assert = require('assert');
var expect = require('chai').expect;
var AmqpMock = require('./mock-amqp.js');

describe('busterbunny.js - raiseEvents input validation', function() {

    var amqpMock;

    before(function() {
        mockery.enable({
            useCleanCache: true
        });
    });

    beforeEach(function(){
        amqpMock = new AmqpMock();

        mockery.registerAllowable('../../src/busterbunny.js');
        mockery.registerAllowable('./mock-amqp.js');
        mockery.registerMock('amqplib/callback_api', amqpMock);

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

    it('should throw an Error with an appropriate message when raiseEvents is called and both options and afterRaised are not specified', function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function doIt() {
            bb.raiseEvents('eventId', {});
        }

        expect(doIt).to.throw(Error, 'the argument provided for callback is not a Function');
    });

    it('should throw an Error with an appropriate message when raiseEvents is called and options is not a function and afterRaised is not specified', function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function doIt() {
            bb.raiseEvents('eventId', {}, {});
        }

        expect(doIt).to.throw(Error, 'the argument provided for callback is not a Function');
    });

    it('should throw an Error with an appropriate message when raiseEvents is called and afterRaised is not a function', function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function doIt() {
            bb.raiseEvents('eventId', {}, {}, {afterRaised: 'not a function'});
        }

        expect(doIt).to.throw(Error, 'the argument provided for callback is not a Function');
    });

    it('should invoke afterRaised with an Error with an appropriate message when eventId is not a string', function(done) {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function afterRaised(err) {
            expect(err).to.be.instanceof(Error)
                .with.deep.property('message')
                .that.equals('eventId is required and must be a string');
            done();
        }

        bb.raiseEvents({eventId: 'not a string'}, {}, {}, afterRaised);
    });

    it('should invoke afterRaised with an Error with an appropriate message when eventId is null', function(done) {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function afterRaised(err) {
            expect(err).to.be.instanceof(Error)
                .with.deep.property('message')
                .that.equals('eventId is required and must be a string');
            done();
        }

        bb.raiseEvents(null, {}, {}, afterRaised);
    });

    it('should throw an Error with an appropriate message when raiseEvents is called with options a non-object and afterRaised defined', function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function doIt() {
            bb.raiseEvents('eventId', {}, function() {}, function() {});
        }

        expect(doIt).to.throw(Error, 'the third argument must be an object when a fourth argument is provided');
    });
});