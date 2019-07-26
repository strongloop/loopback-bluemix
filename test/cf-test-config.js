// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

/* global describe, beforeEach, it */
'use strict';

const path = require('path');
const fs = require('fs');
const fixtures = {
  service: {
    supported: 'cloudantFixture',
    unsupported: 'rabbitFixture',
    nondata: 'nonDataFixture',
  },
};

const provisionedFilePath = path.join(__dirname, 'fixtures', 'Bluemix', '.provisioned');

if (!fs.existsSync(provisionedFilePath)) {
  const msg = 'Bluemix fixtures not created. ' +
            'Execute `npm run create-bm-fixtures` to create them.';
  console.log(msg);
  process.exit();
} else {
  const appName = fs.readFileSync(provisionedFilePath, 'utf8');
  fixtures.app = appName;
}

module.exports = fixtures;
