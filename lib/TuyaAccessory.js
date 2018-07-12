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

        this.isLoadingTuyaIP = false;
        this.hasLoadedTuyaIP = false;
        this.getHandleQueuedPromises = [];

        this.isRequestingSchema = false;
        this.getSchemaQueuedPromises = [];

        // eslint-disable-next-line new-cap
        this.updateQueue = new async.queue((task, callback) => task(callback));
    }

    async getHandle() {
        return new Promise((resolve, reject) => {
            if (this.hasLoadedTuyaIP) {
                resolve(this.tuya);
            } else if (this.isLoadingTuyaIP) {
                this.getHandleQueuedPromises.push({
                    resolve,
                    reject,
                });
            } else {
                this.isLoadingTuyaIP = true;
                this.tuya.resolveIds()
                    .then(() => {
                        this.hasLoadedTuyaIP = true;

                        resolve(this.tuya);
                        this.getHandleQueuedPromises.forEach((callback) => {
                            callback.resolve(this.tuya);
                        });
                    })
                    .catch((error) => {
                        reject(error);
                        this.getHandleQueuedPromises.forEach((callback) => {
                            callback.reject(error);
                        });
                    })
                    .then(() => {
                        this.isLoadingTuyaIP = false;
                        this.getHandleQueuedPromises = [];
                    });
            }
        });
    }

    async getProperty(index) {
        const dps = await this.getSchema();
        return dps[index];
    }

    async getProperties(indexes) {
        const dps = await this.getSchema();
        return indexes.map(key => dps[key]);
    }

    async getSchema() {
        return new Promise((resolve, reject) => {
            if (this.isRequestingSchema) {
                this.getSchemaQueuedPromises.push({
                    resolve,
                    reject,
                });
            } else {
                this.isRequestingSchema = true;

                this.getHandle()
                    .then(handle => handle.get({ schema: true }))
                    .then((result) => {
                        debug(`Got accessory schema with result: ${JSON.stringify(result)}`);
                        const { dps } = result;

                        resolve(dps);
                        this.getSchemaQueuedPromises.forEach((callback) => {
                            callback.resolve(dps);
                        });
                    })
                    .catch((error) => {
                        reject(error);
                        this.getSchemaQueuedPromises.forEach((callback) => {
                            callback.reject(error);
                        });
                    })
                    .then(() => {
                        this.isRequestingSchema = false;
                        this.getSchemaQueuedPromises = [];
                    });
            }
        });
    }

    async setProperty(index, newValue) {
        return new Promise((resolve, reject) => {
            this.updateQueue.push((callback) => {
                this.setPropertyNow(index, newValue)
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

    async setPropertyNow(index, newValue) {
        return new Promise((resolve, reject) => {
            this.getHandle()
                .then(handle => handle.set({ dps: index.toString(), set: newValue }))
                .then(resolve)
                .catch((error) => {
                    this.hasLoadedTuyaIP = false;
                    reject(error);
                });
        });
    }
}

module.exports = TuyaAccessory;
