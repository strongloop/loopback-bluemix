// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');
const lbBM = require(path.resolve(__dirname, '..'));
const sandboxDir = path.resolve(__dirname, 'sandbox');

const BASIC_BLUEMIX_FILES = [
  '.cfignore',
  'manifest.yml',
];

const DOCKER_FILES = [
  '.dockerignore',
  'Dockerfile',
];

const TOOLCHAIN_FILES = [
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
    const options = {
      destDir: sandboxDir,
      enableBluemix: false,
      enableManifest: false,
      enableDocker: false,
      enableToolchain: false,
    };
    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    const filePath = sandboxDir + '/server/datasources.bluemix.js';
    assert(fs.existsSync(filePath));
  });

  it('should generate datasources-config.json', function() {
    const options = {
      destDir: sandboxDir,
      enableBluemix: false,
      enableManifest: false,
      enableDocker: false,
      enableToolchain: false,
    };
    lbBM.generateBluemixFiles(options, fs.copySync, fs.copySync);
    const filePath = sandboxDir + '/.bluemix/datasources-config.json';
    assert(fs.existsSync(filePath));
  });

  it('should generate basic Bluemix files', function() {
    const options = {
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
    const options = {
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
    const options = {
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
    const options = {
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
    const options = {
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
