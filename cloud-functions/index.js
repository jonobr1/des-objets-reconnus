var fs = require('fs');
var path = require('path');
var { Storage } = require('@google-cloud/storage');
var storage = new Storage();
var vision = require('@google-cloud/vision').v1p1beta1;

var client = new vision.ImageAnnotatorClient();

exports.AnalyzeImage = function(event) {

  var object = event.data || event;

  // Exit if this is a deletion or a deploy event.
  if (object.resourceState === 'not_exists') {
    console.log('This is a deletion event.');
    return;
  } else if (!object.name) {
    console.log('This is a deploy event.');
    return;
  }

  // Only analyze jpeg files
  if (!(/\.jpe?g$/i.test(object.name))) {
    console.log('Object is not a jpg.');
    return;
  }

  var file = storage.bucket(object.bucket).file(object.name);
  var filePath = `gs://${object.bucket}/${object.name}`;

  console.log(`Downloading image from ${filePath}.`);

  function analyze(image) {

    console.log(`Analyzing ${file.name}.`);

    var options = {
      requests: [
        {
          features: [
            {
              maxResults: 50,
              type: 'LANDMARK_DETECTION'
            },
            {
              maxResults: 50,
              type: 'FACE_DETECTION'
            },
            {
              maxResults: 50,
              type: 'OBJECT_LOCALIZATION'
            },
            {
              maxResults: 50,
              type: 'LOGO_DETECTION'
            },
            {
              maxResults: 50,
              type: 'LABEL_DETECTION'
            },
            {
              maxResults: 50,
              type: 'DOCUMENT_TEXT_DETECTION'
            },
            {
              maxResults: 50,
              type: 'SAFE_SEARCH_DETECTION'
            },
            {
              maxResults: 50,
              type: 'IMAGE_PROPERTIES'
            },
            {
              maxResults: 50,
              type: 'CROP_HINTS'
            },
            {
              maxResults: 50,
              type: 'WEB_DETECTION'
            }
          ],
          image: {
            content: image.toString('utf8')
          },
          imageContext: {
            cropHintsParams: {
              aspectRatios: [
                0.8,
                1,
                1.2
              ]
            }
          }
        }
      ]
    };

    return client
      .annotateImage(options)
      .then(function(resp) {
        var filename = file.name.replace(/\.jpe?g$/i, '.json');
        console.log(`Successfully analyzed ${file.name}.`, resp);
        return saveToCloudStorage(file, filename, resp);
      })
      .catch(function(err) {
        console.error(`Failed to analyze ${file.name}.`, err);
        return Promise.reject(err);
      });

  }

  return download(file).then(analyze);

};

function download(file) {

  return new Promise(function(resolve, reject) {

    file.download(function(err, resp) {

      if (err) {
        reject(err);
      } else {
        resolve(resp);
      }

    });

  })
  .catch(function(err) {
    console.log(`Unable to download image ${file.name} into memory.`, err);
  });

}

function saveToCloudStorage(file, filename, data) {

  var tempLocalPath = `/tmp/${path.parse(filename).base}`;
  // TODO: May need to prefix storageURI with a path of directories.
  var storageURI = `${filename}`;

  return new Promise(function(resolve, reject) {

    fs.writeFile(tempLocalPath, JSON.stringify(data), 'utf8', written);

    function written(err, resp) {

      if (err) {
        reject(err);
      } else {
        resolve(resp.body);
      }

    }

  })
  .then(function(resp) {
    console.log(`Successfully wrote analysis JSON to ${tempLocalPath}.`);

    // Upload the Blurred image back into the bucket.
    return file.bucket
      .upload(tempLocalPath, { destination: storageURI, gzip: true })
      .catch(function(err) {
        console.error('Failed to upload JSON analysis.', err);
        return Promise.reject(err);
      })
      .then(function() {
        console.log(`Analysis JSON has been uploaded to ${storageURI}.`);

        // Delete the temporary file.
        return new Promise((resolve, reject) => {
          fs.unlink(tempLocalPath, function(err) {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });

  })
  .catch(function(err) {
    console.log('Failed to write JSON to local file', err);
    return Promise.reject(err);
  });

}
