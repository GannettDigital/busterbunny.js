# busterbunny.js

Opinionated EventBus Library for amqplib

[![npm](https://img.shields.io/npm/v/busterbunny.svg)](https://www.npmjs.com/package/busterbunny) [![Coverage Status](https://coveralls.io/repos/GannettDigital/busterbunny.js/badge.svg)](https://coveralls.io/r/GannettDigital/busterbunny.js) [![Build Status](https://travis-ci.org/GannettDigital/busterbunny.js.svg?branch=master)](https://travis-ci.org/GannettDigital/busterbunny.js)



Installation
------------
```npm install busterbunny```

Dev Setup
---------
```
npm install -g mocha
npm install -g istanbul
npm install coveralls
npm install mockery
```

Unit Testing
------------
Testing can be run using the following command

```
npm run test
```

Code Coverage
-------------

Code Coverage provided by Instanbul with hooks for coveralls.  To see coverage report run

```
npm run cover
```

Usage
--------------

```node
var BusterBunny = require('busterbunny');

//example config
var config = {
    amqp: {
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
    }
};

//init buster bunny
var busterBunny = new BusterBunny(config.amqp);

//define a callback (or do so anonymously inline)
function onAfterRaised(err) {
    //handle the error if it exists, or continue
}

//raise event against bus
//this will be done when connection and channel is available
busterBunny.raiseEvents('id.1001', { data: { x: 9001 } }, onAfterRaised);

//raise events against, providing AMQP options (see amqplib for available options)
busterBunny.raiseEvents('id.1002', { data: { x: 9002 } }, {amqp: 'options here'}, onAfterRaised);

//subscribe to events from bus
//this will be done when connection and channel is available
busterBunny.onNextEvent(function(event) {
    console.log("I found a " +  event.type + " event!");
});

```

Events
-------
Buster Bunny is an event emitter so it allows you to hook into the object to do things such as logging.  
Buster Bunny provides events as a frozen object within buster bunny.  

For example if you wanted to log warnings coming out of busterbunny   

```node
//This assumes you have required everything and have a logger
var busterBunny = new BusterBunny(config);

busterBunny.on(busterBunny.EVENTS.WARNING_RAISED, function(msg) {
    logger.warn(msg);
});
```

The current list of events (the property names) are ...

0. ```WARNING_RAISED``` when a warning (like when a threshold is reached) has been reached
0. ```READY``` when buster bunny has successfully established or re-established a connection and channels are available
0. ```CONNECTING``` when buster bunny is establishing connections
0. ```RECONNECTING``` after a connection has been lost but before it has been reconnected
0. ```CONNECTED``` after a connection has been established
0. ```AMQP_ERROR``` when the amqplib throws an error
0. ```PUBLISH_CHANNEL_ESTABLISHED``` when buster bunny is ready to publish events to an exchange
0. ```PUBLISH_REQUESTED``` when an event has been raised with buster bunny
0. ```EVENT_RECEIVED``` when buster bunny has received an event from amqp
0. ```EVENT_ACKED``` when buster bunny has been asked to acknowledge an event
0. ```EVENT_NACKED``` when buster bunny has been asked to reject or requeue an event

Some Opinions To Be Aware Of
----------------------------
* The library tries to ALWAYS be connected to amqp over one connection with 1 channel for publishing and 1 for consuming.
* The library also WARNS BUT DOENS'T REJECT when thresholds are hit allowing applications to handle the warning gracefully.
* The library doesn't enforce the format of event messages.
* The library does want all events to at least have an identifier and data.
