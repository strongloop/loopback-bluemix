'use strict';

var request = require('request');
var util = require('util');
var os = require('os');
var path = require('path');
var defaultOptions = {
  apiURL: 'https://api.ng.bluemix.net',
  tokenType: 'bearer',
};

// set the access token
var cfConfigPath = path.resolve(os.homedir(), '.cf', 'config.json');
var cfConfig = require(cfConfigPath);
defaultOptions.accessToken = cfConfig.AccessToken;

var cf = {};

cf.getApps = function(callback) {
  makeRequest('/v2/apps', callback);
};

cf.getProvisionedServices = function(callback) {
  makeRequest('/v2/service_instances', callback);
};

cf.bindService = function(details, callback) {
  makeRequest('/v2/service_instances', callback);
};

function makeRequest(path, options, callback) {
  if (typeof options === 'function' && callback === undefined) {
    callback = options;
    options = {};
  }
  var apiURL = options.apiURL || defaultOptions.apiURL;
  var tokenType = options.tokenType || defaultOptions.tokenType;
  var accessToken = options.accessToken || defaultOptions.accessToken;
  var appsURL = apiURL + '/' + path;
  request.get({
    uri: appsURL,
    headers: {
      Accept: 'application/json;charset=utf-8',
      Authorization: tokenType + ' ' + accessToken,
    },
    json: true,
  }, callback);
}

module.exports = cf;
