// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

'use strict';

const fs = require('fs');
const path = require('path');
const insertLine = require('insert-line');

/**
 * Create the Bluemix files and directory
 * @param bluemixOptions {object} Bluemix options
 * @param copyFile {function} Function for copying file
 * @param copyDir {function} Function for copying directory
 */
module.exports = function(bluemixOptions, copyFile, copyDir) {
  const destDir = bluemixOptions.destDir;

  const bluemixTemplatesDir = path.resolve(__dirname, '..', 'templates', 'bluemix');

  const bluemixDirSrc = path.resolve(bluemixTemplatesDir, 'bluemix');
  const bluemixDirDest = path.resolve(bluemixOptions.destDir, '.bluemix');

  // Create datasources.bluemix.js
  const datasourceBluemixSrc = path.resolve(bluemixTemplatesDir,
    'datasources.bluemix.js');
  const datasourceBluemixDest = path.resolve(bluemixOptions.destDir, 'server',
    'datasources.bluemix.js');
  copyFile(datasourceBluemixSrc, datasourceBluemixDest);

  // Create datasource-config.json
  const datasourceConfigSrc = path.join(bluemixDirSrc, 'datasources-config.json');
  const datasourceConfigDest = path.join(bluemixDirDest, 'datasources-config.json');
  copyFile(datasourceConfigSrc, datasourceConfigDest);

  if (bluemixOptions.enableBluemix) {
    // Create .cfignore
    const cfignoreSrc = path.resolve(bluemixTemplatesDir, 'cfignore');
    const cfignoreDest = path.resolve(bluemixOptions.destDir, '.cfignore');
    copyFile(cfignoreSrc, cfignoreDest);
    // Update README.md
    const toolChainButton = '[![Create Toolchain](https://console.ng.bluemix.net/devops/graphics/create_toolchain_button.png)](https://console.ng.bluemix.net/devops/setup/deploy/)';
    const readmeSrc = path.resolve(bluemixTemplatesDir, 'README.md');
    const readmeDest = path.resolve(bluemixOptions.destDir, 'README.md');
    if (fs.existsSync(readmeDest)) {
      const readMeContent = fs.readFileSync(readmeDest, 'utf8');
      if (readMeContent.indexOf(toolChainButton) < 0) {
        insertLine(readmeDest).contentSync(toolChainButton).at(2);
      }
    } else {
      copyFile(readmeSrc, readmeDest);
    }
  }

  if (bluemixOptions.enableToolchain) {
    // Copy toolchain files
    const toolChainFiles = fs.readdirSync(bluemixDirSrc);
    toolChainFiles.forEach(function(fileName) {
      if (fileName !== 'datasources-config.json') {
        const toolChainFileSrc = path.join(bluemixDirSrc, fileName);
        const toolChainFileDest = path.join(bluemixDirDest, fileName);
        copyFile(toolChainFileSrc, toolChainFileDest);
      }
    });
  }

  if (bluemixOptions.enableDocker) {
    // Create .dockerignore
    const dockerignoreSrc = path.resolve(bluemixTemplatesDir, 'dockerignore');
    const dockerignoreDest = path.resolve(bluemixOptions.destDir, '.dockerignore');
    copyFile(dockerignoreSrc, dockerignoreDest);
    // Create Dockerfile
    const dockerfileRunSrc = path.resolve(bluemixTemplatesDir, 'Dockerfile');
    const dockerfileRunDest = path.resolve(bluemixOptions.destDir, 'Dockerfile');
    copyFile(dockerfileRunSrc, dockerfileRunDest);
  }

  if (bluemixOptions.enableManifest) {
    // Create manifest.yml
    const manifestSrc = path.resolve(bluemixTemplatesDir, 'manifest.yml');
    const manifestDest = path.resolve(bluemixOptions.destDir, 'manifest.yml');
    copyFile(manifestSrc, manifestDest);
  }
};
