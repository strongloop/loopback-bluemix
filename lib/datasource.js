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
var supportedConnectors = Object.keys(bluemixSupportedServices);

function selectBluemixDatasource(datasource, globalize, cb) {
  var done = datasource.async();
  cf.getDataServiceInstances(undefined, cfConfig.accessToken,
  function(err, resources) {
    if (err) {
      if (cb) {
        done();
        cb(err);
      } else {
        return done(err);
      }
    }
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
              serviceName += ' (' + serviceLabel + ')';
              serviceChoices.push(serviceName);
            }
          }
        });
      }
    });

    // TODO: uncomment to enable data service provisioning
    // serviceChoices.push('Provision a new service ▶︎');

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
      if (answers.serviceName === 'Provision a new service ▶︎') {
        datasource.provisionNewService = true;
      } else {
        datasource.name = answers.serviceName.split(' (')[0];
        datasource.connector = services[datasource.name].connector;
        datasource.serviceGUID = services[datasource.name].guid;
      }
      if (cb) {
        done();
        cb();
      } else {
        done();
      }
    }.bind(datasource));
  });
}

function promptServiceName(datasource, globalize, cb) {
  var done = datasource.async();
  var serviceTypes = [];
  Object.keys(bluemixSupportedServices).forEach(function(k) {
    serviceTypes.push(bluemixSupportedServices[k]);
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
    datasource.serviceName = answers.serviceName;
    datasource.serviceType = answers.serviceType;
    if (cb) {
      done();
      cb();
    } else {
      done();
    }
  }.bind(datasource));
}

function getServicePlans(datasource, cb) {
  var done = datasource.async();
  cf.getDataServices(cfConfig.accessToken, function(err, serviceDetails) {
    if (err) {
      if (cb) {
        done();
        cb(err);
      } else {
        return done(err);
      }
    }
    datasource.dataServices = serviceDetails;
    if (cb) {
      done();
      cb();
    } else {
      done();
    }
  });
}

function promptServicePlan(datasource, globalize, cb) {
  var done = datasource.async();
  var service = datasource.dataServices[datasource.serviceType];
  datasource.servicePlans = {};
  cf.getServicePlans(cfConfig.accessToken, service.plansUrl, function(err, servicePlans) {
    if (err) {
      if (cb) {
        done();
        cb(err);
      } else {
        return done(err);
      }
    }
    servicePlans.forEach(function(plan) {
      datasource.servicePlans[plan.entity.name] = plan.metadata.guid;
    });
    if (cb) {
      done();
      cb();
    } else {
      done();
    }
  });
}

function provisionService(datasource, globalize, cb) {
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
  return datasource.prompt(prompts).then(function(answers) {
    var details = {};
    details.name = datasource.serviceName;
    details['service_plan_guid'] = datasource.servicePlans[answers.servicePlan];
    details['space_guid'] = cfConfig.space.guid;
    cf.provisionService(cfConfig.accessToken, details, function(err, res, service) {
      if (err) {
        if (cb) {
          done();
          cb(err);
        } else {
          return done(err);
        }
      }
      datasource.serviceGUID = service.metadata.guid;
      if (cb) {
        done();
        cb();
      } else {
        done();
      }
    });
  }.bind(datasource));
}

function bindServiceToApp(datasource, cb) {
  var done = datasource.async();
  cf.getApps(cfConfig.accessToken, function(err, resources) {
    if (err) {
      if (cb) {
        done();
        cb(err);
      } else {
        return done(err);
      }
    }
    var matchedApp = false;
    for (var i = 0; i < resources.length; i++) {
      var app = resources[i];
      if (app.entity.name === datasource.appName) {
        matchedApp = true;
        var details = {
          'app_guid': app.metadata.guid,
          'service_instance_guid': datasource.serviceGUID,
        };
        cf.bindService(cfConfig.accessToken, details, function(err) {
          if (cb) {
            done();
            return cb(err);
          } else {
            return done(err);
          }
        });
        break;
      }
    }
    if (!matchedApp) { done(); }
  });
}

function addDatasource(datasource, config, cb) {
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
    if (cb) {
      done();
      cb(err);
    } else {
      return done(err);
    }
  });
}

function updatePipeline(datasource, cb) {
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
      if (cb) cb(null);
    } catch (e) {
      if (cb) cb(e);
      else throw new Error(e);
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
