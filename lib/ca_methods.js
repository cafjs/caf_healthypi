'use strict';
const assert = require('assert');
const caf = require('caf_core');
const caf_comp = caf.caf_components;
const myUtils = caf_comp.myUtils;
const app = require('../public/js/app.js');

const APP_SESSION = 'default'; //main app
const STANDALONE_SESSION = 'standalone'; //main app in standalone mode
const IOT_SESSION = 'iot'; // device
const USER_SESSION = /^user/; // third-party app

const notifyIoT = function(self, msg) {
    self.$.session.notify([msg], IOT_SESSION);
};

const notifyWebApp = function(self, msg) {
    self.$.session.notify([msg], APP_SESSION);
    self.$.session.notify([msg], STANDALONE_SESSION);
    self.$.session.notify([msg], USER_SESSION);
};

const doBundle = function(self, command, arg) {
    const bundle = self.$.iot.newBundle();
    if (arg === undefined) {
        bundle[command](0);
    } else {
        bundle[command](0, [arg]);
    }
    self.$.iot.sendBundle(bundle, self.$.iot.NOW_SAFE);
    notifyIoT(self, command);
};

const normalizeId = function(id) {
    if (typeof id === 'string') {
        id = id.toLowerCase();
        // Ignore 0x
        id = (id.indexOf('0x') === 0) ? id.slice(2) : id;
    }
    return id;
};

exports.methods = {
    // Methods called by framework
    async __ca_init__() {
        this.$.session.limitQueue(1, APP_SESSION); // only the last notification
        this.$.session.limitQueue(1, STANDALONE_SESSION); // ditto
        this.$.session.limitQueue(1, IOT_SESSION); // ditto

        this.state.fullName = this.__ca_getAppName__() + '#' +
            this.__ca_getName__();

        // methods called by the iot device
        this.state.trace__iot_sync__ = '__ca_traceSync__';

        // example config
        this.state.config = {
            serviceHeartRate: normalizeId(this.$.props.serviceHeartRate),
            charHeartRate: normalizeId(this.$.props.charHeartRate),
            serviceOximetry: normalizeId(this.$.props.serviceOximetry),
            charOximetry:  normalizeId(this.$.props.charOximetry),
            serviceTemp: normalizeId(this.$.props.serviceTemp),
            charTemp: normalizeId(this.$.props.charTemp),
            serviceECG: normalizeId(this.$.props.serviceECG),
            charECG: normalizeId(this.$.props.charECG)
        };

        // example initial state
        this.state.sensorsValues = {};
        this.state.devices = {};
        this.state.selectedDevice = null;
        this.state.daemon = 0;
        this.state.error = null;

        return [];
    },

    async __ca_pulse__() {
        this.$.log && this.$.log.debug('calling PULSE!!! ');
        this.$.react.render(app.main, [this.state]);
        return [];
    },

    //External methods

    async hello(key, tokenStr) {
        tokenStr && this.$.iot.registerToken(tokenStr);
        key && this.$.react.setCacheKey(key);
        return this.getState();
    },

    // Example external methods

    /* Typical lifecycle:
     *
     * 1 Find devices exporting a service.
     * 2 Connect to one of them and start listening to device notifications,
     *  e.g., heart beat rates....
     * 3 Do some device operation, e.g., start blinking or stop blinking.
     * 4 Disconnect from device stopping notifications
     */

    async findDevices() {
        this.state.selectedDevice && this.disconnect(); // #devices <= 1
        doBundle(this, 'findDevices', this.state.config);
        notifyWebApp(this, 'Finding device');
        return this.getState();
    },

    async connect(deviceId, deviceAd) {
        if (this.state.devices[deviceId]) {
            this.state.selectedDevice = {id: deviceId, ad: deviceAd};
            doBundle(this, 'connect', deviceId);
            notifyWebApp(this, 'Connecting device');
            return this.getState();
        } else {
            const err = new Error('Cannot connect, device missing');
            err.deviceId = deviceId;
            return [err];
        }
    },

    async disconnect() {
        doBundle(this, 'disconnect');
        this.state.selectedDevice = null;
        notifyWebApp(this, 'Disconnecting device');
        return this.getState();
    },

    async reset() {
        doBundle(this, 'reset');
        this.state.selectedDevice = null;
        notifyWebApp(this, 'Resetting');
        return this.getState();
    },

    async setBrowserDaemon(daemon) {
        const old = this.state.daemon;
        this.state.daemon = daemon;
        return old !== daemon ?
            this.reset() :
            this.getState();
    },

    async setError(error) {
        if (typeof error === 'string') {
            error = JSON.parse(error);
        }
        error && assert(typeof error === 'object' &&
                        typeof error.message === 'string',
                        'error.message not a string');
        this.state.error = error;
        notifyWebApp(this, 'New Errors');
        return this.getState();
    },

    async getState() {
        this.$.react.coin();
        return [null, this.state];
    },

    // Methods called by the IoT device (Optional)

    // called when the device syncs state with the cloud
    async __ca_traceSync__() {
        const $$ = this.$.sharing.$;
        const now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName + ':Syncing!!:' + now);
        /*
         * Type for `sensorsValues`:
         * {ecg : {index: number, values: Array.<number>}, hearRate: number,
         *  oximetry: number, temp: number }
         *
         * ecg index is the relative position of the values in the sequence.
         * ecg values are uint16 numbers.
         * `hearRate` with value -1 means not available, otherwise beats/min.
         * `temp` unit is in celsius
         * `oximetry` unit is a percentage
         */
        this.state.sensorsValues = $$.toCloud.get('sensorsValues');
        this.state.devices = $$.toCloud.get('devices');
        if (this.state.selectedDevice &&
            !this.state.devices[this.state.selectedDevice.id]) {
            // Invariant: `selectedDevice` is always visible to the device
            this.state.selectedDevice = null;
        }
        notifyWebApp(this, 'New inputs');
        return [];
    }

};

caf.init(module);
