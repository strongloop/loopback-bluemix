'use strict';

var fs = require('fs');
var path = require('path');
var insertLine = require('insert-line');
var jsonfileUpdater = require('jsonfile-updater');

/**
 * Add optional default services to the app
 * @param {object} options Bluemix options
 */
module.exports = function(options) {
  if (!options) {
    throw new Error('Default services options not specified');
  }
  var bluemixTemplatesDir = path.resolve(__dirname, '..', '..', '..',
                            'node_modules', 'loopback-workspace', 'templates', 'bluemix');
  var serverFilePath = path.join(options.destDir, 'server', 'server.js');
  var serverFileContent = fs.readFileSync(serverFilePath, 'utf8');
  var inclusionString = '';
  var newDependencies = {};
  if (options.enableAutoScaling) {
    newDependencies['bluemix-autoscaling-agent'] = '^1.0.7';
    var autoScalingModuleTemplate = fs.readFileSync(path.resolve(
      bluemixTemplatesDir, 'services', 'autoscaling-module.tpl'));
    inclusionString += autoScalingModuleTemplate;
  }
  if (options.enableAppMetrics) {
    newDependencies['appmetrics-dash'] = '^1.0.0';
    var fileContent = fs.readFileSync(serverFilePath, 'utf8');
    var appmetricsModuleTemplate = fs.readFileSync(path.resolve(bluemixTemplatesDir,
                              'services', 'appmetrics-module.tpl'));
    var appmetricsStartTemplate = fs.readFileSync(path.resolve(bluemixTemplatesDir,
                              'services', 'appmetrics-start.tpl'));
    inclusionString += appmetricsModuleTemplate;
    insertLine(serverFilePath).contentSync(appmetricsStartTemplate).at(28);
  }
  insertLine(serverFilePath).contentSync(inclusionString).at(3);
  var packageFile = path.join(options.destDir, 'package.json');
  jsonfileUpdater(packageFile).append('dependencies', newDependencies, function(err) {
    if (err) console.log(err);
  });
};
