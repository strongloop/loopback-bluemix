// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

// NOTE: tests written only for current relevant functions

const assert = require('assert');
const path = require('path');
const cfTestConfig = require(path.resolve(__dirname, 'cf-test-config'));
const bluemixTemplatesDir = path.resolve(__dirname, '..', 'templates', 'bluemix');
const datasourcesConfigFilePath = path.resolve(bluemixTemplatesDir,
  'bluemix', 'datasources-config.json');
const datasourcesConfig = require(datasourcesConfigFilePath);
const supportedServices = Object.keys(datasourcesConfig.supportedServices);
const lbBM = require(path.resolve(__dirname, '..'));
const cf = lbBM.cf;
const cfConfig = cf.getCfConfig();

if (Object.keys(cfConfig).length) {
  const accessToken = cfConfig.accessToken;

  describe('lib/cf', function() {
    it('should get CF config', function() {
      const cfConfig = cf.getCfConfig();
      // Skip the test if ~/.cf/config.json does not exist
      if (Object.keys(cfConfig).length === 0) return;
      assert('organization' in cfConfig);
      assert('space' in cfConfig);
      assert('apiURL' in cfConfig);
      assert('accessToken' in cfConfig);
    });

    it('should login with user/password', function(done) {
      if (!process.env.BLUEMIX_EMAIL || !process.env.BLUEMIX_PASSWORD) {
        console.error('    x Missing BLUEMIX_EMAIL and BLUEMIX_PASSWORD env vars');
        return this.skip(); // Skip the test
      }
      cf.login(process.env.BLUEMIX_EMAIL, process.env.BLUEMIX_PASSWORD, done);
    });

    it('should login with SSO passcode', function(done) {
      if (!process.env.BLUEMIX_PASSCODE) {
        console.error('    x Missing BLUEMIX_PASSCODE env var');
        return this.skip();
      }
      cf.login(null, process.env.BLUEMIX_PASSCODE, {sso: true}, done);
    });

    it('should get apps', function(done) {
      cf.getApps(null, accessToken, function(err, apps) {
        if (err) return done(err);
        let appFound = false;
        apps.forEach(function(app) {
          if (cfTestConfig.app === app.entity.name) {
            appFound = true;
          }
        });
        assert(appFound);
        done();
      });
    });

    it('should get service instances', function(done) {
      cf.getServiceInstances(null, accessToken, function(err, services) {
        if (err) return done(err);
        const state = getServiceState(services);
        assert(state.supportedServiceFound);
        assert(state.unsupportedServiceFound);
        assert(state.nondataServiceFound);
        done();
      });
    });

    it('should get only supported data service instances', function(done) {
      cf.getDataServiceInstances(null, accessToken, function(err, services) {
        if (err) return done(err);
        const state = getServiceState(services);
        assert(state.supportedServiceFound);
        assert(!state.unsupportedServiceFound);
        assert(!state.nondataServiceFound);
        done();
      });
    });
  });

  function getServiceState(services) {
    const state = {
      supportedServiceFound: false,
      unsupportedServiceFound: false,
      nondataServiceFound: false,
    };

    services.forEach(function(service) {
      const supportedService = cfTestConfig.service.supported;
      const unsupportedService = cfTestConfig.service.unsupported;
      const nondataService = cfTestConfig.service.nondata;
      const serviceName = service.instance.entity.name;
      const serviceGuid = service.instance.metadata.guid;
      if (supportedService === serviceName) {
        state.supportedServiceFound = true;
      } else if (unsupportedService === serviceName) {
        state.unsupportedServiceFound = true;
      } else if (nondataService === serviceName) {
        state.nondataServiceFound = true;
      }
    });
    return state;
  }
}
