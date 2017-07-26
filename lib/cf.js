// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

// See http://apidocs.cloudfoundry.org/253/

var util = require('util');
var os = require('os');
var path = require('path');
var request = require('request');
var async = require('async');
var debug = require('debug')('loopback:bluemix');

function getSupportedServiceConfig() {
  var templatesDir = path.resolve(__dirname, '..', 'templates');
  var datasourcesConfigPath = path.join(templatesDir, 'bluemix', 'bluemix',
    'datasources-config.json');
  var datasourcesConfig = require(datasourcesConfigPath);
  var bluemixSupportedServices = datasourcesConfig.supportedServices;
  return bluemixSupportedServices;
}

function getSupportedServiceLabels() {
  var bluemixSupportedServices = getSupportedServiceConfig();
  var bluemixSupportedServiceLabels = [];
  for (var s in bluemixSupportedServices) {
    bluemixSupportedServiceLabels.push(bluemixSupportedServices[s].label);
  }
  return bluemixSupportedServiceLabels;
}

var bluemixSupportedServiceLabels = getSupportedServiceLabels();

var defaultApiURL = 'https://api.ng.bluemix.net';

/**
 * Invoke an HTTP call
 * @param {object} httpReq HTTP request object
 * @param {function} cb Callback function
 */
function invokeHttp(httpReq, cb) {
  request(httpReq, function(err, res) {
    if (err) return cb(err);
    if (res.statusCode >= 300) {
      var errObj = {};
      if (res.body && typeof res.body === 'object') {
        errObj = res.body;
      }
      var msg = errObj.description || errObj.error_description ||
        ('Bluemix api error: ' + res.statusCode);
      err = new Error(msg);
      err.statusCode = res.statusCode;
      for (var i in errObj) {
        err[i] = res.body[i];
      }
      cb(err);
    } else {
      cb(err, res);
    }
  });
}

/**
 * Get a cloud foundry resource
 * @param path {string} The resource url
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getResource(path, accessToken, options, cb) {
  return invokeResource(path, accessToken, options, cb);
}

/**
 * Invoke a cloud foundry resource
 * @param path {string} The resource url
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function invokeResource(path, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  var apiURL = options.apiURL || defaultApiURL;
  var tokenType = options.tokenType || 'bearer';
  var url = apiURL + path;
  var query = {};
  /*
   * q Parameters used to filter the result set.
   *   Format queries as <filter><op><value>
   *   Valid ops: : >= <= < > IN
   *   Valid filters: active, label, service_broker_guid
   *   q=filter:value
   *   q=filter>value
   *   q=filter IN a,b,c
   * page	Page of results to fetch
   * results-per-page	Number of results per page
   * order-direction
   */
  ['q', 'page', 'results-per-page', 'order-direction'].forEach(function(p) {
    if (options[p]) {
      query[p] = options[p];
    }
  });
  var httpReq = {
    uri: url,
    qs: query,
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json;charset=utf-8',
      Authorization: tokenType + ' ' + accessToken,
    },
    json: true,
  };
  if (options.body) {
    httpReq.json = options.body;
  }
  invokeHttp(httpReq, cb);
}

/**
 * Log into cloud foundry
 * @param userId {string} User Id
 * @param password {string} Password
 * @param options {object} Connection options
 * @param cb {function} Callback function
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
    json: true,
  }, function(err, res) {
    if (err) return cb(err);
    var authURL = res.body.authorization_endpoint ||
      'https://login.ng.bluemix.net/UAALoginServerWAR';
    var tokenURL = authURL + '/oauth/token';
    var form = {
      'grant_type': 'password',
      'client_id': 'cf',
    };
    if (options.sso) {
      // Get one time passcode from https://iam.ng.bluemix.net/oidc/passcode
      form.passcode = password;
    } else {
      form.username = userId;
      form.password = password;
    }
    var httpReq = {
      method: 'post',
      uri: tokenURL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        Accept: 'application/json;charset=utf-8',
        Authorization: 'Basic Y2Y6',
      },
      form: form,
      json: true,
    };
    invokeHttp(httpReq, function(err, res) {
      cb(err, res && res.body);
    });
  });
}

/**
 * Load Cloud Foundry config file
 * @param configFilePath {string} Path to CF config file
 * @param log {function} Log function
 * @returns {object}
 */
function getCfConfig(configFilePath, log) {
  if (typeof configFilePath === 'function' && log === undefined) {
    log = configFilePath;
    configFilePath = undefined;
  }
  var cfConfig = {};
  var home = os.homedir();
  if (typeof configFilePath !== 'string') {
    configFilePath = path.join(home, '.bluemix/.loopback/config.json');
    try {
      cfConfig = require(configFilePath);
      return cfConfig;
    } catch (e) {
      // Ignore the error
      configFilePath = path.join(home, '.cf', 'config.json');
    }
  }

  var accessToken;
  try {
    cfConfig = require(configFilePath);
    accessToken = cfConfig.AccessToken.substring('bearer '.length);
  } catch (e) {
    // Fall back to ~/.bluemix/config.json & ~/.bluemix/.cf/config.json
    configFilePath = path.join(home, '.bluemix/.cf', 'config.json');
    var bxConfigFilePath = path.join(home, '.bluemix', 'config.json');
    try {
      cfConfig = require(configFilePath);
      var bxConfig = require(bxConfigFilePath);
      accessToken = cfConfig.AccessToken.substring('bearer '.length) ||
        bxConfig.IAMToken.substring('Bearer '.length);
    } catch (e) {
      if (log) {
        log('Please use `cf login` or `bx login` to log into Bluemix first.');
      }
      return {};
    }
  }
  var organizationGuid = cfConfig.OrganizationFields.GUID;
  var spaceGuid = cfConfig.SpaceFields.GUID;
  return {
    organization: {
      name: cfConfig.OrganizationFields.Name,
      guid: cfConfig.OrganizationFields.GUID,
    },
    space: {
      name: cfConfig.SpaceFields.Name,
      guid: cfConfig.SpaceFields.GUID,
    },
    apiURL: cfConfig.Target,
    accessToken: accessToken,
  };
}

/**
 * Get resource path for the given parent and child
 * @param parent {Object|string} The parent object or path
 * @param childName The child name
 * @returns {string}
 */
function getPath(parent, childName) {
  var path;
  if (typeof parent === 'string') {
    path = parent + '/' + childName;
  } else if (parent != null && parent.entity) {
    path = parent.entity[childName + '_url'];
  }
  path = path || ('/v2/' + childName);
  return path;
}

/**
 * Get all orgs
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getOrganizations(accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  getResource('/v2/organizations', accessToken, options, function(err, res) {
    if (err) return cb(err);
    cb(null, res.body.resources);
  });
}

/**
 * Get spaces for the given parent
 * @param org {string} The organization
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getSpaces(org, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  var path = getPath(org, 'spaces');
  getResource(path, accessToken, options, function(err, res) {
    if (err) return cb(err);
    cb(null, res.body.resources);
  });
}

/**
 * Get apps for the given parent
 * @param parent {Object|string} The parent object or path
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getApps(parent, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  var path = getPath(parent, 'apps');
  getResource(path, accessToken, options, function(err, res) {
    if (err) return cb(err);
    var apps = res.body;
    cb(null, apps.resources);
  });
};

/**
 * Get services for the given parent
 * @param parent {Object|string} The parent object or path
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getServices(parent, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  var path = getPath(parent, 'services');
  getResource(path, accessToken, options, function(err, res) {
    if (err) return cb(err);
    cb(null, res.body.resources);
  });
};

/**
 * Get data management services with corresponding plans
 * @param parent {Object|string} The parent object or path
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getDataServices(parent, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  getServices(parent, accessToken, options, function(err, services) {
    if (err) return cb(err);
    var dataServices = services.filter(function(s) {
      var tags = s.entity.tags || [];
      var supportedTags = options.tags || ['data_management'];
      var matched = supportedTags.filter(function(tag) {
        return tags.indexOf(tag) !== -1;
      });
      return matched.length > 0;
    });
    var childOptions = {
      apiURL: options.apiURL,
      tokenType: options.tokenType,
    };
    async.each(dataServices, function(s, done) {
      getServicePlans(s, accessToken, childOptions, function(err, plans) {
        if (!err) s['service_plans'] = plans;
        done(err);
      });
    }, function(err) {
      cb(err, dataServices);
    });
  });
};

/**
 * Get service plans for the given parent
 * @param parent {Object|string} The parent object or path
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getServicePlans(parent, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  var path = getPath(parent, 'service_plans');
  getResource(path, accessToken, options, function(err, res) {
    if (err) return cb(err);
    cb(null, res.body.resources);
  });
};

/**
 * Get service instances for the given parent
 * @param parent {Object|string} The parent object or path
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getServiceInstances(parent, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  var path = getPath(parent, 'service_instances');
  getResource(path, accessToken, options, function(err, res) {
    if (err) return cb(err);
    var instances = res.body;
    var childOptions = {
      apiURL: options.apiURL,
      tokenType: options.tokenType,
    };
    async.transform(instances.resources,
      function(results, inst, index, done) {
        getResource(inst.entity.service_plan_url, accessToken, childOptions,
          function(err, res) {
            if (err) return done(err);
            var plan = res.body;
            getResource(plan.entity.service_url, accessToken, childOptions,
              function(err, res) {
                if (err) return done(err);
                var service = res.body;
                debug('%s (%s:%s%s)', inst.entity.name, service.entity.label,
                  plan.entity.name, plan.entity.free ? '*' : '');
                results.push({
                  instance: inst,
                  service: service,
                  plan: plan,
                });
                done();
              });
          });
      }, cb);
  });
}

/**
 * Get data services for the given parent
 * @param parent {Object|string} The parent object or path
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getDataServiceInstances(parent, accessToken, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }

  getServiceInstances(parent, accessToken, options, function(err, instances) {
    if (err) return cb(err);
    var dbs = instances.filter(function(i) {
      var serviceName = i.service.entity.label;
      return bluemixSupportedServiceLabels.indexOf(serviceName) !== -1;
    });
    cb(null, dbs);
  });
}

/**
 * Get supported data services
 * @param parent {Object|string} The parent object or path
 * @param accessToken {string} The access token
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function getSupportedServices(parent, accessToken, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  var services = [];
  var supportedServices = [];
  function getMarketplace(url) {
    return invokeResource(url, accessToken, options, function(err, res) {
      if (err) return cb(err);
      services = services.concat(res.body.resources);
      if (res.body.next_url) {
        getMarketplace(res.body.next_url);
      } else {
        services.forEach(function(service) {
          if (bluemixSupportedServiceLabels.indexOf(service.entity.label) > -1) {
            supportedServices.push(service.entity);
          }
        });
        cb(null, supportedServices);
      }
    });
  }

  var cfConfig = getCfConfig();
  var url = '/v2/spaces/' + cfConfig.space.guid + '/services';
  return getMarketplace(url);
}

/**
 * Bind a service to an app
 * @param accessToken {string} The access token
 * @param body {object} Request body
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function bindService(accessToken, body, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  options.method = 'post';
  options.body = body;
  invokeResource('/v2/service_bindings', accessToken, options, cb);
}

/**
 * Provision a service
 * @param accessToken {string} The access token
 * @param body {object} Request body
 * @param options {object} Connection options
 * @param cb {function} Callback function
 */
function provisionService(accessToken, body, options, cb) {
  if (typeof options === 'function' && cb === undefined) {
    cb = options;
    options = {};
  }
  options.method = 'post';
  options.body = body;
  invokeResource('/v2/service_instances', accessToken, options, cb);
}

exports.getResource = getResource;
exports.login = login;
exports.getOrganizations = getOrganizations;
exports.getSpaces = getSpaces;
exports.getApps = getApps;
exports.getServices = getServices;
exports.getDataServices = getDataServices;
exports.getSupportedServices = getSupportedServices;
exports.getServicePlans = getServicePlans;
exports.getServiceInstances = getServiceInstances;
exports.getDataServiceInstances = getDataServiceInstances;
exports.getCfConfig = getCfConfig;
exports.bindService = bindService;
exports.provisionService = provisionService;
