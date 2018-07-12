module.exports = (homebridge) => {
    // eslint-disable-next-line global-require
    const IgenixAirConditioner = require('./lib/IgenixAirConditioner')(homebridge);
    homebridge.registerAccessory('homebridge-igenix-air-conditioner', 'IgenixAirConditioner', IgenixAirConditioner);
};
