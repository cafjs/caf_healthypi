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
 *  Dummy BLE GATT services plug to enable `mkStatic()` in hosts with no
 * bluetooth hardware.
 *
 *
 */
const assert = require('assert');
const caf_iot = require('caf_iot');
const genPlugIoT = caf_iot.gen_plug_iot;

/**
 * Factory method for a plug to  BLE GATT services.
 *
 */
exports.newInstance = async function($, spec) {
    try {
        const that = genPlugIoT.create($, spec);

        $._.$.log && $._.$.log.debug('Dummy New BLE GATT plug');

        assert.equal(typeof(spec.env.findCharactTimeout), 'number',
                     "'spec.env.findCharactTimeout' is not a number");

        assert.equal(typeof(spec.env.RWCharactTimeout), 'number',
                     "'spec.env.RWCharactTimeout' is not a number");

        that.__iot_findServices__ = function(service, handlerMethodName,
                                             namePrefix, isWeb) {
        };

        that.__iot_stopFindServices__ = function() {

        };

        that.__iot_disconnect__ = function(peripheral, delay, cb) {
            cb(null);
        };

        that.__iot_reset__ = function() {
        };

        that.__iot_findCharacteristics__ = function(serviceId, peripheral,
                                                    charIds, cb0) {
            cb0(null);
        };

        that.__iot_read__ = function(characteristic, handlerMethodName) {
        };

        that.__iot_dirtyRead__ = function(characteristic) {
        };


        that.__iot_write__ = function(characteristic, value, withoutResponse) {
        };

        that.__iot_subscribe__ = function(characteristic, handlerMethodName) {
        };

        that.__iot_unsubscribe__ = function(characteristic) {
        };

        return [null, that];
    } catch (err) {
        return [err];
    }
};
