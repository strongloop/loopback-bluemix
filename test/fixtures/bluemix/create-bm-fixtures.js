// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var chalk = require('chalk');
var fs = require('fs-extra');
var cf = require('cloudfoundry-cli');
var insertLine = require('insert-line');
var uuid = require('uuid/v4');
var path = require('path');
var execSync = require('child_process').execSync;
var provisionedFilePath = path.join(__dirname, '.provisioned');

if (fs.existsSync(provisionedFilePath)) {
  console.log('All Bluemix test fixtures already created');
} else {
  var fixtureChecklist = {
    appFixture: false,
    cloudantFixture: false,
    rabbitFixture: false,
    nonDataFixture: false
  }

  var appName = uuid();

  var packagePath = path.join(__dirname, 'sample-app/package.json');
  var manifestPath = path.join(__dirname, 'sample-app/manifest.yml');

  insertLine(packagePath).contentSync('"name": "' + appName + '",', { overwrite: true, padding: 2 }).at(2);
  insertLine(manifestPath).contentSync('name: ' + appName, { overwrite: true, padding: 2 }).at(6);
  insertLine(manifestPath).contentSync('host: ' + appName, { overwrite: true, padding: 2 }).at(7);

  try {
    process.stdout.write('Uploading app "'+ appName +'" ...');
    cf.pushAppSync(__dirname + '/sample-app');
  } catch (e) {
    console.log();
    console.log(chalk.red(e.message));
    process.exit();
  }

  execSync('git checkout ' + packagePath);
  execSync('git checkout ' + manifestPath);
  fixtureChecklist.appFixture = true;
  process.stdout.write(' ✔︎\n');

  var fixtureServices = {
    cloudantFixture: {
      type: 'cloudantNoSQLDB',
      plan: 'Lite'
    },
    rabbitFixture: {
      type: 'compose-for-rabbitmq',
      plan: 'Standard'
    },
    nonDataFixture: {
      type: 'tone_analyzer',
      plan: 'lite'
    }
  }

  var services = cf.getServicesSync();
  var provisionedServices = [];

  Object.keys(fixtureServices).forEach(function(serviceName) {
    var serviceProvisioned = false
    for (var i = 0; i < services.length; i++) {
      var service = services[i];
      if (service.name === serviceName) {
        serviceProvisioned = true
        break;
      }
    }
    if (!serviceProvisioned) {
      try {
        var fixtureService = fixtureServices[serviceName];
        process.stdout.write('Provisioning ' + fixtureService.type + ' service "'+ serviceName +'" ...');
        var details = {
          name: serviceName,
          type: fixtureService.type,
          plan: fixtureService.plan
        }
        cf.createServiceSync(details);
        process.stdout.write(' ✔︎\n');
        provisionedServices.push(serviceName);
      } catch (e) {
        console.log();
        console.log(chalk.red(e.message));
        process.stdout.write('\nDeleting app "'+ appName +'" ...');
        cf.deleteAppSync(appName);
        process.stdout.write(' ✔︎\n');

        provisionedServices.forEach(function(serviceName) {
          process.stdout.write('Deleting service "'+ serviceName +'" ...');
          cf.deleteServiceSync(serviceName);
          process.stdout.write(' ✔︎\n');
        });

        process.exit();
      }
    }
    fixtureChecklist[serviceName] = true;
  })

  var checked = 0;
  Object.keys(fixtureChecklist).forEach(function(key) {
    if (fixtureChecklist[key]) checked++;
  })

  if (checked === 4) {
    fs.writeFileSync(provisionedFilePath, appName);
  }
}
