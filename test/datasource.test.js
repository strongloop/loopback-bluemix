// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const jsonUpdater = require('jsonfile-updater');
const lbBM = require(path.resolve(__dirname, '..'));
const cfConfig = lbBM.cf.getCfConfig();
const sandboxDir = path.resolve(__dirname, 'sandbox');
const fixturesDir = path.resolve(__dirname, 'fixtures');
const bluemixTemplatesDir = path.resolve(__dirname, '..', 'templates', 'bluemix');
const srcDatasourcesConfigFilePath = path.resolve(bluemixTemplatesDir,
  'bluemix', 'datasources-config.json');
const destDatasourcesConfigFilePath = path.resolve(sandboxDir, '.bluemix',
  'datasources-config.json');
const srcBluemixDatasourcesFilePath = path.resolve(bluemixTemplatesDir,
  'datasources.bluemix.js');
const destBluemixDatasourcesFilePath = path.resolve(sandboxDir, 'server',
  'datasources.bluemix.js');

// mock datasource instance
const datasource = {
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
const config = lbBM.cf.getCfConfig();
for (const c in config) {
  datasource[c] = config[c];
}

const globalize = {
  f: console.log,
};

describe('lib/datasource', function() {
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

  it('should populate services from VCAP_SERVICES', function(done) {
    jsonUpdater(destDatasourcesConfigFilePath)
      .add('datasources.loopback-cloudant', {
        'name': 'loopback-cloudant',
        'connector': 'cloudant',
        'database': 'mydb',
        'modelIndex': 'id',
      }, function(err) {
        assert(!err);
        process.env.VCAP_SERVICES = '{"cloudantNoSQLDB":[{"credentials":{"username":"000000000000","password":"000000000000","host":"000000000000-bluemix.cloudant.com","port":443,"url":"http://000000000000"},"syslog_drain_url":null,"label":"cloudantNoSQLDB","provider":null,"plan":"Lite","name":"loopback-cloudant","tags":["data_management","ibm_created","lite","ibm_dedicated_public"]}]}';
        const datasourcesBluemixPath = path.join(sandboxDir, 'server',
          'datasources.bluemix.js');
        const dataSources = require(datasourcesBluemixPath);
        assert('loopback-cloudant' in dataSources);
        assert(dataSources['loopback-cloudant'].connector === 'cloudant');
        done();
      });
  });

  if (Object.keys(cfConfig).length) {
    it('should configure a Bluemix datasource selection', function(done) {
      datasource.async = function() {
        return function(err) {
          if (err) return done(err);
          assert('cloudantFixture' === datasource.name);
          assert('cloudant' === datasource.connector);
          assert('serviceGuid' in datasource);
          done();
        };
      };
      datasource.log = console.log;
      datasource.prompt = generatePrompt({
        serviceName: 'cloudantFixture',
      });
      lbBM.ds.selectBluemixDatasource(datasource, globalize);
    });
  }

  it('should update datasources-config.json', function(done) {
    datasource.async = function() {
      return function(err) {
        if (err) return done(err);
        const dsConfigContent = fs.readFileSync(destDatasourcesConfigFilePath, 'utf8');
        const datasourcesConfig = JSON.parse(dsConfigContent);
        assert('dsA' in datasourcesConfig.datasources);
        assert('dsA' === datasourcesConfig.datasources['dsA'].name);
        assert('cA' === datasourcesConfig.datasources['dsA'].connector);
        done();
      };
    };
    const options = {
      name: 'dsA',
      connector: 'cA',
    };
    lbBM.ds.addDatasource(datasource, options);
  });

  it('should fail elegantly on selectBluemixDatasource error', function(done) {
    datasource.async = function() {
      return function(err) {
        assert.equal(true, datasource.abort);
        return done(err);
      };
    };
    datasource.log = console.log;
    datasource.prompt = generatePrompt({
      serviceName: 'no-service',
    });
    lbBM.ds.selectBluemixDatasource(datasource, globalize);
  });

  it('should fail elegantly on bindServiceToApp error', function(done) {
    datasource.async = function() {
      return function(err) {
        assert.equal(true, datasource.abort);
        return done(err);
      };
    };
    datasource.log = console.log;
    datasource.prompt = generatePrompt({
      serviceName: 'no-service',
    });
    lbBM.ds.bindServiceToApp(datasource, globalize);
  });
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
