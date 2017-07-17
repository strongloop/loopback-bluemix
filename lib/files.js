// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

var fs = require('fs');
var path = require('path');
var insertLine = require('insert-line');

/**
 * Create the Bluemix files and directory
 * @param bluemixOptions {object} Bluemix options
 * @param copyFile {function} Function for copying file
 * @param copyDir {function} Function for copying directory
 */
module.exports = function(bluemixOptions, copyFile, copyDir) {
  var destDir = bluemixOptions.destDir;

  var bluemixTemplatesDir = path.resolve(__dirname, '..', 'templates', 'bluemix');

  var bluemixDirSrc = path.resolve(bluemixTemplatesDir, 'bluemix');
  var bluemixDirDest = path.resolve(bluemixOptions.destDir, '.bluemix');

  // Create datasources.bluemix.js
  var datasourceBluemixSrc = path.resolve(bluemixTemplatesDir,
                              'datasources.bluemix.js');
  var datasourceBluemixDest = path.resolve(bluemixOptions.destDir, 'server',
                              'datasources.bluemix.js');
  copyFile(datasourceBluemixSrc, datasourceBluemixDest);

  // Create datasource-config.json
  var datasourceConfigSrc = path.join(bluemixDirSrc, 'datasources-config.json');
  var datasourceConfigDest = path.join(bluemixDirDest, 'datasources-config.json');
  copyFile(datasourceConfigSrc, datasourceConfigDest);

  if (bluemixOptions.enableBluemix) {
    // Create .cfignore
    var cfignoreSrc = path.resolve(bluemixTemplatesDir, 'cfignore');
    var cfignoreDest = path.resolve(bluemixOptions.destDir, '.cfignore');
    copyFile(cfignoreSrc, cfignoreDest);
    // Update README.md
    var toolChainButton = '[![Create Toolchain](https://console.ng.bluemix.net/devops/graphics/create_toolchain_button.png)](https://console.ng.bluemix.net/devops/setup/deploy/)';
    var readmeSrc = path.resolve(bluemixTemplatesDir, 'README.md');
    var readmeDest = path.resolve(bluemixOptions.destDir, 'README.md');
    if (fs.existsSync(readmeDest)) {
      var readMeContent = fs.readFileSync(readmeDest, 'utf8');
      if (readMeContent.indexOf(toolChainButton) < 0) {
        insertLine(readmeDest).contentSync(toolChainButton).at(2);
      }
    } else {
      copyFile(readmeSrc, readmeDest);
    }
  }

  if (bluemixOptions.enableToolchain) {
    // Copy toolchain files
    var toolChainFiles = fs.readdirSync(bluemixDirSrc);
    toolChainFiles.forEach(function(fileName) {
      if (fileName !== 'datasources-config.json') {
        var toolChainFileSrc = path.join(bluemixDirSrc, fileName);
        var toolChainFileDest = path.join(bluemixDirDest, fileName);
        copyFile(toolChainFileSrc, toolChainFileDest);
      }
    });
  }

  if (bluemixOptions.enableDocker) {
    // Create .dockerignore
    var dockerignoreSrc = path.resolve(bluemixTemplatesDir, 'dockerignore');
    var dockerignoreDest = path.resolve(bluemixOptions.destDir, '.dockerignore');
    copyFile(dockerignoreSrc, dockerignoreDest);
    // Create Dockerfile
    var dockerfileRunSrc = path.resolve(bluemixTemplatesDir, 'Dockerfile');
    var dockerfileRunDest = path.resolve(bluemixOptions.destDir, 'Dockerfile');
    copyFile(dockerfileRunSrc, dockerfileRunDest);
  }

  if (bluemixOptions.enableManifest) {
    // Create manifest.yml
    var manifestSrc = path.resolve(bluemixTemplatesDir, 'manifest.yml');
    var manifestDest = path.resolve(bluemixOptions.destDir, 'manifest.yml');
    copyFile(manifestSrc, manifestDest);
  }
};
