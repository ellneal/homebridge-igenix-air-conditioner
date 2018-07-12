const debug = require('debug')('IgenixAirConditioner');

module.exports = (homebridge) => {
    const IgenixAirConditioner = require('./lib/IgenixAirConditioner')(homebridge);
    homebridge.registerAccessory('homebridge-igenix-air-conditioner', 'IgenixAirConditioner', IgenixAirConditioner);
};
