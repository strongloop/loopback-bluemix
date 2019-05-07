// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

var fs = require('fs-extra');
var path = require('path');
var assert = require('assert');
var jsonUpdater = require('jsonfile-updater');
var lbBM = require(path.resolve(__dirname, '..'));
var cfConfig = lbBM.cf.getCfConfig();
var sandboxDir = path.resolve(__dirname, 'sandbox');
var fixturesDir = path.resolve(__dirname, 'fixtures');
var bluemixTemplatesDir = path.resolve(__dirname, '..', 'templates', 'bluemix');
var srcDatasourcesConfigFilePath = path.resolve(bluemixTemplatesDir,
                                  'bluemix', 'datasources-config.json');
var destDatasourcesConfigFilePath = path.resolve(sandboxDir, '.bluemix',
                                  'datasources-config.json');
var srcBluemixDatasourcesFilePath = path.resolve(bluemixTemplatesDir,
                                  'datasources.bluemix.js');
var destBluemixDatasourcesFilePath = path.resolve(sandboxDir, 'server',
                                  'datasources.bluemix.js');

// mock datasource instance
var datasource = {
  listOfAvailableConnectors: [{name: 'In-memory db (supported by StrongLoop)',
    value: 'memory'},
  {name: 'In-memory key-value connector (supported by StrongLoop)',
    value: 'kv-memory'},
  {name: 'IBM DB2 (supported by StrongLoop)', value: 'db2'},
  {name: 'IBM DashDB (supported by StrongLoop)',
    value: 'dashdb'},
  {name: 'IBM MQ Light (supported by StrongLoop)',
    value: 'mqlight'},
  {name: 'IBM Cloudant DB (supported by StrongLoop)',
    value: 'cloudant'},
  {name: 'IBM DB2 for z/OS (supported by StrongLoop)',
    value: 'db2z'}],
};

// Populate datasource with config
var config = lbBM.cf.getCfConfig();
for (var c in config) {
  datasource[c] = config[c];
}

var globalize = {
  f: console.log,
};

describe('lib/provision', function() {
  beforeEach(function() {
    fs.ensureDirSync(sandboxDir);
    fs.emptyDirSync(sandboxDir);
    fs.copySync(srcDatasourcesConfigFilePath, destDatasourcesConfigFilePath);
    fs.copySync(srcBluemixDatasourcesFilePath, destBluemixDatasourcesFilePath);
    process.chdir(sandboxDir);
  });

  afterEach(function() {
    fs.emptyDirSync(sandboxDir);
    fs.removeSync(sandboxDir);
  });

  it('should configure new service provision', function(done) {
    datasource.async = function() {
      return function(err) {
        if (err) return done(err);
        assert('cloudanto' === datasource.name);
        assert('cloudantNoSQLDB' === datasource.serviceType);
        done();
      };
    };
    datasource.prompt = generatePrompt({
      serviceName: 'cloudanto',
      serviceType: 'cloudantNoSQLDB',
    });
    lbBM.provision.promptServiceName(datasource, globalize);
  });

  if (Object.keys(cfConfig).length) {
    it('should get service plans', function(done) {
      datasource.async = function() {
        return function(err) {
          if (err) return done(err);
          assert(datasource.dataServices);
          assert('cloudantNoSQLDB' in datasource.dataServices);
          done();
        };
      };
      lbBM.provision.getServicePlans(datasource);
    });
  }
});

function generatePrompt(answers) {
  return function(prompts) {
    return {
      then: function(cb) {
        cb(answers);
      },
    };
  };
}
