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
  var options = {
    method: 'post',
    requestBody: details
  }
  makeRequest('/v2/service_bindings', options, callback);
};

function makeRequest(path, options, callback) {
  if (!path) throw new Error('Request path not specified');
  if (typeof options === 'function' && callback === undefined) {
    callback = options;
    options = {};
  }

  var requestMethod = options.method || 'GET';
  var apiURL = options.apiURL || defaultOptions.apiURL;
  var accessToken = options.accessToken || defaultOptions.accessToken;
  var appsURL = apiURL + path;
  var requestBody = options.requestBody || false;

  var requestOptions = {
    method: requestMethod.toUpperCase(),
    uri: appsURL,
    headers: {
      Accept: 'application/json;charset=utf-8',
      Authorization: accessToken,
    },
    json: true,
  };

  if (requestBody) {
    requestOptions.json = requestBody;
  }
  request(requestOptions, callback);
}

module.exports = cf;
