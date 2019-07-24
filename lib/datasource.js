// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const ora = require('ora');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');
const jsonfileUpdater = require('jsonfile-updater');
const cf = require('./cf');
const templatesDir = path.resolve(__dirname, '..', 'templates');
const datasourcesConfigPath = path.join(templatesDir, 'bluemix', 'bluemix',
  'datasources-config.json');
const datasourcesConfig = require(datasourcesConfigPath);
const bluemixSupportedServices = datasourcesConfig.supportedServices;
const supportedConnectors = Object.keys(bluemixSupportedServices);

/**
 * Present Bluemix datasource selection options
 * @param datasource {object} Datasource object
 * @param globalize {function} Globalization function
 */
function selectBluemixDatasource(datasource, globalize) {
  const done = datasource.async();
  const appDatasourcesConfigFilePath = path.resolve('.bluemix',
    'datasources-config.json');
  if (!fs.existsSync(appDatasourcesConfigFilePath)) {
    datasource.abort = true;
    datasource.log('Invalid Bluemix app directory');
    return done();
  }
  const spinner = ora('Finding Bluemix data service instances').start();
  cf.getDataServiceInstances(null, datasource.accessToken,
    function(err, resources) {
      if (err) {
        datasource.abort = true;
        if (err.statusCode === 401) {
          const msg = err.message + ': Log in to get new token';
          spinner.fail(msg);
          return done();
        } else {
          spinner.fail(err.message);
          return done();
        }
      }

      if (resources.length < 1) {
        datasource.abort = true;
        spinner.info('No Bluemix data service instances found.');
        return done();
      }

      const serviceChoices = [];
      const appDatasourcesConfig = require(appDatasourcesConfigFilePath);
      const existingBluemixDatasources = appDatasourcesConfig.datasources;
      const existingBluemixDatasourcesKeys = Object
        .keys(existingBluemixDatasources);
      if (existingBluemixDatasourcesKeys.length > 0) {
        datasource.log('\n Already added:');
        existingBluemixDatasourcesKeys.forEach(function(name) {
          if (name !== 'db') {
            datasource.log(chalk.yellow(' ∙ ' + name));
          }
        });
      }

      if (allDatasourcesAdded(existingBluemixDatasourcesKeys, resources)) {
        datasource.abort = true;
        return spinner.info('All datasource services already added.');
      }

      const services = {};
      const _connectorChoices = datasource.listOfAvailableConnectors;
      _connectorChoices.forEach(function(c) {
        if (supportedConnectors.indexOf(c.value) >= 0) {
          resources.forEach(function(resource) {
            const serviceMetadata = resource.service.entity;
            const serviceEntity = resource.instance.entity;
            const serviceName = serviceEntity.name;
            const serviceLabel = serviceMetadata.label;
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

      spinner.stop();
      const prompts = [
        {
          name: 'serviceName',
          message: globalize.f('Select the Bluemix datasource option'),
          type: 'list',
          choices: serviceChoices,
        },
      ];
      return datasource.prompt(prompts).then(function(answers) {
        datasource.name = answers.serviceName;
        const service = services[datasource.name];
        if (!service) {
          datasource.abort = true;
          const errorMsg = 'Invalid service: ' + datasource.name;
          spinner.fail(errorMsg);
          return done();
        }
        datasource.connector = service.connector;
        datasource.serviceGuid = service.guid;
        spinner.succeed('Datasource added to app');
        return done();
      }.bind(datasource));
    });

  function allDatasourcesAdded(existingBluemixDatasourcesKeys, resources) {
    let resourceCount = 0;
    resources.forEach(function(resource) {
      const resourceName = resource.instance.entity.name;
      if (existingBluemixDatasourcesKeys.indexOf(resourceName) > -1) {
        resourceCount++;
      }
    });
    if (resourceCount === resources.length) return true;
    else return false;
  }
}

/**
 * Bind data service to current app (if already on Bluemix)
 * @param datasource {object} Datasource object
 */
function bindServiceToApp(datasource) {
  const done = datasource.async();
  const spinner = ora().start('Binding service to app');
  cf.getApps(null, datasource.accessToken, function(err, resources) {
    if (err) {
      datasource.abort = true;
      if (err.statusCode === 401) {
        const msg = err.message + ': Log in to get new token';
        spinner.fail(msg);
        return done();
      } else {
        spinner.fail(err.message);
        return done();
      }
    }
    let matchedApp = false;
    for (let i = 0; i < resources.length; i++) {
      const app = resources[i];
      if (app.entity.name === datasource.appName) {
        matchedApp = true;
        const details = {
          'app_guid': app.metadata.guid,
          'service_instance_guid': datasource.serviceGuid,
        };
        spinner.text = 'Binding service to app';
        cf.bindService(datasource.accessToken, details, function(err) {
          if (err) {
            datasource.abort = true;
            if (err.statusCode === 401) {
              const msg = err.message + ': Log in to get new token';
              spinner.fail(msg);
              return done();
            } else if (err.message
              .includes('The app space binding to service is taken')) {
              spinner.succeed('Service already bound to app');
              return done();
            } else {
              spinner.fail(err.message);
              return done();
            }
          } else {
            spinner.succeed('Service bound to app');
            return done();
          }
        });
        break;
      }
    }
    if (!matchedApp) {
      spinner.info('App not deployed to Bluemix');
      done();
    }
  });
}

/**
 * Add datasource to datasources-config.json
 * @param datasource {object} Datasource object
 * @param config {object} Globalization function
 */
function addDatasource(datasource, config) {
  const done = datasource.async();
  const datasourcesConfigFilePath = path.join(process.cwd(), '.bluemix',
    'datasources-config.json');
  const bluemixConnectorConfig = {
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
  const datasourceName = 'datasources.' + bluemixConnectorConfig.name;
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
  const pipeLineFilePath = path.join(process.cwd(), '.bluemix',
    'pipeline.yml');
  const content = fs.readFileSync(pipeLineFilePath, 'utf8');
  const lines = content.split('#!/bin/bash')[1].split('\n').map(function(line) {
    return line.trim();
  });

  const bindServiceCommand = 'cf bind-service ' +
                            datasource.appName + ' ' + datasource.name;
  if (lines.indexOf(bindServiceCommand) < 0) {
    const appendStr = '      ' + bindServiceCommand + '\n';
    try {
      fs.appendFileSync(pipeLineFilePath, appendStr);
    } catch (e) {
      throw new Error(e);
    }
  }
}

exports.selectBluemixDatasource = selectBluemixDatasource;
exports.bindServiceToApp = bindServiceToApp;
exports.addDatasource = addDatasource;
exports.updatePipeline = updatePipeline;
