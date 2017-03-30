// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var path = require('path');
var fs = require('fs');
var chalk = require('chalk');
var jsonfileUpdater = require('jsonfile-updater');
var cfPath = path.resolve(__dirname, 'cf.js');
var cf = require(cfPath);
var cfConfig = cf.getCfConfig();
var templatesDir = path.resolve(__dirname, '..', 'templates');
var datasourcesConfigPath = path.join(templatesDir, 'bluemix', 'bluemix',
                            'datasources-config.json');
var datasourcesConfig = require(datasourcesConfigPath);
var bluemixSupportedServices = datasourcesConfig.supportedServices;

function selectBluemixDatasource(datasource, globalize) {
  var done = datasource.async();
  cf.getDataServiceInstances(undefined, cfConfig.accessToken,
  function(err, resources) {
    if (err) return done(err);
    if (resources.length < 1) {
      console.log('\n No Bluemix services found\n');
      process.exit();
    }
    var serviceChoices = [];
    var appDatasourcesConfigFilePath = path.resolve('.bluemix',
                                        'datasources-config.json');
    if (!fs.existsSync(appDatasourcesConfigFilePath)) {
      console.log('\n Invalid Bluemix app directory.\n');
      process.exit();
    }
    var appDatasourcesConfig = require(appDatasourcesConfigFilePath);
    var bluemixSupportedServiceNames = Object
                                      .keys(bluemixSupportedServices);
    var existingBluemixDatasources = appDatasourcesConfig.datasources;
    var existingBluemixDatasourcesKeys = Object
                                        .keys(existingBluemixDatasources);
    if (existingBluemixDatasourcesKeys.length > 1) {
      console.log('\n Already added:\n');
      existingBluemixDatasourcesKeys.forEach(function(name) {
        if (name !== 'db') {
          console.log(chalk.yellow(' ∙ ' + name));
        }
      });
    }

    if (existingBluemixDatasourcesKeys.length === resources.length) {
      console.log('\n All datasource services aleady added.\n');
      process.exit();
    }
    var services = {};
    var _connectorChoices = datasource.listOfAvailableConnectors;
    _connectorChoices.forEach(function(c) {
      if (bluemixSupportedServiceNames.indexOf(c.value) >= 0) {
        resources.forEach(function(resource) {
          var service = resource.instance.entity;
          var serviceName = resource.instance.entity.name;
          var serviceType = resource.service.entity.label;
          if (existingBluemixDatasourcesKeys.indexOf(service.name) < 0) {
            if (serviceType === bluemixSupportedServices[c.value]) {
              services[serviceName] = {
                'guid': resource.instance.metadata.guid,
                'connector': c.value,
              };
              serviceName += ' (' + serviceType + ')';
              serviceChoices.push(serviceName);
            }
          }
        });
      }
    });

    console.log();
    var prompts = [
      {
        name: 'serviceName',
        message: globalize.f('Select the Bluemix datasource service'),
        type: 'list',
        choices: serviceChoices,
      },
    ];
    return datasource.prompt(prompts).then(function(answers) {
      datasource.name = answers.serviceName.split(' (')[0];
      datasource.connector = services[datasource.name].connector;
      datasource.serviceGUID = services[datasource.name].guid;
      done();
    }.bind(datasource));
  });
}

function bindServiceToApp(datasource) {
  var done = datasource.async();
  cf.getApps(cfConfig.accessToken, function(err, resources) {
    if (err) return done(err);
    for (var i = 0; i < resources.length; i++) {
      var app = resources[i];
      if (app.entity.name === datasource.appName) {
        var details = {
          'app_guid': app.metadata.guid,
          'service_instance_guid': datasource.serviceGUID,
        };
        cf.bindService(cfConfig.accessToken, details, function(err) {
          done(err);
        });
        break;
      }
    }
  });
}

function addDatasource(datasource, config) {
  var done = datasource.async();
  var datasourcesConfigFilePath = path.join(process.cwd(), '.bluemix',
                                  'datasources-config.json');
  var bluemixConnectorConfig = {
    name: config.name,
    connector: config.connector,
  };
  if ('database' in config) {
    bluemixConnectorConfig.database = config.database;
  } else if ('db' in config) {
    bluemixConnectorConfig.database = config.db;
  }
  if ('modelIndex' in config) {
    bluemixConnectorConfig.modelIndex = config.modelIndex;
  }
  var datasourceName = 'datasources.' + bluemixConnectorConfig.name;
  jsonfileUpdater(datasourcesConfigFilePath)
  .add(datasourceName, bluemixConnectorConfig, function(err) {
    return done(err);
  });
}

function updatePipeline(datasource) {
  var pipeLineFilePath = path.join(process.cwd(), '.bluemix',
                                    'pipeline.yml');
  var content = fs.readFileSync(pipeLineFilePath, 'utf8');
  var lines = content.split('#!/bin/bash')[1].split('\n').map(function(line) {
    return line.trim();
  });

  var bindServiceCommand = 'cf bind-service ' +
                            datasource.appName + ' ' + datasource.name;
  if (lines.indexOf(bindServiceCommand) < 0) {
    var appendStr = '      ' + bindServiceCommand + '\n';
    fs.appendFileSync(pipeLineFilePath, appendStr);
  }
}

exports.selectBluemixDatasource = selectBluemixDatasource;
exports.bindServiceToApp = bindServiceToApp;
exports.addDatasource = addDatasource;
exports.updatePipeline = updatePipeline;
