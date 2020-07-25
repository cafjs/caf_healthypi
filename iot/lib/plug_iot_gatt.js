// Modifications copyright 2020 Caf.js Labs and contributors
/*!
 Copyright 2013 Hewlett-Packard Development Company, L.P.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

'use strict';
/**
 *  Provides access to BLE GATT services.
 *
 *  * Properties:
 *
 *  {findCharactTimeout: number, RWCharactTimeout: number}
 *
 * `findCharactTimeout` is a timeout in msec to detect a hang while finding
 * a BLE device characteristics.
 *
 * `RWCharactTimeout` is a timeout in msec to detect a hang while
 * reading or writing a BLE device characteristic.
 *
 * @module caf_iot_gatt/plug_iot_gatt
 * @augments external:caf_iot/gen_plug_iot
 *
 */
const assert = require('assert');
const caf_iot = require('caf_iot');
const caf_comp = caf_iot.caf_components;
const myUtils = caf_comp.myUtils;
const async = caf_comp.async;
const genPlugIoT = caf_iot.gen_plug_iot;
const noble = require('@abandonware/noble');
const utilGatt = require('./util_gatt');

/**
 * Factory method for a plug to  BLE GATT services.
 *
 */
exports.newInstance = async function($, spec) {
    try {
        const that = genPlugIoT.create($, spec);

        $._.$.log && $._.$.log.debug('New BLE GATT plug');

        assert.equal(typeof(spec.env.findCharactTimeout), 'number',
                     "'spec.env.findCharactTimeout' is not a number");
        const findCharactTimeout = spec.env.findCharactTimeout;

        assert.equal(typeof(spec.env.RWCharactTimeout), 'number',
                     "'spec.env.RWCharactTimeout' is not a number");
        const RWCharactTimeout = spec.env.RWCharactTimeout;

        const subscribers = {};

        const finders = {};

        let alreadyPatched = false;

        that.__iot_findServices__ = function(service, handlerMethodName) {
            const findServices = function() {
                that.__iot_stopFindServices__();
                const serviceArray = Array.isArray(service) ?
                    service :
                    [service];
                const serviceKey = Array.isArray(service) ?
                    service.join('#') :
                    service;
                noble.startScanning(serviceArray);
                const f = function(peripheral) {
                    $._.$.log && $._.$.log.debug('found device:' +
                                                 peripheral.uuid +
                                                 ' for service:' + serviceKey);
                    const args = [service, peripheral];
                    $._.$.queue.process(handlerMethodName, args,
                                        {noSync: true});
                };
                finders[serviceKey] = f;
                noble.on('discover', f);
            };

            // allow lazy initialization of noble
            if (noble.state === 'poweredOn') {
                findServices();
            } else {
                noble.removeAllListeners('stateChange');
                noble.once('stateChange', function(state) {
                    if (state === 'poweredOn') {
                        findServices();
                    } else {
                        const err = new Error('BLE not powered on');
                        $._.$.log &&
                            $._.$.log.warn(myUtils.errToPrettyStr(err));
                    }
                });
            }
        };

        that.__iot_stopFindServices__ = function() {
            const resetFinders = function() {
                noble.stopScanning();
                Object.keys(finders).forEach((x) => {
                    noble.removeListener('discover', finders[x]);
                    delete finders[x];
                });
            };
            resetFinders();
        };

        that.__iot_disconnect__ = function(peripheral, delay, cb) {
            if (cb) {
                setTimeout(function() {
                    try {
                        peripheral.disconnect(cb);
                    } catch (err) {
                        cb(err);
                    }
                }, delay || 0);
                return null;
            } else {
                return new Promise((resolve, reject) => {
                    setTimeout(function() {
                        try {
                            peripheral.disconnect((err, data) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(data || null);
                                }
                            });
                        } catch (err) {
                            reject(err);
                        }
                    }, delay || 0);
                });
            }
        };

        that.__iot_reset__ = function() {
            const result = [];
            // This is a hack, not clear how to enumerate connections otherwise
            const allP = noble._peripherals || {};
            Object.keys(allP).forEach((pId) => {
                const p = allP[pId];
                if (p.state === 'connected') {
                    $._.$.log && $._.$.log.debug('Disconnecting ' + pId);
                    result.push(that.__iot_disconnect__(p));
                }
            });
            return Promise.all(result);
        };

        const findSomeCharact = function(service, charIds, cb0) {
            let targetCharIds = []; // the default is find them all, then filter

            if ((typeof window !== 'undefined') &&
                window.iOSNativeAPI && window.iOSNativeAPI.sendMessage) {
                /* WebBLE app on Apple iOS.
                 *
                 * It does not support Web Bluetooth `getCharacteristics()`,
                 * breaking noble `discoverCharacteristics()`, so we need to
                 * monkey patch to use enumeration...
                 */

                // Hack, really brittle...
                service._noble._bindings.discoverCharacteristics =
                    utilGatt.monkeyPatchDiscoverCharacteristics.bind(
                        service._noble._bindings
                    );

                targetCharIds = utilGatt.expandCharactIds(charIds);
            }

            service.discoverCharacteristics(
                targetCharIds, function(err, characts) {
                    if (err) {
                        cb0(err);
                    } else {
                        const res = utilGatt.matchCharactIds(charIds, characts);
                        if (res.length !== charIds.length) {
                            const err = new Error('Missing characteristics');
                            err.wanted = charIds;
                            err.found = res;
                            cb0(err);
                        } else {
                            cb0(null, res);
                        }
                    }
                }
            );
        };

        that.__iot_findCharacteristics__ = function(serviceId, peripheral,
                                                    charIds, cb0) {
            const f = function(cbTop) {
                that.__iot_stopFindServices__();
                let service = null;
                let forceDiscoverServices = false;
                async.waterfall([
                    function(cb1) {
                        $._.$.log && $._.$.log.debug('#1# connect');
                        try {
                            if (peripheral.state === 'connected') {
                                $._.$.log && $._.$.log.debug('skip connect');
                                // do nothing
                                cb1(null, null);
                            } else {
                                // Rediscover services with a fresh connection
                                forceDiscoverServices = true;
                                peripheral.connect((err) => cb1(err, null));
                            }
                        } catch (err) {
                            cb1(err);
                        }
                    },
                    function(_ignore, cb1) {
                        $._.$.log && $._.$.log.debug('#2# discover services');
                        try {
                            if (Array.isArray(peripheral.services) &&
                                !forceDiscoverServices &&
                                (peripheral.services.length > 0)) {
                                /* Do not re-discover, otherwise notify handlers
                                   will be missing... */
                                $._.$.log && $._.$.log.debug(
                                    'skip discover services'
                                );

                                cb1(null, peripheral.services);
                            } else {
                                peripheral.discoverServices([], (err, data) => {
                                    cb1(err, data || []);
                                });
                            }
                        } catch (err) {
                            cb1(err);
                        }
                    },
                    function(services, cb1) {
                        $._.$.log && $._.$.log.debug('#3# discover characts');
                        services = Array.isArray(services) ?
                            services :
                            [services];
                        service = utilGatt.matchServiceId(services, serviceId);
                        if (service) {
                            try {
                                if (Array.isArray(charIds)) {
                                    findSomeCharact(service, charIds, cb1);
                                } else {
                                    service.discoverCharacteristics([], cb1);
                                }
                            } catch (err) {
                                cb1(err);
                            }
                        } else {
                            cb1(new Error('no matching service ' + serviceId));
                        }
                    }
                ], function (err, chrs) {
                    $._.$.log && $._.$.log.debug('#4# queue handler');
                    if (err) {
                        $._.$.log &&
                            $._.$.log.warn(myUtils.errToPrettyStr(err));
                        try {
                            peripheral.disconnect();
                        } catch (_ign) {/*ignore*/}
                        cbTop(err);
                    } else {
                        const result = {service: service, device: peripheral,
                                        characteristics: chrs};
                        cbTop(null, result);
                    }
                });
            };

            const fTimeout = myUtils.wrapWithTimeout(f, findCharactTimeout);

            if (cb0) {
                fTimeout(cb0);
                return null;
            } else {
                return new Promise((resolve, reject) => {
                    fTimeout((err, data) => {
                        if (err) {
                            // best effort, do not block...
                            that.__iot_reset__();
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });
            }
        };

        that.__iot_read__ = function(characteristic, handlerMethodName) {
            characteristic.read(function(err, data) {
                if (err) {
                    $._.$.log && $._.$.log.warn(myUtils.errToPrettyStr(err));
                } else {
                    const args = [characteristic, data];
                    $._.$.queue.process(handlerMethodName, args,
                                        {noSync: true});
                }
            });
        };

        that.__iot_dirtyRead__ = function(characteristic) {
            const bRead = characteristic.read.bind(characteristic);
            const fTimeout = myUtils.wrapWithTimeout(bRead, RWCharactTimeout);
            return new Promise((resolve, reject) => {
                fTimeout((err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
        };


        that.__iot_write__ = function(characteristic, value, withoutResponse) {
            //needs a Buffer not Uint8Array with node.js
            if ((typeof window === 'undefined') && (!Buffer.isBuffer(value))) {
                value = Buffer.from(value.buffer);
            }

            const bWrite = (cb) => {
                characteristic.write(value, !!withoutResponse, cb);
            };
            const fTimeout = myUtils.wrapWithTimeout(bWrite, RWCharactTimeout);
            return new Promise((resolve, reject) => {
                fTimeout((err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data || null);
                    }
                });
            });
        };

        that.__iot_subscribe__ = function(characteristic, handlerMethodName) {
            if (!alreadyPatched && (typeof window === 'undefined')) {
                /*
                 * Monkey patch `noble`.
                 *
                 * Healthypi hangs (as of 7/2020) when a `readByTypeRequest`
                 * is followed by a `writeRequest`. With this patch we avoid the
                 * `readByTypeRequest` by guessing the handle id.
                 *
                 * This is very fragile, and may stop working, or become
                 *  unnecessary, with newer firmware versions of healthypi.
                 *
                 * The Web Bluetooth version does not use `readByTypeRequest`
                 * and there is no need to patch.
                 */
                const gatts = noble._bindings._gatts;
                const gattObj = gatts[Object.keys(gatts)[0]];
                gattObj.__proto__.notify =
                    // modified from gatt.js in noble library (MIT license)
                    function (serviceId, charId, notify) {
                        const characteristic =
                              this._characteristics[serviceId][charId];

                        // descriptor handle is +1 for the healthypi
                        const handle = characteristic.valueHandle + 1;
                        let value = 0;

                        if (notify) {
                            value |= 0x0001;
                        } else {
                            value &= 0xfffe;
                        }

                        const valueBuffer = Buffer.alloc(2);
                        valueBuffer.writeUInt16LE(value, 0);
                        const req = this.writeRequest(handle, valueBuffer,
                                                      false);
                        const ATT_OP_WRITE_RESP = 0x13;
                        this._queueCommand(req, data => {
                            const opcode = data[0];
                            if (opcode === ATT_OP_WRITE_RESP) {
                                this.emit('notify', this._address, serviceId,
                                          charId, notify);
                            }
                        });
                    };

                alreadyPatched = true;
            }

            return new Promise((resolve, reject) => {
                if (!subscribers[characteristic.uuid]) {
                    const bSubscribe = (cb) => {
                        characteristic.subscribe(cb);
                    };
                    const fTimeout = myUtils.wrapWithTimeout(bSubscribe,
                                                             RWCharactTimeout);
                    fTimeout((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            const f = function(data) {
                                const args = [characteristic, data];
                                $._.$.queue.process(handlerMethodName, args,
                                                    {noSync: true});
                            };
                            characteristic.on('data', f);
                            subscribers[characteristic.uuid] = f;
                            resolve(null);
                        }
                    });
                } else {
                    $._.$.log && $._.$.log.debug(
                        'Ignoring duplicate subscription in ' +
                            characteristic.uuid
                    );
                    resolve(null);
                }
            });
        };

        that.__iot_unsubscribe__ = function(characteristic) {
            return new Promise((resolve, reject) => {
                if (subscribers[characteristic.uuid]) {
                    const bUnsubscribe = (cb) => {
                        characteristic.unsubscribe(cb);
                    };
                    const fTimeout = myUtils.wrapWithTimeout(bUnsubscribe,
                                                             RWCharactTimeout);
                    fTimeout((err) => {
                        if (err) {
                            reject(err);
                        } else {
                            characteristic.removeListener(
                                'data', subscribers[characteristic.uuid]
                            );
                            delete subscribers[characteristic.uuid];
                            resolve(null);
                        }
                    });
                } else {
                    $._.$.log && $._.$.log.debug('Ignoring unsubscribe ' +
                                                 ' in ' + characteristic.uuid);
                    resolve(null);
                }
            });
        };

        const super__ca_shutdown__ = myUtils.superior(that, '__ca_shutdown__');
        that.__ca_shutdown__ = function(data, cb0) {
            super__ca_shutdown__(data, function(err) {
                if (err) {
                    cb0(err);
                } else {
                    that.__iot_reset__()
                        .then(() => cb0(null))
                        .catch(err => cb0(err));
                }
            });

        };

        noble.removeAllListeners('error');
        noble.on('error', function(err) {
            $._.$.log && $._.$.log.debug('Got error in BLE :' +
                                         myUtils.errToPrettyStr(err));
            that.__ca_shutdown__(null, function(err) {
                if (err) {
                    $._.$.log &&
                        $._.$.log.debug('Got error in BLE shutdown:' +
                                        myUtils.errToPrettyStr(err));
                }
            });
        });

        return [null, that];
    } catch (err) {
        return [err];
    }
};
