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
const fixturesDir = path.resolve(__dirname, 'fixtures');
const srcPackagefilePath = path.resolve(__dirname, 'fixtures', 'package.json');
const destPackagefilePath = path.join(sandboxDir, 'package.json');
const srcSeverfilePath = path.resolve(__dirname, '..', 'node_modules',
  'loopback-workspace', 'templates', 'projects', 'empty-server', 'files',
  'server', 'server.js');
const destSeverfilePath = path.join(sandboxDir, 'server', 'server.js');

describe('lib/default-services', function() {
  beforeEach(function() {
    fs.ensureDirSync(sandboxDir);
    fs.emptyDirSync(sandboxDir);
    fs.copySync(srcPackagefilePath, destPackagefilePath);
    fs.copySync(srcSeverfilePath, destSeverfilePath);
  });

  afterEach(function() {
    fs.emptyDirSync(sandboxDir);
    fs.removeSync(sandboxDir);
  });

  it('should add autoscaling only', function(done) {
    const options = {destDir: sandboxDir, enableAutoScaling: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      const autoscalingServerfileContent = fs.readFileSync(path.join(
        fixturesDir, 'server.autoscaling.js'
      ), 'utf-8');
      const serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
      assert(autoscalingServerfileContent === serverfileContent);
      const pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
      assert('bluemix-autoscaling-agent' in pkg.dependencies);
      done();
    });
  });

  it('should add autoscaling only once', function(done) {
    const options = {destDir: sandboxDir, enableAutoScaling: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      const options = {destDir: sandboxDir, enableAutoScaling: true};
      lbBM.addDefaultServices(options, function(err) {
        assert(!err);
        const autoscalingServerfileContent = fs.readFileSync(path.join(
          fixturesDir, 'server.autoscaling.js'
        ), 'utf-8');
        const serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
        const firstIndex = serverfileContent
          .indexOf("require('bluemix-autoscaling-agent')");
        const lastIndex = serverfileContent
          .lastIndexOf("require('bluemix-autoscaling-agent')");
        assert.equal(firstIndex, lastIndex);
        const pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
        assert('bluemix-autoscaling-agent' in pkg.dependencies);
        done();
      });
    });
  });

  it('should add appmetrics only', function(done) {
    const options = {destDir: sandboxDir, enableAppMetrics: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      const appmetricsServerfileContent = fs.readFileSync(path.join(
        fixturesDir, 'server.appmetrics.js'
      ), 'utf-8');
      const serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
      assert(appmetricsServerfileContent === serverfileContent);
      const pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
      assert('appmetrics-dash' in pkg.dependencies);
      done();
    });
  });

  it('should add appmetrics only once', function(done) {
    const options = {destDir: sandboxDir, enableAppMetrics: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      const options = {destDir: sandboxDir, enableAppMetrics: true};
      lbBM.addDefaultServices(options, function(err) {
        assert(!err);
        const appmetricsServerfileContent = fs.readFileSync(path.join(
          fixturesDir, 'server.appmetrics.js'
        ), 'utf-8');
        const serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
        const firstIndex = serverfileContent.indexOf("require('appmetrics-dash')");
        const lastIndex = serverfileContent.lastIndexOf("require('appmetrics-dash')");
        assert.equal(firstIndex, lastIndex);
        const pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
        assert('appmetrics-dash' in pkg.dependencies);
        done();
      });
    });
  });

  it('should add autoscaling and appmetrics', function(done) {
    const options = {
      destDir: sandboxDir,
      enableAutoScaling: true,
      enableAppMetrics: true,
    };
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      const defaultsServerfileContent = fs.readFileSync(path.join(
        fixturesDir, 'server.defaults.js'
      ), 'utf-8');
      const serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
      assert(defaultsServerfileContent === serverfileContent);
      const pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
      assert('bluemix-autoscaling-agent' in pkg.dependencies);
      assert('appmetrics-dash' in pkg.dependencies);
      done();
    });
  });
});
