// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var path = require('path');
var cf = require('./cf');
var templatesDir = path.resolve(__dirname, '..', 'templates');
var datasourcesConfigPath = path.join(templatesDir, 'bluemix', 'bluemix',
                            'datasources-config.json');
var datasourcesConfig = require(datasourcesConfigPath);
var bluemixSupportedServices = datasourcesConfig.supportedServices;

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

exports.promptServiceName = promptServiceName;
exports.getServicePlans = getServicePlans;
exports.promptServicePlan = promptServicePlan;
exports.provisionService = provisionService;
