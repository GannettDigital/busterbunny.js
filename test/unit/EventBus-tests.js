describe("EventBus", function() {
    var assert = require('assert');

    it("require should return constructor", function() {
        var EventBus = require('../../src/EventBus.js');
        var type = typeof EventBus;
        assert.equal(type, 'function');
    });
});