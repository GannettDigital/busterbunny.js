describe("busterbunny.js", function() {
    var assert = require('assert');
    var BusterBunny = require('../../src/busterbunny.js');

    it("require should return constructor", function() {
        var type = typeof BusterBunny;
        assert.equal(type, 'function');
    });
});