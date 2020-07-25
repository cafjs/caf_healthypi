/*!
 Copyright 2020 Caf.js Labs and contributors.

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
 *  Helper functions for GATT services.
 *
 * @module caf_iot_gatt/util_gatt
 *
 */


const toNumber = exports.toNumber = function(str) {
    var result;
    const numStr = str.toUpperCase();
    if (numStr.indexOf('0X') === 0) {
        result = parseInt(numStr);
    } else {
        result = parseInt('0X' + numStr);
    }
    return (isNaN(result) ? str : result);
};

const stripDashes = exports.stripDashes = function(str) {
    return (typeof str === 'string') ?
        str.split('-').join('') :
        str;
};

const addDashes = exports.addDashes = function(str) {
    return (typeof str === 'string') ?
        ((str.length === 32) ?
            [str.substring(0, 8), str.substring(8, 12),
             str.substring(12, 16), str.substring(16, 20),
             str.substring(20)].join('-').toLowerCase() :
            str.toLowerCase()) :
        str;
};

exports.normalizeId = function(id) {
    if (typeof id === 'string') {
        id = id.toLowerCase();
        // Ignore 0x
        id = (id.indexOf('0x') === 0) ? id.slice(2) : id;
    }
    return id;
};

exports.matchServiceId = function(services, serviceId) {
    var result = null;
    services.some(function(x) {
        if (compareId(serviceId, x.uuid)) {
            result = x;
            return true;
        } else {
            return false;
        }
    });
    return result;
};

exports.matchCharactIds = function(charIds, characts) {
    const result = [];
    if (Array.isArray(characts)) {
        charIds.forEach((id) => characts.some((x) => {
            if (compareId(id, x.uuid)) {
                result.push(x);
                return true;
            } else {
                return false;
            }
        }));
    }
    return result;
};

exports.expandCharactIds = function(charIds) {
    return charIds.map((x) => {
        if (typeof x === 'string') {
            if (x.length === 32) {
                return addDashes(x);
            } else {
                x = x.toLowerCase();
                // Ignore 0x
                x = (x.indexOf('0x') === 0) ? x.slice(2) : x;
                const prefix = ('0000000' + x).substr(-8);
                return addDashes(prefix + '00001000800000805f9b34fb');
            }
        } else if (typeof x === 'number') {
            const prefix = ('0000000' + x.toString(16)).substr(-8);
            return addDashes(prefix + '00001000800000805f9b34fb');
        } else {
            throw new Error('expandCharactIds:Invalid ID ' + x);
        }
    });
};

/* Adapted from webbluetooth/bindings.js in the `noble` package.
 *
 * Main difference is to replace service.getCharacteristics(), not supported by
 * the WebBLE app.
*/
exports.monkeyPatchDiscoverCharacteristics = async function (deviceUuid,
                                                             serviceUuid,
                                                             charactUuids) {
    const peripheral = this._peripherals[deviceUuid];

    const getCharacteristics = (service) => {
        const res = charactUuids.map((x) => service.getCharacteristic(x));
        return Promise.all(res);
    };

    if (peripheral) {
        const service = await this.getPrimaryService(peripheral,
                                                     serviceUuid);
        const characteristics = await getCharacteristics(service);

        const allCharact = characteristics.map(char => {
            const charInfo = {
                uuid: stripDashes(char.uuid),
                properties: []
            };

            if (char.properties && char.properties.writeWithoutResponse) {
                charInfo.properties.push('writeWithoutResponse');
            }

            if (char.properties && char.properties.write) {
                charInfo.properties.push('write');
            }

            if (char.properties && char.properties.read) {
                charInfo.properties.push('read');
            }

            if (char.properties && char.properties.notify) {
                charInfo.properties.push('notify');
            }

            return charInfo;
        });
        this.emit('characteristicsDiscover', deviceUuid, serviceUuid,
                  allCharact);
    }
};


const compareId = exports.compareId = function(x, y) {
    if (!x || !y) {
        // id 0 not valid
        return false;
    }

    // Assume a 16bit number
    x = (typeof x === 'number') ? ('0000' + x.toString(16)).slice(-4) : x;
    y = (typeof y === 'number') ? ('0000' + y.toString(16)).slice(-4) : y;

    //Ignore '-'
    x = x.split('-').join('');
    y = y.split('-').join('');

    x = x.toLowerCase();
    y = y.toLowerCase();

    // Ignore 0x
    x = (x.indexOf('0x') === 0) ? x.slice(2) : x;
    y = (y.indexOf('0x') === 0) ? y.slice(2) : y;

    if (x.length < y.length) {
        return (y === '0000' + x + '00001000800000805f9b34fb');
    } else if (x.length > y.length) {
        return (x === '0000' + y + '00001000800000805f9b34fb');
    } else {
        return (x === y);
    }
};
