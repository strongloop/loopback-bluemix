// Copyright IBM Corp. 2014,2016. All Rights Reserved.
// Node module: generator-loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

var path = require('path');
var fs = require('fs');
var fixtures = {
  service: {
    supported: 'cloudantFixture',
    unsupported: 'rabbitFixture',
    nondata: 'nonDataFixture',
  },
};

var provisionedFilePath = path.join(__dirname, 'fixtures', 'Bluemix', '.provisioned');

if (!fs.existsSync(provisionedFilePath)) {
  var msg = 'Bluemix fixtures not created. ' +
            'Execute `npm run create-bm-fixtures` to create them.';
  console.log(msg);
  process.exit();
} else {
  var appName = fs.readFileSync(provisionedFilePath, 'utf8');
  fixtures.app = appName;
}

module.exports = fixtures;
