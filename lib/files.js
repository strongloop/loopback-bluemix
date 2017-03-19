'use strict';

var fs = require('fs');
var path = require('path');

/**
 * Create the Bluemix files and directory.
 * @param {object} bluemixOptions Bluemix options
 */
module.exports = function(bluemixOptions, copyFile, copyDir) {
  var bluemixCommand = bluemixOptions.bluemixCommand;
  var cmdOptions = bluemixOptions.cmdOptions;
  var destDir = bluemixOptions.destDir;

  var bluemixTemplatesDir = path.resolve(__dirname, '..', '..', 'node_modules', 'loopback-workspace',
                            'templates', 'bluemix');
  console.log(__dirname)
  console.log(bluemixTemplatesDir)
  var bluemixDirSrc = path.resolve(bluemixTemplatesDir, 'bluemix');
  var bluemixDirDest = path.resolve(bluemixOptions.destDir, '.bluemix');

  if (bluemixCommand === 'bluemix') {
    // Create .cfignore
    var cfignoreSrc = path.resolve(bluemixTemplatesDir, 'cfignore');
    var cfignoreDest = path.resolve(bluemixOptions.destDir, '.cfignore');
    copyFile(cfignoreSrc, cfignoreDest);
    // Update README.md
    var toolChainButton = '[![Create Toolchain](https://console.ng.bluemix.net/devops/graphics/create_toolchain_button.png)](https://console.ng.bluemix.net/devops/setup/deploy/)';
    var readmeSrc = path.resolve(bluemixTemplatesDir, 'README.md');
    var readmeDest = path.resolve(bluemixOptions.destDir, 'README.md');
    if (fs.existsSync(readmeDest)) {
      insertLine(readmeDest).contentSync(toolChainButton).at(2);
    } else {
      copyFile(readmeSrc, readmeDest);
    }

    // Create datasources.bluemix.js
    var datasourceBluemixSrc = path.resolve(bluemixTemplatesDir,
                                'datasources.bluemix.js');
    var datasourceBluemixDest = path.resolve(bluemixOptions.destDir, 'server',
                                'datasources.bluemix.js');
    copyFile(datasourceBluemixSrc, datasourceBluemixDest);
    // Copy datasource-config.json
    var datasourceConfigSrc = path.join(bluemixDirSrc, 'datasources-config.json');
    var datasourceConfigDest = path.join(bluemixDirDest, 'datasources-config.json');
    copyFile(datasourceConfigSrc, datasourceConfigDest);
  }

  if (cmdOptions.toolchain || (bluemixOptions.enableToolchain &&
     bluemixCommand === 'bluemix')) {
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

  if (cmdOptions.docker || (bluemixOptions.enableDocker &&
     bluemixCommand === 'bluemix')) {
    // Create .dockerignore
    var dockerignoreSrc = path.resolve(bluemixTemplatesDir, 'dockerignore');
    var dockerignoreDest = path.resolve(bluemixOptions.destDir, '.dockerignore');
    copyFile(dockerignoreSrc, dockerignoreDest);
    // Create Dockerfile
    var dockerfileRunSrc = path.resolve(bluemixTemplatesDir, 'Dockerfile');
    var dockerfileRunDest = path.resolve(bluemixOptions.destDir, 'Dockerfile');
    copyFile(dockerfileRunSrc, dockerfileRunDest);
  }

  if (cmdOptions.manifest || bluemixCommand === 'bluemix') {
    // Create manifest.yml
    var manifestSrc = path.resolve(bluemixTemplatesDir, 'manifest.yml');
    var manifestDest = path.resolve(bluemixOptions.destDir, 'manifest.yml');
    copyFile(manifestSrc, manifestDest);
  }
};
