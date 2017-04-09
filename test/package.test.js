// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: generator-loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

var path = require('path');
var assert = require('assert');
var lbBM = require(path.resolve(__dirname, '..'));

describe('loopback-bluemix', function() {
  it('should export cf', function() {
    assert('cf' in lbBM);
  });

  it('should export ds', function() {
    assert('ds' in lbBM);
  });

  it('should export addDefaultServices', function() {
    assert('addDefaultServices' in lbBM);
  });

  it('should export generateBluemixFiles', function() {
    assert('generateBluemixFiles' in lbBM);
  });

  it('should export templatesDir', function() {
    assert('templatesDir' in lbBM);
  });
});
