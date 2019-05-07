// Copyright IBM Corp. 2017. All Rights Reserved.
// Node module: loopback-bluemix
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var express = require('express');
var app = express();

app.get('/', function(req, res) {
  res.send('Hello');
});

var port = process.env.PORT || 3000
app.listen(port, function() {
  console.log('App started');
});
