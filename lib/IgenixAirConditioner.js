const TuyaAccessory = require('./TuyaAccessory');

let Service, Characteristic;
module.exports = (homebridge) => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    return IgenixAirConditioner;
};

class IgenixAirConditioner extends TuyaAccessory {
    constructor(log, config) {
        super(log, config);

        this._informationService = null;
        this._heaterCoolerService = null;
    }

    getServices() {
        return [this.getInformationService(), this.getHeaterCoolerService()];
    }

    getInformationService() {
        if (this._informationService != null) {
            return this._informationService;
        }

        let informationService = new Service.AccessoryInformation();
        informationService
          .setCharacteristic(Characteristic.Manufacturer, 'Igenix')
          .setCharacteristic(Characteristic.Model, 'IG9901WIFI')
          .setCharacteristic(Characteristic.SerialNumber, this.serialNumber);

        this._informationService = informationService;
        return informationService;
    }

    getHeaterCoolerService() {
        if (this._heaterCoolerService != null) {
            return this._heaterCoolerService;
        }

        let heaterCoolerService = new Service.HeaterCooler(this.name);

        heaterCoolerService.getCharacteristic(Characteristic.Active)
            .on('get', this._getIsActive.bind(this))
            .on('set', this._setIsActive.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)
            .on('get', this._getCurrentHeaterCoolerState.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
            .setProps({
                validValues: [
                    Characteristic.TargetHeaterCoolerState.AUTO,
                    Characteristic.TargetHeaterCoolerState.COOL,
                ],
            })
            .on('get', this._getTargetHeaterCoolerState.bind(this))
            .on('set', this._setTargetHeaterCoolerState.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this._getCurrentTemperature.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
            .setProps({
                minValue: 15,
                maxValue: 31,
                minStep: 1,
            })
            .on('get', this._getCoolingThresholdTemperature.bind(this))
            .on('set', this._setCoolingThresholdTemperature.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.SwingMode)
            .on('get', this._getSwingMode.bind(this))
            .on('set', this._setSwingMode.bind(this));

        heaterCoolerService.getCharacteristic(Characteristic.RotationSpeed)
            .setProps({
                unit: undefined,
                minValue: 1,
                maxValue: 3,
                minStep: 1,
                // validValues: [0, 33, 67, 100],
            })
            .on('get', this._getRotationSpeed.bind(this))
            .on('set', this._setRotationSpeed.bind(this));

        this._heaterCoolerService = heaterCoolerService;
        return heaterCoolerService;
    }

    async getIsActive() {
        const status = await this.getProperty(1);
        return status
            ? Characteristic.Active.ACTIVE
            : Characteristic.Active.INACTIVE
    }

    async setIsActive(isActive) {
        const status = (isActive == Characteristic.Active.ACTIVE);
        await this.setProperty(1, status);
    }

    async getCurrentHeaterCoolerState() {
        const properties = await this.getProperties([1, 4]);
        const status = properties[0];
        const mode = properties[1];

        return status
            ? mode == "cold"
                ? Characteristic.CurrentHeaterCoolerState.COOLING
                : Characteristic.CurrentHeaterCoolerState.IDLE
            : Characteristic.CurrentHeaterCoolerState.INACTIVE;
    }

    async getTargetHeaterCoolerState() {
        const mode = await this.getProperty(4);
        return mode == "cold"
            ? Characteristic.TargetHeaterCoolerState.COOL
            : Characteristic.TargetHeaterCoolerState.AUTO;
    }

    async setTargetHeaterCoolerState(state) {
        const mode = (state == Characteristic.TargetHeaterCoolerState.COOL)
            ? "cold"
            : "auto";
        await this.setProperty(4, mode);
    }

    async getCurrentTemperature() {
        return await this.getProperty(3);
    }

    async getCoolingThresholdTemperature() {
        return await this.getProperty(2);
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
        const oscillate = (mode == Characteristic.SwingMode.SWING_ENABLED);
        await this.setProperty(104, oscillate);
    }

    async getRotationSpeed() {
        const fanSpeed = await this.getProperty(5);
        return parseInt(fanSpeed);
    }

    async setRotationSpeed(speed) {
        const fanSpeed = speed.toString();
        await this.setProperty(5, fanSpeed);
    }

    _getIsActive(callback) { this._executePromise(this.getIsActive(), callback); }
    _setIsActive(isActive, callback) { this._executePromise(this.setIsActive(isActive), callback); }
    _getCurrentHeaterCoolerState(callback) { this._executePromise(this.getCurrentHeaterCoolerState(), callback); }
    _getTargetHeaterCoolerState(callback) { this._executePromise(this.getTargetHeaterCoolerState(), callback); }
    _setTargetHeaterCoolerState(state, callback) { this._executePromise(this.setTargetHeaterCoolerState(state), callback); }
    _getCurrentTemperature(callback) { this._executePromise(this.getCurrentTemperature(), callback); }
    _getCoolingThresholdTemperature(callback) { this._executePromise(this.getCoolingThresholdTemperature(), callback); }
    _setCoolingThresholdTemperature(temperature, callback) { this._executePromise(this.setCoolingThresholdTemperature(temperature), callback); }
    _getSwingMode(callback) { this._executePromise(this.getSwingMode(), callback); }
    _setSwingMode(mode, callback) { this._executePromise(this.setSwingMode(mode), callback); }
    _getRotationSpeed(callback) { this._executePromise(this.getRotationSpeed(), callback); }
    _setRotationSpeed(speed, callback) { this._executePromise(this.setRotationSpeed(speed), callback); }

    _executePromise(promise, callback) {
        promise
            .then(result => callback(null, result))
            .catch(error => callback(error));
    }
}
