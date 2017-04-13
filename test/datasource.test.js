// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: generator-loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

// NOTE: service provisioning tests are not yet included

var fs = require('fs-extra');
var path = require('path');
var assert = require('assert');
var lbBM = require(path.resolve(__dirname, '..'));
var sandboxDir = path.resolve(__dirname, 'sandbox');
var fixturesDir = path.resolve(__dirname, 'fixtures');
var bluemixTemplatesDir = path.resolve(__dirname, '..', 'templates', 'bluemix');
var srcDatasourcesConfigFilePath = path.resolve(bluemixTemplatesDir,
                                  'bluemix', 'datasources-config.json');
var destDatasourcesConfigFilePath = path.resolve(sandboxDir, '.bluemix',
                                  'datasources-config.json');
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
    value: 'db2z'},
  {name: 'IBM WebSphere eXtreme Scale key-value connector (supported by StrongLoop)',
    value: 'kv-extreme-scale'},
  {name: 'Redis key-value connector (supported by StrongLoop)',
    value: 'kv-redis'},
  {name: 'MongoDB (supported by StrongLoop)', value: 'mongodb'},
  {name: 'MySQL (supported by StrongLoop)', value: 'mysql'},
  {name: 'PostgreSQL (supported by StrongLoop)',
    value: 'postgresql'},
  {name: 'Oracle (supported by StrongLoop)', value: 'oracle'},
  {name: 'Microsoft SQL (supported by StrongLoop)',
    value: 'mssql'},
  {name: 'REST services (supported by StrongLoop)',
    value: 'rest'},
  {name: 'SOAP webservices (supported by StrongLoop)',
    value: 'soap'},
  {name: 'Couchbase (provided by community)',
    value: 'couchbase'},
  {name: 'Neo4j (provided by community)', value: 'neo4j'},
  {name: 'Kafka (provided by community)', value: 'kafka'},
  {name: 'SAP HANA (provided by community)', value: 'saphana'},
  {name: 'Email (supported by StrongLoop)', value: 'mail'},
  {name: 'ElasticSearch (provided by community)', value: 'es'}],
};

var globalize = {
  f: function(str) {
    console.log(str);
  },
};

describe('lib/datasource', function() {
  beforeEach(function() {
    fs.ensureDirSync(sandboxDir);
    fs.emptyDirSync(sandboxDir);
    fs.copySync(srcDatasourcesConfigFilePath, destDatasourcesConfigFilePath);
    process.chdir(sandboxDir);
  });

  afterEach(function() {
    fs.emptyDirSync(sandboxDir);
    fs.removeSync(sandboxDir);
  });

  it('should configure a Bluemix datasource selection', function(done) {
    datasource.async = function() { return done; };
    datasource.prompt = generatePrompt({
      serviceName: 'cloudant-service (cloudantNoSQLDB)',
    });
    lbBM.ds.selectBluemixDatasource(datasource, globalize, function() {
      assert('cloudant-service' === datasource.name);
      assert('cloudant' === datasource.connector);
      assert('serviceGUID' in datasource);
    });
  });

  it('should configure new service provision', function(done) {
    datasource.async = function() { return done; };
    datasource.prompt = generatePrompt({
      serviceName: 'cloudanto',
      serviceType: 'cloudantNoSQLDB',
    });
    lbBM.ds.promptServiceName(datasource, globalize, function() {
      assert('cloudanto' === datasource.serviceName);
      assert('cloudantNoSQLDB' === datasource.serviceType);
    });
  });

  it('should get service plans', function(done) {
    datasource.async = function() { return done; };
    lbBM.ds.getServicePlans(datasource, function() {
      assert('cloudantNoSQLDB' in datasource.dataServices);
    });
  });

  it('should update datasources-config.json', function(done) {
    datasource.async = function() { return done; };
    var options = {
      name: 'dsA',
      connector: 'cA',
    };
    lbBM.ds.addDatasource(datasource, options, function(err) {
      assert(!err);
      var dsConfigContent = fs.readFileSync(destDatasourcesConfigFilePath, 'utf8');
      var datasourcesConfig = JSON.parse(dsConfigContent);
      assert('dsA' in datasourcesConfig.datasources);
      assert('dsA' === datasourcesConfig.datasources['dsA'].name);
      assert('cA' === datasourcesConfig.datasources['dsA'].connector);
    });
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
