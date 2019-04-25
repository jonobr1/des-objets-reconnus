var fs = require('fs');
var request = require('request');
var path = require('path');

var data;
var filepath = '../assets/data/grand-palais.json';

fs.readFile(path.resolve(__dirname, filepath), function(err, resp) {

  if (err) {
    console.log('Error', err);
    return;
  }

  // Export out for use with other functions in our session.
  data = JSON.parse(resp);

  query();

});

function query() {

  var base = data.request.base;
  // var key = 'cfe34d0b82ed6cbb145a781937c2eaef84f94738e21853c7dd831d9e623bee3e';
  var key = data.request.key;
  var path = data.request.path;
  var query = data.request.query;
  var page = data.request.page;
  var perPage = data.request.perPage;

  var options = {
    url: [
      base,
      path,
      [
        ['?q', query].join('='),
        ['page', page].join('='),
        ['per_page', perPage].join('=')
      ].join('&')
    ].join('/'),
    headers: {
      Apikey: key
    }
  };

  request(options, route);

}

function route(err, resp) {

  if (err) {
    console.log('Error', err);
    return;
  }

  var json = JSON.parse(resp.body);
  var works = json.hits.hits;

  for (var i = 0; i < works.length; i++) {

    var work = works[i];
    var id = work._id;
    var source = work._source;

    index(id, source);

  }

  data.request.page++;

  save(function(err, resp) {

    if (err) {
      console.log('Error', err);
      return;
    }

    console.log('Added', works.length, 'URLs');

    // Repeat until done
    setTimeout(query, 1000);

  });

}

function index(id, source) {

  var ids = data.response.ids;
  var urls = data.response.urls;

  var images = source.images;
  var image = images[0];
  var uri;

  if (ids.indexOf(id) >= 0) {
    console.log('Skipping Duplicate:', id);
    return;
  }

  if ('large' in image) {
    uri = image.urls.large.url;
  } else {
    uri = image.urls.original;
  }

  ids.push(id);
  urls.push(uri);

}

function save(callback) {

  fs.writeFile(path.resolve(__dirname, filepath), JSON.stringify(data), 'utf8', callback);

}
