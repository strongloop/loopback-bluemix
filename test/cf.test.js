// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: generator-loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

// NOTE: tests written only for current relevant functions

var assert = require('assert');
var path = require('path');
var cfTestConfig = require(path.resolve(__dirname, 'cf-test-config'));
var bluemixTemplatesDir = path.resolve(__dirname, '..', 'templates', 'bluemix');
var datasourcesConfigFilePath = path.resolve(bluemixTemplatesDir,
                                  'bluemix', 'datasources-config.json');
var datasourcesConfig = require(datasourcesConfigFilePath);
var supportedServices = Object.keys(datasourcesConfig.supportedServices);
var lbBM = require(path.resolve(__dirname, '..'));
var cf = lbBM.cf;
var cfConfig = cf.getCfConfig();

if (Object.keys(cfConfig).length) {
  var accessToken = cfConfig.accessToken;

  describe('lib/cf', function() {
    it('should get CF config', function() {
      var cfConfig = cf.getCfConfig();
      assert('organization' in cfConfig);
      assert('space' in cfConfig);
      assert('apiURL' in cfConfig);
      assert('accessToken' in cfConfig);
    });

    it('should get apps', function(done) {
      cf.getApps(null, accessToken, function(err, apps) {
        assert(!err);
        var appFound = false;
        apps.forEach(function(app) {
          if (cfTestConfig.app.name === app.entity.name) {
            appFound = true;
          }
        });
        assert(appFound);
        done();
      });
    });

    it('should get service instances', function(done) {
      cf.getServiceInstances(null, accessToken, function(err, services) {
        assert(!err);
        var state = getServiceState(services);
        assert(state.supportedServiceFound);
        assert(state.unsupportedServiceFound);
        assert(state.nondataServiceFound);
        done();
      });
    });

    it('should get only data service instances', function(done) {
      cf.getDataServiceInstances(null, accessToken, function(err, services) {
        assert(!err);
        var state = getServiceState(services);
        assert(state.supportedServiceFound);
        assert(state.unsupportedServiceFound);
        assert(!state.nondataServiceFound);
        done();
      });
    });
  });

  function getServiceState(services) {
    var state = {
      supportedServiceFound: false,
      unsupportedServiceFound: false,
      nondataServiceFound: false,
    };

    services.forEach(function(service) {
      var supportedService = cfTestConfig.service.supported;
      var unsupportedService = cfTestConfig.service.unsupported;
      var nondataService = cfTestConfig.service.nondata;
      var serviceName = service.instance.entity.name;
      var serviceGuid = service.instance.metadata.guid;
      if (supportedService.name === serviceName &&
          supportedService.guid === serviceGuid) {
        state.supportedServiceFound = true;
      } else if (unsupportedService.name === serviceName &&
                unsupportedService.guid === serviceGuid) {
        state.unsupportedServiceFound = true;
      } else if (nondataService.name === serviceName &&
                nondataService.guid === serviceGuid) {
        state.nondataServiceFound = true;
      }
    });
    return state;
  }
}
