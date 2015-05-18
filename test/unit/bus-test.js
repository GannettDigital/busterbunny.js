describe("EventBus", function() {
    var assert = require('assert');

    it("require should return constructor", function() {
        var EventBus = require('../../src/bus.js');
        var type = typeof EventBus;
        assert.equal(type, 'function');
    });
});