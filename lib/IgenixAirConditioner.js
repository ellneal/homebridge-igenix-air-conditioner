const TuyaAccessory = require('./TuyaAccessory');
const { callbackify } = require('./utils');

let Service;
let Characteristic;

class IgenixAirConditioner extends TuyaAccessory {
    constructor(log, config) {
        super(log, config);

        this.informationService = null;
        this.heaterCoolerService = null;
    }

    getServices() {
        return [this.getInformationService(), this.getHeaterCoolerService()];
    }

    getInformationService() {
        if (this.informationService != null) {
            return this.informationService;
        }

        const informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, 'Igenix')
            .setCharacteristic(Characteristic.Model, 'IG9901WIFI')
            .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);

        this.informationService = informationService;
        return informationService;
    }

    getHeaterCoolerService() {
        if (this.heaterCoolerService != null) {
            return this.heaterCoolerService;
        }

        const heaterCoolerService = new Service.HeaterCooler(this.name);

        heaterCoolerService.getCharacteristic(Characteristic.Active)
            .on('get', this.getActiveCharacteristic.bind(this))
            .on('set', this.setActiveCharacteristic.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .on('get', this.getCurrentHeaterCoolerStateCharacteristic.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .setProps({
                validValues: [
                    Characteristic.TargetHeaterCoolerState.AUTO,
                    Characteristic.TargetHeaterCoolerState.COOL,
                ],
            })
            .on('get', this.getTargetHeaterCoolerStateCharacteristic.bind(this))
            .on('set', this.setTargetHeaterCoolerStateCharacteristic.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getCurrentTemperatureCharacteristic.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: 15,
                maxValue: 31,
                minStep: 1,
            })
            .on('get', this.getCoolingThresholdTemperatureCharacteristic.bind(this))
            .on('set', this.setCoolingThresholdTemperatureCharacteristic.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.SwingMode)
            .on('get', this.getSwingModeCharacteristic.bind(this))
            .on('set', this.setSwingModeCharacteristic.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                unit: undefined,
                minValue: 1,
                maxValue: 3,
                minStep: 1,
            })
            .on('get', this.getRotationSpeedCharacteristic.bind(this))
            .on('set', this.setRotationSpeedCharacteristic.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.TemperatureDisplayUnits)
            .on('get', this.getTemperatureDisplayUnitsCharacteristic.bind(this))
            .on('set', this.setTemperatureDisplayUnitsCharacteristic.bind(this));

        this.heaterCoolerService = heaterCoolerService;
        return heaterCoolerService;
    }

    async getIsActive() {
        const status = await this.getProperty(1);
        return status
            ? Characteristic.Active.ACTIVE
            : Characteristic.Active.INACTIVE;
    }

    async setIsActive(isActive) {
        const status = isActive === Characteristic.Active.ACTIVE;
        await this.setProperty(1, status);
    }

    async getCurrentHeaterCoolerState() {
        const properties = await this.getProperties([1, 4]);
        const status = properties[0];
        const mode = properties[1];
        const state = mode === 'cold'
            ? Characteristic.CurrentHeaterCoolerState.COOLING
            : Characteristic.CurrentHeaterCoolerState.IDLE;

        return status
            ? state
            : Characteristic.CurrentHeaterCoolerState.INACTIVE;
    }

    async getTargetHeaterCoolerState() {
        const mode = await this.getProperty(4);
        return mode === 'cold'
            ? Characteristic.TargetHeaterCoolerState.COOL
            : Characteristic.TargetHeaterCoolerState.AUTO;
    }

    async setTargetHeaterCoolerState(state) {
        const mode = state === Characteristic.TargetHeaterCoolerState.COOL
            ? 'cold'
            : 'auto';
        await this.setProperty(4, mode);
    }

    async getCurrentTemperature() {
        return this.getProperty(3);
    }

    async getCoolingThresholdTemperature() {
        return this.getProperty(2);
    }

    async setCoolingThresholdTemperature(temperature) {
        await this.setProperty(2, temperature);
    }

    async getSwingMode() {
        const oscillate = await this.getProperty(104);
        return oscillate
            ? Characteristic.SwingMode.SWING_ENABLED
            : Characteristic.SwingMode.SWING_DISABLED;
    }

    async setSwingMode(mode) {
        const oscillate = mode === Characteristic.SwingMode.SWING_ENABLED;
        await this.setProperty(104, oscillate);
    }

    async getRotationSpeed() {
        const fanSpeed = await this.getProperty(5);
        return Number(fanSpeed);
    }

    async setRotationSpeed(speed) {
        const fanSpeed = speed.toString();
        await this.setProperty(5, fanSpeed);
    }

    async getTemperatureDisplayUnits() {
        const unit = await this.getProperty(19);
        return unit === 'C'
            ? Characteristic.TemperatureDisplayUnits.CELSIUS
            : Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    }

    async setTemperatureDisplayUnits(units) {
        const unit = units === Characteristic.TemperatureDisplayUnits.CELSIUS
            ? 'C'
            : 'F';
        await this.setProperty(19, unit);
    }

    // MARK: Callback functions
    getActiveCharacteristic(callback) {
        callbackify(this.getIsActive(), callback);
    }

    setActiveCharacteristic(isActive, callback) {
        callbackify(this.setIsActive(isActive), callback);
    }

    getCurrentHeaterCoolerStateCharacteristic(callback) {
        callbackify(this.getCurrentHeaterCoolerState(), callback);
    }

    getTargetHeaterCoolerStateCharacteristic(callback) {
        callbackify(this.getTargetHeaterCoolerState(), callback);
    }

    setTargetHeaterCoolerStateCharacteristic(state, callback) {
        callbackify(this.setTargetHeaterCoolerState(state), callback);
    }

    getCurrentTemperatureCharacteristic(callback) {
        callbackify(this.getCurrentTemperature(), callback);
    }

    getCoolingThresholdTemperatureCharacteristic(callback) {
        callbackify(this.getCoolingThresholdTemperature(), callback);
    }

    setCoolingThresholdTemperatureCharacteristic(temperature, callback) {
        callbackify(this.setCoolingThresholdTemperature(temperature), callback);
    }

    getSwingModeCharacteristic(callback) {
        callbackify(this.getSwingMode(), callback);
    }

    setSwingModeCharacteristic(mode, callback) {
        callbackify(this.setSwingMode(mode), callback);
    }

    getRotationSpeedCharacteristic(callback) {
        callbackify(this.getRotationSpeed(), callback);
    }

    setRotationSpeedCharacteristic(speed, callback) {
        callbackify(this.setRotationSpeed(speed), callback);
    }

    getTemperatureDisplayUnitsCharacteristic(callback) {
        callbackify(this.getTemperatureDisplayUnits(), callback);
    }

    setTemperatureDisplayUnitsCharacteristic(units, callback) {
        callbackify(this.setTemperatureDisplayUnits(units), callback);
    }
}

module.exports = (homebridge) => {
    // eslint-disable-next-line prefer-destructuring
    Service = homebridge.hap.Service;
    // eslint-disable-next-line prefer-destructuring
    Characteristic = homebridge.hap.Characteristic;

    return IgenixAirConditioner;
};
