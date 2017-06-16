// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var fs = require('fs-extra');
var cf = require('cloudfoundry-cli');
var path = require('path');
var provisionedFilePath = path.join(__dirname, '.provisioned');

if (fs.existsSync(provisionedFilePath)) {
  var appName = fs.readFileSync(provisionedFilePath, 'utf8');

  try {
    process.stdout.write('Deleting app "'+ appName +'" ...');
    cf.deleteAppSync(appName);
    process.stdout.write(' ✔︎\n');
  } catch (e) {
    console.log();
    console.log(chalk.red(e.message));
    process.exit();
  }

  var fixtureServices = [
    'cloudantFixture',
    'rabbitFixture',
    'nonDataFixture'
  ];

  fixtureServices.forEach(function(serviceName) {
    try {
      process.stdout.write('Deleting service "'+ serviceName +'" ...');
      cf.deleteServiceSync(serviceName);
      process.stdout.write(' ✔︎\n');
    } catch (e) {
      console.log();
      console.log(chalk.red(e.message));
      process.exit();
    }
  });
  fs.removeSync(provisionedFilePath);
} else {
  console.log('Bluemix test fixtures not created');
}
