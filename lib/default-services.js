// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const fs = require('fs');
const path = require('path');
const insertLine = require('insert-line');
const jsonfileUpdater = require('jsonfile-updater');

/**
 * Add optional default services to the app
 * @param options {object} Bluemix options
 * @param cb {function} Callback function
 */
module.exports = function(options, cb) {
  if (!options) {
    throw new Error('Default services options not specified');
  }
  const bluemixTemplatesDir = path.resolve(__dirname, '..', 'templates', 'bluemix');
  const serverFilePath = path.join(options.destDir, 'server', 'server.js');
  const serverFileContent = fs.readFileSync(serverFilePath, 'utf8');
  const serverFileLinesCount = serverFileContent.split('\n').length;
  let inclusionString = '';
  const newDependencies = {};
  let addAutoScaling = false;
  let addAppMetrics = false;
  if (options.enableAutoScaling) {
    if (!serverFileContent.includes("require('bluemix-autoscaling-agent')")) {
      addAutoScaling = true;
      newDependencies['bluemix-autoscaling-agent'] = '^1.0.7';
      const autoScalingModuleTemplate = fs.readFileSync(path.resolve(
        bluemixTemplatesDir, 'services', 'autoscaling-module.tpl'
      ));
      inclusionString += autoScalingModuleTemplate;
    }
  }
  if (options.enableAppMetrics) {
    if (!serverFileContent.includes("require('appmetrics-dash')")) {
      addAppMetrics = true;
      newDependencies['appmetrics-dash'] = '^1.0.0';
      const fileContent = fs.readFileSync(serverFilePath, 'utf8');
      const appmetricsModuleTemplate = fs.readFileSync(path.resolve(bluemixTemplatesDir,
        'services', 'appmetrics-module.tpl'));
      const appmetricsStartTemplate = fs.readFileSync(path.resolve(bluemixTemplatesDir,
        'services', 'appmetrics-start.tpl'));
      if (options.enableAutoScaling) inclusionString += '\n';
      inclusionString += appmetricsModuleTemplate;
      insertLine(serverFilePath).contentSync('if (require.main === module) {',
        {overwrite: true, padding: 2})
        .at(serverFileLinesCount - 3);
      insertLine(serverFilePath).contentSync('var server = app.start();',
        {overwrite: true, padding: 4})
        .at(serverFileLinesCount - 2);
      insertLine(serverFilePath).contentSync('}',
        {padding: 2}).at(serverFileLinesCount - 1);
      insertLine(serverFilePath).contentSync(appmetricsStartTemplate)
        .at(serverFileLinesCount - 1);
    }
  }

  if (addAutoScaling || addAppMetrics) {
    insertLine(serverFilePath).contentSync(inclusionString).at(3);
    const packageFile = path.join(options.destDir, 'package.json');
    jsonfileUpdater(packageFile).append('dependencies', newDependencies, function(err) {
      return cb && cb(err);
    });
  } else {
    cb();
  }
};
