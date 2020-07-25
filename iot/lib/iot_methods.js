'use strict';

const myUtils = require('caf_iot').caf_components.myUtils;
const mockECG = require('./mockECG');

const cleanupDeviceInfo = function(devices) {
    const result = {};
    Object.keys(devices).forEach((x) => {
        result[x] = {
            uuid: devices[x].uuid,
            advertisement: myUtils.deepClone(devices[x].advertisement)
        };
    });
    return result;
};

exports.methods = {
    async __iot_setup__() {
        // Example of how to store device state in the cloud, i.e.,
        // the value of `index` from last run downloaded from the cloud.
        const lastIndex = this.toCloud.get('index');
        this.state.index = (lastIndex ? lastIndex : 0);

        this.scratch.devices = {};
        this.state.selectedDevice = null;
        this.state.devicesInfo = {};
        this.state.sensorsValues = {};
        this.state.ecgIndex = 0;
        this.state.ecgValues = [];
        this.state.mock = null;

        return [];
    },

    async __iot_loop__() {
        this.$.log && this.$.log.debug(
            'Time offset ' +
                (this.$.cloud.cli && this.$.cloud.cli.getEstimatedTimeOffset())
        );

        this.toCloud.set('index', this.state.index);
        this.state.index = this.state.index + 1;

        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' loop: ' + this.state.index);

        if (!myUtils.deepEqual(this.toCloud.get('devices'),
                               this.state.devicesInfo)) {
            this.toCloud.set('devices', this.state.devicesInfo);
        }

        if (this.state.ecgValues.length > 0) {
            this.state.sensorsValues.ecg = {
                index: this.state.ecgIndex, values: this.state.ecgValues
            };
            this.state.ecgIndex = this.state.ecgIndex +
                this.state.ecgValues.length;
            this.state.ecgValues = [];
        }

        if (!myUtils.deepEqual(this.toCloud.get('sensorsValues'),
                               this.state.sensorsValues)) {
            this.toCloud.set('sensorsValues',
                             myUtils.deepClone(this.state.sensorsValues));
        }

        return [];
    },

    async __iot_error__(err) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.warn(now +  ': Got exception: ' +
                                      myUtils.errToPrettyStr(err));

        const serializableError = JSON.parse(myUtils.errToStr(err));
        serializableError.message = serializableError.error ?
            serializableError.error.message :
            'Cannot Perform Bluetooth Operation';

        await this.$.cloud.cli.setError(serializableError).getPromise();

        return [];
    },

    async findDevices(config) {
        const now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' findDevices() config:' +
                                       JSON.stringify(config));
        this.state.config = config;

        // forget old devices
        this.scratch.devices = {};
        this.state.devicesInfo = {};

        const services = [
            this.state.config.serviceHeartRate,
            this.state.config.serviceOximetry,
            this.state.config.serviceTemp,
            this.state.config.serviceECG
        ];

        if (typeof window !== 'undefined') {
            // Wait for user click
            await this.$.gatt.findServicesWeb(
                services, '__iot_foundDevice__', 'confirmScan',
                'afterConfirmScan'
            );
        } else {
            this.$.gatt.findServices(services, '__iot_foundDevice__');
        }
        return [];
    },

    async __iot_foundDevice__(serviceId, device) {
        const services = Array.isArray(serviceId) ?
              serviceId.map(x => {return {uuid: x};}) :
              [{uuid: serviceId}];

        if (this.$.gatt.matchServiceId(services,
                                       this.state.config.serviceECG)) {
            this.scratch.devices[device.uuid] = device;
            this.state.devicesInfo = cleanupDeviceInfo(this.scratch.devices);
        } else {
            this.$.log && this.$.log.debug('Ignoring device with serviceID: ' +
                                           JSON.stringify(serviceId) +
                                           ' as opposed to ' +
                                           this.state.config.serviceECG);
        }
        return [];
    },

    async connect(deviceId) {
        this.$.log && this.$.log.debug('Selected device ' + deviceId);
        if (this.state.selectedDevice) {
            // Only one connected device
            await this.disconnect();
        }
        this.state.selectedDevice = deviceId;

        if (this.scratch.devices[deviceId]) {
            try {
                const findOne = async (service, charact, handler) => {
                    const {characteristics} =
                          await this.$.gatt.findCharacteristics(
                              service,
                              this.scratch.devices[deviceId],
                              [charact]
                          );
                    this.$.log && this.$.log.debug('found charact ' + charact);
                    await this.$.gatt.subscribe(characteristics[0], handler);
                    this.$.log && this.$.log.debug('subscribed to ' + charact);

                    return characteristics;
                };

                [this.scratch.charHeartRate] = await findOne(
                    this.state.config.serviceHeartRate,
                    this.state.config.charHeartRate,
                    '__iot_subscribe__heartRate__'
                );

                [this.scratch.charOximetry] = await findOne(
                    this.state.config.serviceOximetry,
                    this.state.config.charOximetry,
                    '__iot_subscribe__oximetry__'
                );

                [this.scratch.charTemp] = await findOne(
                    this.state.config.serviceTemp,
                    this.state.config.charTemp,
                    '__iot_subscribe__temp__'
                );

                if (this.$.props.mockECG) {
                    this.state.mock = mockECG.startMock((values) => {
                        values.forEach((x) => this.state.ecgValues.push(x));
                    });
                } else {
                    [this.scratch.charECG] = await findOne(
                        this.state.config.serviceECG,
                        this.state.config.charECG,
                        '__iot_subscribe__ECG__'
                    );
                }

                return [];
            } catch (err) {
                return [err];
            }
        } else {
            this.$.log && this.$.log.debug('select: Ignoring unknown device ' +
                                           deviceId);
            return [];
        }
    },

    async __iot_subscribe__heartRate__(charact, value) {
        const flags = value.readUInt8(0);
        const rate = (flags & 0x02) ?
            value.readUInt8(1) : // sensor contact True
            -1;
        this.$.log && this.$.log.debug('Notification heartRate: got ' + rate);
        this.state.sensorsValues.heartRate = rate;
        return [];
    },

    async __iot_subscribe__oximetry__(charact, value) {
        const spo2 =  value.readUInt16LE(1);
        this.$.log && this.$.log.debug('Notification SpO2: got ' + spo2);
        this.state.sensorsValues.oximetry = spo2;
        return [];
    },

    async __iot_subscribe__temp__(charact, value) {
        // Celsius, x100
        const temp = value.readUInt16LE(0)/100;
        this.$.log && this.$.log.debug('Notification temp: got ' + temp);
        this.state.sensorsValues.temp  = temp;
        return [];
    },

    async __iot_subscribe__ECG__(charact, value) {
        for (let i = 0; i < value.length/2; i++) {
            this.state.ecgValues.push(value.readUInt16LE(2*i));
        }
        this.$.log && this.$.log.trace('Notification ECG: got # ' +
                                       (value.length/2));
        return [];
    },

    async disconnect() {
        this.$.log && this.$.log.debug('Calling disconnect()');

        if (this.scratch.charHeartRate) {
            await this.$.gatt.unsubscribe(this.scratch.charHeartRate);
        }
        if (this.scratch.charOximetry) {
            await this.$.gatt.unsubscribe(this.scratch.charOximetry);
        }
        if (this.scratch.charTemp) {
            await this.$.gatt.unsubscribe(this.scratch.charTemp);
        }
        if (this.$.props.mockECG) {
            this.state.mock && this.state.mock();
        } else {
            if (this.scratch.charECG) {
                await this.$.gatt.unsubscribe(this.scratch.charECG);
            }
        }

        const device = this.state.selectedDevice &&
                this.scratch.devices[this.state.selectedDevice];
        if (device) {
            this.$.log && this.$.log.debug('Disconnect device ' +
                                           this.state.selectedDevice);
            await this.$.gatt.disconnect(device);
        }
        this.state.selectedDevice = null;
        this.state.ecgIndex = 0;
        this.state.ecgValues = [];
        return [];
    },

    async reset() {
        this.$.log && this.$.log.debug('Calling reset()');
        await this.disconnect();
        await this.$.gatt.reset();
        this.scratch.devices = {};
        this.state.devicesInfo = {};
        this.state.sensorsValues = {};
        return [];
    }
};
