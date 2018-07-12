const Tuya = require('tuyapi');
const async = require('async');
const debug = require('debug')('IgenixAirConditioner');

class TuyaAccessory {
    constructor(log, config) {
        this.log = log;
        this.name = config.name;
        this.serialNumber = config.devId;
        this.tuya = new Tuya({
            type: 'outlet',
            id: config.devId,
            uid: config.uid,
            key: config.localKey,
        });

        this._isLoadingTuyaIP = false;
        this._hasLoadedTuyaIP = false;
        this._getHandleQueuedPromises = [];

        this._isRequestingSchema = false;
        this._getSchemaQueuedPromises = [];

        this._updateQueue = new async.queue((task, callback) => task(callback));
    }

    async getHandle() {
        return new Promise((resolve, reject) => {
            if (this._hasLoadedTuyaIP) {
                resolve(this.tuya);
            } else if (this._isLoadingTuyaIP) {
                this._getHandleQueuedPromises.push({
                    resolve: resolve,
                    reject: reject,
                });
            } else {
                this._isLoadingTuyaIP = true;
                this.tuya.resolveIds()
                    .then(() => {
                        this._hasLoadedTuyaIP = true;

                        resolve(this.tuya);
                        this._getHandleQueuedPromises.forEach((callback) => {
                            callback.resolve(this.tuya);
                        });
                    })
                    .catch((error) => {
                        reject(error);
                        this._getHandleQueuedPromises.forEach((callback) => {
                            callback.reject(error);
                        });
                    })
                    .then(() => {
                        this._isLoadingTuyaIP = false;
                        this._getHandleQueuedPromises = [];
                    });
            }
        });
    }

    async getProperty(index) {
        const dps = await this._getSchema();
        return dps[index];
    }

    async getProperties(indexes) {
        const dps = await this._getSchema();
        return indexes.map(key => dps[key]);
    }

    async _getSchema() {
        return new Promise(async (resolve, reject) => {
            if (this._isRequestingSchema) {
                this._getSchemaQueuedPromises.push({
                    resolve: resolve,
                    reject: reject,
                });
            } else {
                this._isRequestingSchema = true;

                this.getHandle()
                    .then(handle => handle.get({ schema: true }))
                    .then((result) => {
                        debug(`Got accessory schema with result: ${JSON.stringify(result)}`);
                        const dps = result['dps'];

                        resolve(dps);
                        this._getSchemaQueuedPromises.forEach((callback) => {
                            callback.resolve(dps);
                        });
                    })
                    .catch((error) => {
                        reject(error);
                        this._getSchemaQueuedPromises.forEach((callback) => {
                            callback.reject(error);
                        });
                    })
                    .then(() => {
                        this._isRequestingSchema = false;
                        this._getSchemaQueuedPromises = [];
                    });
            }
        });
    }

    async setProperty(index, newValue) {
        return new Promise((resolve, reject) => {
            this._updateQueue.push((callback) => {
                this._setProperty(index, newValue)
                    .then(result => callback(null, result))
                    .catch(callback);
            }, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    async _setProperty(index, newValue) {
        return new Promise((resolve, reject) => {
            this.getHandle()
                .then((handle) => {
                    return handle.set({ dps: index.toString(), set: newValue });
                })
                .then(resolve)
                .catch((error) => {
                    this._hasLoadedTuyaIP = false;
                    reject(error);
                })
        });
    }
}

module.exports = TuyaAccessory;
