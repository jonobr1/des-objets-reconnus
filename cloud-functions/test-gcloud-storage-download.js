var fs = require('fs');
var path = require('path');
var { Storage } = require('@google-cloud/storage');
var storage = new Storage();
var vision = require('@google-cloud/vision').v1p1beta1;

var file = storage.bucket('cerveau').file('la-poubelle/le-chateau-des-pyrenees-rene-magritte.jpg');

file.download(function(err, resp) {
  if (err) {
    console.log('error', err);
  } else {
    console.log('buffer', resp);
  }
});
