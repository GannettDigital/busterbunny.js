describe('busterbunny.js raiseEvents', function() {
    var assert = require('assert');
    var expect = require('chai').expect;

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

    it('should throw an Error when raiseEvents is called and both options and afterRaised are not specified', function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function doIt() {
            bb.raiseEvents('eventId', {});
        }

        expect(doIt).to.throw(Error);
    });

    it('should throw an Error when raiseEvents is called and options is not a function and afterRaised is not specified', function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function doIt() {
            bb.raiseEvents('eventId', {}, {});
        }

        expect(doIt).to.throw(Error);
    });

    it('should throw an Error when raiseEvents is called and afterRaised is not a function', function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function doIt() {
            bb.raiseEvents('eventId', {}, {}, {afterRaised: 'not a function'});
        }

        expect(doIt).to.throw(Error);
    });

    it('should invoke afterRaised with an Error when eventId is not a string', function(done) {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function afterRaised(err) {
            expect(err).to.be.instanceof(Error);
            done();
        }

        bb.raiseEvents({eventId: 'not a string'}, {}, {}, afterRaised);
    });

    it('should invoke afterRaised with an Error when eventId is null', function(done) {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function afterRaised(err) {
            expect(err).to.be.instanceof(Error);
            done();
        }

        bb.raiseEvents(null, {}, {}, afterRaised);
    });

    it('should throw an Error when raiseEvents is called with options a non-object and afterRaised defined', function() {
        var BusterBunny = require('../../src/busterbunny.js');
        var bb = new BusterBunny(fakeConfig);

        function doIt() {
            bb.raiseEvents('eventId', {}, function() {}, function() {});
        }

        expect(doIt).to.throw(Error);
    });
});