var fs = require('fs');
var request = require('request');
var path = require('path');

var json = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../assets/data/gac-image-sources.json')
  )
);

json.index = 0;
increment();

function increment() {

  var uri = json[json.index];

  if (!uri) {
    console.log('Finished Downloading');
    return;
  }

  var name = uri.match(/\/[\w\d\-\_]*$/i)[0];

  download('http:' + uri, '../assets/images/gac/' + name + '.jpg', function() {
    console.log(`Downloaded ${uri} Successfully.`);
    increment();
  });

  json.index++;

}

function download(uri, filename, callback){
  request.head(uri, function(err, resp, body) {
    if (err) {
      console.log(err);
      return;
    }
    // console.log('content-type:', resp.headers['content-type']);
    // console.log('content-length:', resp.headers['content-length']);
    request(uri)
      .pipe(fs.createWriteStream(path.resolve(__dirname, filename)))
      .on('close', callback);
  });
}
