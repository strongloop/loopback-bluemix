'use strict';

// See http://apidocs.cloudfoundry.org/253/

var util = require('util');
var os = require('os');
var path = require('path');
var request = require('request');
var async = require('async');
var debug = require('debug')('loopback:bluemix');

var defaultApiURL = 'https://api.ng.bluemix.net';

/**
 * Get a cloud foundry resource
 * @param path
 * @param accessToken
 * @param options
 * @param cb
 */
function getResource(path, accessToken, options, cb) {
  return invokeResource(path, accessToken, options, cb);
}

function invokeResource(path, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  var apiURL = options.apiURL || defaultApiURL;
  var tokenType = options.tokenType || 'bearer';
  var url = apiURL + path;
  var httpReq = {
    uri: url,
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json;charset=utf-8',
      Authorization: tokenType + ' ' + accessToken
    },
    json: true
  };
  if (options.body) {
    httpReq.body = options.body;
  }
  request(httpReq, cb);
}

/**
 * Log into cloud foundry
 * @param userId
 * @param password
 * @param options
 * @param cb
 */
function login(userId, password, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }

  var apiURL = options.apiURL || defaultApiURL;
  var infoURL = options.infoURL || apiURL + '/info';

  request.get({
    uri: infoURL,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    json: true
  }, function(err, res) {
    if (err) return cb(err);
    var authURL = res.body.authorization_endpoint ||
      'https://login.ng.bluemix.net/UAALoginServerWAR';
    var tokenURL = authURL + '/oauth/token';
    var body = 'grant_type=password&username=' + userId
      + '&password=' + password;
    request.post({
      uri: tokenURL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        Accept: 'application/json;charset=utf-8',
        Authorization: 'Basic Y2Y6'
      },
      body: body,
      json: true,
    }, function(err, res) {
      if (err) return cb(err);
      cb(null, res.body);
    });
  });
}

/**
 * Load ~/.cf/config.json
 * @returns {*}
 */
function getCfConfig() {
  var home = os.homedir();
  var cfConfig = {};
  try {
    cfConfig = require(path.join(home, '.cf/config.json'));
  } catch (e) {
    console.error('Please use `cf login` to log into Bluemix first.');
    return {};
  }
  var accessToken = cfConfig.AccessToken.substring('bearer '.length);
  var organizationGuid = cfConfig.OrganizationFields.GUID;
  var spaceGuid = cfConfig.SpaceFields.GUID;
  return {
    organization: {
      name: cfConfig.OrganizationFields.Name,
      guid: cfConfig.OrganizationFields.GUID
    },
    space: {
      name: cfConfig.SpaceFields.Name,
      guid: cfConfig.SpaceFields.GUID
    },
    apiURL: cfConfig.Target,
    accessToken: accessToken
  };
}

/**
 * Get resource path for the given parent and child
 * @param parent {Object|string} The parent object or path
 * @param childName The child name
 * @returns {string}
 */
function getPath(parent, childName) {
  var path = '/v2/' + childName;
  if (typeof parent === 'string') {
    path = parent + '/' + childName;
  } else if (typeof parent === 'object' && parent.entity) {
    path = parent.entity[childName + '_url'];
  }
  return path;
}

/**
 * Get all orgs
 * @param accessToken
 * @param cb
 */
function getOrganizations(accessToken, cb) {
  getResource('/v2/organizations', accessToken, function(err, res) {
    if (err) return cb(err);
    cb(null, res.body.resources);
  });
}

/**
 * Get spaces for the given parent
 * @param org
 * @param accessToken
 * @param cb
 */
function getSpaces(org, accessToken, cb) {
  var path = getPath(org, 'spaces');
  getResource(path, accessToken, function(err, res) {
    if (err) return cb(err);
    cb(null, res.body.resources);
  });
}

/**
 * Get apps for the given parent
 * @param parent
 * @param accessToken
 * @param cb
 */
function getApps(parent, accessToken, cb) {
  var path = getPath(parent, 'apps');
  getResource(path, accessToken, function(err, res) {
    if (err) return cb(err);
    cb(null, res.body.resources);
  });
};

/**
 * Get service instances for the given parent
 * @param parent
 * @param accessToken
 * @param cb
 */
function getServiceInstances(parent, accessToken, cb) {
  var path = getPath(parent, 'service_instances');
  getResource(path, accessToken, function(err, res) {
    if (err) return cb(err);
    var instances = res.body;
    async.transform(instances.resources, function(results, inst, index, done) {
      getResource(inst.entity.service_plan_url, accessToken, function(err, res) {
        if (err) return done(err);
        var plan = res.body;
        getResource(plan.entity.service_url, accessToken, function(err, res) {
          if (err) return done(err);
          var service = res.body;
          debug('%s (%s:%s%s)', inst.entity.name, service.entity.label,
            plan.entity.name, plan.entity.free ? '*' : '');
          results.push({
            instance: inst,
            service: service,
            plan: plan
          });
          done();
        });
      });
    }, cb);
  });
}

/**
 * Get data services for the given parent
 * @param parent
 * @param accessToken
 * @param cb
 */
function getDataServiceInstances(parent, accessToken, cb) {
  var tag = 'data_management';
  getServiceInstances(parent, accessToken, function(err, instances) {
    if (err) return cb(err);
    var dbs = instances.filter(function(i) {
      var tags = i.service.entity.tags || [];
      return tags.indexOf(tag) !== -1;
    });
    cb(null, dbs);
  });
}

function listServiceInstances(config, cb) {
  var accessToken = config.accessToken;
  var space = config.space;
  var spacePath = '/v2/spaces/' + space.guid;
  debug('Space: %s (%s)', space.name, space.guid);
  getDataServiceInstances(spacePath, accessToken, cb);
}

/**
 * Bind a service
 * @param details
 * @param callback
 */
function bindService(parent, accessToken, details, callback) {
  var options = {
    method: 'post',
    body: details
  };
  var path = getPath(parent, 'service_bindings');
  invokeResource(path, accessToken, options, callback);
}

exports.getResource = getResource;
exports.login = login;
exports.getOrganizations = getOrganizations;
exports.getSpaces = getSpaces;
exports.getApps = getApps;
exports.getServiceInstances = getServiceInstances;
exports.getDataServiceInstances = getDataServiceInstances;
exports.getCfConfig = getCfConfig;
exports.bindService = bindService;
