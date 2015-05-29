# busterbunny.js

[![npm](https://img.shields.io/npm/v/busterbunny.svg)](https://www.npmjs.com/package/busterbunny) [![Coverage Status](https://coveralls.io/repos/GannettDigital/busterbunny.js/badge.svg)](https://coveralls.io/r/GannettDigital/busterbunny.js) [![Build Status](https://travis-ci.org/GannettDigital/busterbunny.js.svg?branch=master)](https://travis-ci.org/GannettDigital/busterbunny.js)

Opinionated EventBus Library for amqplib

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
var busterBunny = new BusterBunny(config);

//raise event against bus
//this will be done when connection and channel is available
busterBunny.raiseEvents('kicked.bucket.1001', { data: { count : 9001 } });

//subscribe to events from bus
//this will be done when connection and channel is available
busterBunny.onNextEvent(function(event) {
    console.log("I found a " +  event.type + " event!");
});
```
