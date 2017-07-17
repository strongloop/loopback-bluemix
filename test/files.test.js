// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: generator-loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

var fs = require('fs-extra');
var path = require('path');
var assert = require('assert');
var lbBM = require(path.resolve(__dirname, '..'));
var sandboxDir = path.resolve(__dirname, 'sandbox');

var BASIC_BLUEMIX_FILES = [
  '.cfignore',
  'manifest.yml',
];

var DOCKER_FILES = [
  '.dockerignore',
  'Dockerfile',
];

var TOOLCHAIN_FILES = [
  '.bluemix/deploy.json',
  '.bluemix/pipeline.yml',
  '.bluemix/toolchain.yml',
];

describe('lib/files', function() {
  before(function() {
    fs.ensureDirSync(sandboxDir);
    fs.emptyDirSync(sandboxDir);
  });

  afterEach(function() {
    fs.emptyDirSync(sandboxDir);
    fs.removeSync(sandboxDir);
  });

  it('should generate datasources.bluemix.js', function() {
    var options = {
      destDir: sandboxDir,
      enableBluemix: false,
      enableManifest: false,
      enableDocker: false,
      enableToolchain: false,
    };
    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    var filePath = sandboxDir + '/server/datasources.bluemix.js';
    assert(fs.existsSync(filePath));
  });

  it('should generate datasources-config.json', function() {
    var options = {
      destDir: sandboxDir,
      enableBluemix: false,
      enableManifest: false,
      enableDocker: false,
      enableToolchain: false,
    };
    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    var filePath = sandboxDir + '/.bluemix/datasources-config.json';
    assert(fs.existsSync(filePath));
  });

  it('should generate basic Bluemix files', function() {
    var options = {
      destDir: sandboxDir,
      enableBluemix: true,
      enableManifest: true,
      enableDocker: true,
      enableToolchain: true,
    };
    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    BASIC_BLUEMIX_FILES.concat(DOCKER_FILES).concat(TOOLCHAIN_FILES)
    .forEach(function(filePath) {
      filePath = sandboxDir + '/' + filePath;
      assert(fs.existsSync(filePath));
    });
  });

  it('should generate only Docker files', function() {
    var options = {
      destDir: sandboxDir,
      enableDocker: true,
    };

    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    DOCKER_FILES.forEach(function(filePath) {
      filePath = sandboxDir + '/' + filePath;
      assert(fs.existsSync(filePath));
    });

    BASIC_BLUEMIX_FILES.concat(TOOLCHAIN_FILES).forEach(function(filePath) {
      filePath = sandboxDir + '/' + filePath;
      assert(!fs.existsSync(filePath));
    });
  });

  it('should ommit Docker files', function() {
    var options = {
      destDir: sandboxDir,
      enableDocker: false,
      enableToolchain: true,
    };

    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    DOCKER_FILES.forEach(function(filePath) {
      filePath = sandboxDir + '/' + filePath;
      assert(!fs.existsSync(filePath));
    });
  });

  it('should generate only toolchain files', function() {
    var options = {
      destDir: sandboxDir,
      enableToolchain: true,
    };

    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    TOOLCHAIN_FILES.forEach(function(filePath) {
      filePath = sandboxDir + '/' + filePath;
      assert(fs.existsSync(filePath));
    });

    BASIC_BLUEMIX_FILES.concat(DOCKER_FILES).forEach(function(filePath) {
      filePath = sandboxDir + '/' + filePath;
      assert(!fs.existsSync(filePath));
    });
  });

  it('should ommit toolchain files', function() {
    var options = {
      destDir: sandboxDir,
      enableDocker: true,
      enableToolchain: false,
    };

    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    TOOLCHAIN_FILES.forEach(function(filePath) {
      filePath = sandboxDir + '/' + filePath;
      assert(!fs.existsSync(filePath));
    });
  });
});
