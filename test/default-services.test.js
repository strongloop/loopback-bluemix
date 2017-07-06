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
var fixturesDir = path.resolve(__dirname, 'fixtures');
var srcPackagefilePath = path.resolve(__dirname, 'fixtures', 'package.json');
var destPackagefilePath = path.join(sandboxDir, 'package.json');
var srcSeverfilePath = path.resolve(__dirname, '..', 'node_modules', 'loopback-workspace',
                      'templates', 'projects', 'empty-server', 'files',
                      'server', 'server.js');
var destSeverfilePath = path.join(sandboxDir, 'server', 'server.js');

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
    var options = {destDir: sandboxDir, enableAutoScaling: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      var autoscalingServerfileContent = fs.readFileSync(path.join(
                                        fixturesDir, 'server.autoscaling.js'), 'utf-8');
      var serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
      assert(autoscalingServerfileContent === serverfileContent);
      var pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
      assert('bluemix-autoscaling-agent' in pkg.dependencies);
      done();
    });
  });

  it('should add autoscaling only once', function(done) {
    var options = {destDir: sandboxDir, enableAutoScaling: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      var options = {destDir: sandboxDir, enableAutoScaling: true};
      lbBM.addDefaultServices(options, function(err) {
        assert(!err);
        var autoscalingServerfileContent = fs.readFileSync(path.join(
                                          fixturesDir, 'server.autoscaling.js'), 'utf-8');
        var serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
        var firstIndex = serverfileContent
                        .indexOf("require('bluemix-autoscaling-agent')");
        var lastIndex = serverfileContent
                        .lastIndexOf("require('bluemix-autoscaling-agent')");
        assert.equal(firstIndex, lastIndex);
        var pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
        assert('bluemix-autoscaling-agent' in pkg.dependencies);
        done();
      });
    });
  });

  it('should add appmetrics only', function(done) {
    var options = {destDir: sandboxDir, enableAppMetrics: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      var appmetricsServerfileContent = fs.readFileSync(path.join(
                                        fixturesDir, 'server.appmetrics.js'), 'utf-8');
      var serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
      assert(appmetricsServerfileContent === serverfileContent);
      var pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
      assert('appmetrics-dash' in pkg.dependencies);
      done();
    });
  });

  it('should add appmetrics only once', function(done) {
    var options = {destDir: sandboxDir, enableAppMetrics: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      var options = {destDir: sandboxDir, enableAppMetrics: true};
      lbBM.addDefaultServices(options, function(err) {
        assert(!err);
        var appmetricsServerfileContent = fs.readFileSync(path.join(
                                          fixturesDir, 'server.appmetrics.js'), 'utf-8');
        var serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
        var firstIndex = serverfileContent.indexOf("require('appmetrics-dash')");
        var lastIndex = serverfileContent.lastIndexOf("require('appmetrics-dash')");
        assert.equal(firstIndex, lastIndex);
        var pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
        assert('appmetrics-dash' in pkg.dependencies);
        done();
      });
    });
  });

  it('should add autoscaling and appmetrics', function(done) {
    var options = {destDir: sandboxDir, enableAutoScaling: true, enableAppMetrics: true};
    lbBM.addDefaultServices(options, function(err) {
      assert(!err);
      var defaultsServerfileContent = fs.readFileSync(path.join(
                                        fixturesDir, 'server.defaults.js'), 'utf-8');
      var serverfileContent = fs.readFileSync(destSeverfilePath, 'utf-8');
      assert(defaultsServerfileContent === serverfileContent);
      var pkg = JSON.parse(fs.readFileSync(destPackagefilePath));
      assert('bluemix-autoscaling-agent' in pkg.dependencies);
      assert('appmetrics-dash' in pkg.dependencies);
      done();
    });
  });
});
