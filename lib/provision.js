// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const ora = require('ora');
const path = require('path');
const cf = require('./cf');
const templatesDir = path.resolve(__dirname, '..', 'templates');
const datasourcesConfigPath = path.join(templatesDir, 'bluemix', 'bluemix',
  'datasources-config.json');
const datasourcesConfig = require(datasourcesConfigPath);
const bluemixSupportedServices = datasourcesConfig.supportedServices;

/**
 * Prompt new Bluemix service details
 * @param datasource {object} Datasource object
 * @param globalize {function} Globalization function
 */
function promptServiceName(datasource, globalize) {
  const done = datasource.async();
  const serviceTypes = [];
  const connectorNameLookup = {};
  Object.keys(bluemixSupportedServices).forEach(function(k) {
    const label = bluemixSupportedServices[k].label;
    serviceTypes.push(label);
    connectorNameLookup[label] = k;
  });
  const prompts = [
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
  const done = datasource.async();
  // Getting service plans is a two-step process, hence line no. 82
  const spinner = ora('Getting service plans').start();
  cf.getSupportedServices(null, datasource.accessToken, function(err, serviceDetails) {
    if (err) {
      spinner.error(err.message);
      return done(err);
    }
    datasource.dataServices = {};
    serviceDetails.forEach(function(service) {
      datasource.dataServices[service.label] = service;
    });
    spinner.stop();
    return done();
  });
}

/**
 * Prompt plan for new Bluemix service
 * @param datasource {object} Datasource object
 * @param globalize {function} Globalization function
 */
function promptServicePlan(datasource, globalize) {
  const done = datasource.async();
  const service = datasource.dataServices[datasource.serviceType];
  datasource.servicePlans = {};
  const spinner = ora('Getting service plans').start();
  cf.getResource(service.service_plans_url, datasource.accessToken, {},
    function(err, res) {
      if (err) {
        spinner.error(err.message);
        return done(err);
      }
      const servicePlans = res.body.resources;
      servicePlans.forEach(function(plan) {
        datasource.servicePlans[plan.entity.name] = plan.metadata.guid;
      });
      spinner.stop();
      return done();
    });
}

/**
 * Provision new service
 * @param datasource {object} Datasource object
 * @param globalize {function} Globalization function
 */
function provisionService(datasource, globalize) {
  const done = datasource.async();
  const servicePlans = Object.keys(datasource.servicePlans);
  const prompts = [
    {
      name: 'servicePlan',
      message: globalize.f('Select the service plan:'),
      type: 'list',
      choices: servicePlans,
    },
  ];
  const cfConfig = cf.getCfConfig();
  return datasource.prompt(prompts).then(function(answers) {
    const details = {};
    details.name = datasource.name;
    details['service_plan_guid'] = datasource.servicePlans[answers.servicePlan];
    details['space_guid'] = cfConfig.space.guid;
    const spinner = ora('Provisioning service').start();
    cf.provisionService(datasource.accessToken, details, function(err, res) {
      if (err) {
        spinner.fail(err.message);
        return done(err);
      }
      const service = res.body;
      datasource.serviceGuid = service.metadata.guid;
      spinner.succeed('Service provisioned');
      return done();
    });
  }.bind(datasource));
}

exports.promptServiceName = promptServiceName;
exports.getServicePlans = getServicePlans;
exports.promptServicePlan = promptServicePlan;
exports.provisionService = provisionService;
