'use strict';

var path = require('path');

var cf = require(path.resolve(__dirname, 'lib', 'cf.js'));
var addDefaultServices = require(path.resolve(__dirname, 'lib', 'default-services.js'));
var generateBluemixFiles = require(path.resolve(__dirname, 'lib', 'files.js'));

var loopbackBluemix = {
  cf: cf,
  addDefaultServices: addDefaultServices,
  generateBluemixFiles: generateBluemixFiles
}

module.exports = loopbackBluemix;
