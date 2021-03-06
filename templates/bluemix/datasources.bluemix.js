// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const path = require('path');
let vcapServices = process.env.VCAP_SERVICES;
if (typeof vcapServices === 'string') {
  vcapServices = JSON.parse(vcapServices);
} else { vcapServices = {}; }

const datasourcesConfig = require(
  path.join(__dirname, '..', '.bluemix', 'datasources-config.json')
);
const configuredDatasources = datasourcesConfig.datasources;
const supportedVcapServices = datasourcesConfig.supportedServices;
const supportedVcapServiceNames = [];
Object.keys(supportedVcapServices).forEach(function(key) {
  const value = supportedVcapServices[key];
  supportedVcapServiceNames.push(value.label);
});

const dataSources = {};

Object.keys(vcapServices).forEach(function(serviceType) {
  if (supportedVcapServiceNames.indexOf(serviceType) >= 0) {
    const serviceCredentials = vcapServices[serviceType];
    serviceCredentials.forEach(function(service) {
      if (service.name in configuredDatasources) {
        const configuredDatasource = configuredDatasources[service.name];
        const credentials = service.credentials;

        if (service.label === 'Object-Storage') {
          // Connectors that are implemented by loopback-component-storage
          const loopbackComponentStorageConnectors = ['ibm-object-storage'];

          dataSources[service.name] = {
            name: service.name,
            provider: 'openstack',
            useServiceCatalog: true,
            useInternal: false,
            keystoneAuthVersion: 'v3',
            authUrl: credentials.auth_url,
            tenantId: credentials.projectId,
            domainId: credentials.domainId,
            username: credentials.username,
            password: credentials.password,
            region: credentials.region,
            connector: loopbackComponentStorageConnectors
              .indexOf(configuredDatasource.connector) > -1 ?
              'loopback-component-storage' : configuredDatasource.connector,
          };
        } else {
          dataSources[service.name] = {
            name: service.name,
            connector: configuredDatasource.connector,
            url: credentials.uri || credentials.url,
            host: credentials.host,
            port: credentials.port,
            username: credentials.username,
            password: credentials.password,
          };
          const dataSource = dataSources[service.name];

          if ('database' in configuredDatasource) {
            dataSource.database = configuredDatasource.database;
          }
          if ('db' in configuredDatasource) {
            dataSource.db = configuredDatasource.db;
          }

          if (credentials.db_type === 'redis') {
            dataSource.url += '/' + configuredDatasource.database;
          } else if (credentials.db_type === 'mysql' ||
                    credentials.db_type === 'postgresql') {
            dataSource.url = dataSource.url.replace('compose',
              configuredDatasource.database);
          }
        }
      }
    });
  }
});

module.exports = dataSources;
