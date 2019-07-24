// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const path = require('path');

const cf = require(path.resolve(__dirname, 'lib', 'cf.js'));
const addDefaultServices = require(path.resolve(__dirname, 'lib', 'default-services.js'));
const generateBluemixFiles = require(path.resolve(__dirname, 'lib', 'files.js'));
const ds = require(path.resolve(__dirname, 'lib', 'datasource.js'));
const provision = require(path.resolve(__dirname, 'lib', 'provision.js'));

const loopbackBluemix = {
  cf: cf,
  ds: ds,
  provision: provision,
  addDefaultServices: addDefaultServices,
  generateBluemixFiles: generateBluemixFiles,
  templatesDir: path.resolve(__dirname, 'templates'),
};

module.exports = loopbackBluemix;
