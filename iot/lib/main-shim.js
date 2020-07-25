'use strict';

const staticArtifacts = require('../staticArtifacts');

const caf_iot = exports.framework = require('caf_iot');

caf_iot.setStaticArtifacts(staticArtifacts);

caf_iot.init(module);
