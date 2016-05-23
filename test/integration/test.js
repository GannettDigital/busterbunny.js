var BusterBunny = require('../../src/busterbunny.js');
var config = require('./config/local.js');

describe('busterbunny', function(){
    this.timeout(10000);

    it('should send and receive messages and allow the connection to be closed', function(done){
        var busterBunny = new BusterBunny(config.amqp);
        var onEventAcked = function(){
            busterBunny.disconnect();
        };
        var onDisconnected = function(){
            done();
        };
        busterBunny.on(busterBunny.EVENTS.DISCONNECTED, onDisconnected);
        busterBunny.on(busterBunny.EVENTS.EVENT_ACKED, onEventAcked);
        busterBunny.on(busterBunny.EVENTS.CONNECTED, function(){
            busterBunny.raiseEvents('id.test1', { data: { x: 2 } }, function() {
                busterBunny.subscribe(function(event, message) {
                    message.acknowledge();
                });
            });
        });
    });

    it('should gracefully handle a disconnect if disconnect is called twice', function(done){
        var calledCount = 0;
        var busterBunny = new BusterBunny(config.amqp);
        function onDisconnected(){
            calledCount += 1;
            console.log(calledCount);
            busterBunny.disconnect();
            done();
        }
        busterBunny.on(busterBunny.EVENTS.DISCONNECTED, onDisconnected);
        busterBunny.on(busterBunny.EVENTS.CONNECTED, function(){
            busterBunny.disconnect();
        });
    });
});





