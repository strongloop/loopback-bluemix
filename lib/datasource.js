// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var path = require('path');
var fs = require('fs');
var chalk = require('chalk');
var jsonfileUpdater = require('jsonfile-updater');
var cf = require('./cf');
var templatesDir = path.resolve(__dirname, '..', 'templates');
var datasourcesConfigPath = path.join(templatesDir, 'bluemix', 'bluemix',
                            'datasources-config.json');
var datasourcesConfig = require(datasourcesConfigPath);
var bluemixSupportedServices = datasourcesConfig.supportedServices;
var supportedConnectors = Object.keys(bluemixSupportedServices);

/**
 * Present Bluemix datasource selection options
 * @param datasource {object} Datasource object
 * @param globalize {function} Globalization function
 */
function selectBluemixDatasource(datasource, globalize) {
  var done = datasource.async();
  datasource.log('Finding Bluemix data service instances...');
  cf.getDataServiceInstances(null, datasource.accessToken,
  function(err, resources) {
    if (err) return done(err);
    if (resources.length < 1) {
      datasource.log('No Bluemix data service instances found.');
    }
    var serviceChoices = [];
    var appDatasourcesConfigFilePath = path.resolve('.bluemix',
                                        'datasources-config.json');
    if (!fs.existsSync(appDatasourcesConfigFilePath)) {
      datasource.log('Invalid Bluemix app directory');
      return done();
    }
    var appDatasourcesConfig = require(appDatasourcesConfigFilePath);
    var existingBluemixDatasources = appDatasourcesConfig.datasources;
    var existingBluemixDatasourcesKeys = Object
                                        .keys(existingBluemixDatasources);
    if (existingBluemixDatasourcesKeys.length > 0) {
      datasource.log('\n Already added:');
      existingBluemixDatasourcesKeys.forEach(function(name) {
        if (name !== 'db') {
          datasource.log(chalk.yellow(' ∙ ' + name));
        }
      });
    }

    if (resources.length && existingBluemixDatasourcesKeys.length === resources.length) {
      datasource.log('All datasource services already added.');
    }
    var services = {};
    var _connectorChoices = datasource.listOfAvailableConnectors;
    _connectorChoices.forEach(function(c) {
      if (supportedConnectors.indexOf(c.value) >= 0) {
        resources.forEach(function(resource) {
          var serviceMetadata = resource.service.entity;
          var serviceEntity = resource.instance.entity;
          var serviceName = serviceEntity.name;
          var serviceLabel = serviceMetadata.label;
          if (existingBluemixDatasourcesKeys.indexOf(serviceEntity.name) < 0) {
            if (serviceLabel === bluemixSupportedServices[c.value].label) {
              services[serviceName] = {
                'guid': resource.instance.metadata.guid,
                'connector': c.value,
              };
              serviceChoices.push({
                name: serviceName + ' (' + serviceLabel + ')',
                value: serviceName,
              });
            }
          }
        });
      }
    });

    serviceChoices.push('Provision a new service ▶︎');

    var prompts = [
      {
        name: 'serviceName',
        message: globalize.f('Select the Bluemix datasource option'),
        type: 'list',
        choices: serviceChoices,
      },
    ];
    return datasource.prompt(prompts).then(function(answers) {
      if (answers.serviceName === 'Provision a new service ▶︎') {
        datasource.provisionNewService = true;
      } else {
        datasource.name = answers.serviceName;
        var service = services[datasource.name];
        if (!service) return done(new Error('Invalid service: ' + datasource.name));
        datasource.connector = service.connector;
        datasource.serviceGUID = service.guid;
      }
      return done();
    }.bind(datasource));
  });
}

/**
 * Prompt new Bluemix service details
 * @param datasource {object} Datasource object
 * @param globalize {function} Globalization function
 */
function promptServiceName(datasource, globalize) {
  var done = datasource.async();
  var serviceTypes = [];
  var connectorNameLookup = {};
  Object.keys(bluemixSupportedServices).forEach(function(k) {
    var label = bluemixSupportedServices[k].label;
    serviceTypes.push(label);
    connectorNameLookup[label] = k;
  });
  var prompts = [
    {
      name: 'serviceName',
      message: globalize.f('Enter a name for the service:'),
    },
    {
      name: 'serviceType',
      message: globalize.f('Select the service type:'),
      type: 'list',
      choices: serviceTypes,
    },
  ];
  return datasource.prompt(prompts).then(function(answers) {
    datasource.name = answers.serviceName;
    datasource.serviceType = answers.serviceType;
    datasource.connector = connectorNameLookup[answers.serviceType];
    return done();
  }.bind(datasource));
}

/**
 * Get plans for supported data services
 * @param datasource {object} Datasource object
 */
function getServicePlans(datasource) {
  var done = datasource.async();
  console.log('  Getting service plans...');
  cf.getSupportedServices(null, datasource.accessToken, function(err, serviceDetails) {
    if (err) return done(err);
    datasource.dataServices = {};
    serviceDetails.forEach(function(service) {
      datasource.dataServices[service.label] = service;
    });
    return done();
  });
}

/**
 * Prompt plan for new Bluemix service
 * @param datasource {object} Datasource object
 * @param globalize {function} Globalization function
 */
function promptServicePlan(datasource, globalize) {
  var done = datasource.async();
  var service = datasource.dataServices[datasource.serviceType];
  datasource.servicePlans = {};
  cf.getResource(service.service_plans_url, datasource.accessToken, {},
  function(err, res) {
    if (err) return done(err);
    var servicePlans = res.body.resources;
    servicePlans.forEach(function(plan) {
      datasource.servicePlans[plan.entity.name] = plan.metadata.guid;
    });
    return done();
  });
}

/**
 * Provision new service
 * @param datasource {object} Datasource object
 * @param globalize {function} Globalization function
 */
function provisionService(datasource, globalize) {
  var done = datasource.async();
  var servicePlans = Object.keys(datasource.servicePlans);
  var prompts = [
    {
      name: 'servicePlan',
      message: globalize.f('Select the service plan:'),
      type: 'list',
      choices: servicePlans,
    },
  ];
  var cfConfig = cf.getCfConfig();
  return datasource.prompt(prompts).then(function(answers) {
    var details = {};
    details.name = datasource.name;
    details['service_plan_guid'] = datasource.servicePlans[answers.servicePlan];
    details['space_guid'] = cfConfig.space.guid;
    cf.provisionService(datasource.accessToken, details, function(err, res) {
      if (err) return done(err);
      var service = res.body;
      datasource.serviceGuid = service.metadata.guid;
      return done();
    });
  }.bind(datasource));
}

/**
 * Bind data service to current app (if already on Bluemix)
 * @param datasource {object} Datasource object
 */
function bindServiceToApp(datasource) {
  var done = datasource.async();
  cf.getApps(null, datasource.accessToken, function(err, resources) {
    if (err) return done(err);
    var matchedApp = false;
    for (var i = 0; i < resources.length; i++) {
      var app = resources[i];
      if (app.entity.name === datasource.appName) {
        matchedApp = true;
        var details = {
          'app_guid': app.metadata.guid,
          'service_instance_guid': datasource.serviceGuid,
        };
        cf.bindService(datasource.accessToken, details, function(err) {
          return done(err);
        });
        break;
      }
    }
    if (!matchedApp) { done(); }
  });
}

/**
 * Add datasource to datasources-config.json
 * @param datasource {object} Datasource object
 * @param config {object} Globalization function
 */
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

/**
 * Update the pipeline.yml file
 * @param datasource {object} Datasource object
 */
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
    try {
      fs.appendFileSync(pipeLineFilePath, appendStr);
    } catch (e) {
      throw new Error(e);
    }
  }
}

exports.selectBluemixDatasource = selectBluemixDatasource;
exports.promptServiceName = promptServiceName;
exports.getServicePlans = getServicePlans;
exports.promptServicePlan = promptServicePlan;
exports.provisionService = provisionService;
exports.bindServiceToApp = bindServiceToApp;
exports.addDatasource = addDatasource;
exports.updatePipeline = updatePipeline;
