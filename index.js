// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var path = require('path');

var cf = require(path.resolve(__dirname, 'lib', 'cf.js'));
var addDefaultServices = require(path.resolve(__dirname, 'lib', 'default-services.js'));
var generateBluemixFiles = require(path.resolve(__dirname, 'lib', 'files.js'));

var loopbackBluemix = {
  cf: cf,
  addDefaultServices: addDefaultServices,
  generateBluemixFiles: generateBluemixFiles,
  templatesDir: path.resolve(__dirname, 'templates'),
};

module.exports = loopbackBluemix;
