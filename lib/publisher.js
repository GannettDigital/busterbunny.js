module.exports = function(bus) {
    return bus.channel.publish.bind(bus.channel, bus.config.exchange);
};
