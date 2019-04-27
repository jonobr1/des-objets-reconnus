var fs = require('fs');
var path = require('path');
var { Storage } = require('@google-cloud/storage');
var storage = new Storage();
var vision = require('@google-cloud/vision').v1;

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
  // var filePath = `gs://${object.bucket}/${object.name}`;
  var filePath = `https://storage.googleapis.com/${object.bucket}/${object.name}`;

  console.log(`Analyzing ${file.name} from ${filePath}.`);

  var client = new vision.ImageAnnotatorClient();

  return client
    .annotateImage({
      features: [
        { type: 'LANDMARK_DETECTION' },
        { type: 'FACE_DETECTION' },
        { type: 'OBJECT_LOCALIZATION' },
        { type: 'LOGO_DETECTION' },
        { type: 'LABEL_DETECTION' },
        { type: 'DOCUMENT_TEXT_DETECTION' },
        { type: 'SAFE_SEARCH_DETECTION' },
        { type: 'IMAGE_PROPERTIES' },
        { type: 'CROP_HINTS' },
        { type: 'WEB_DETECTION' }
      ],
      image: {
        source: {
          filename: filePath
        }
      }
    })
    .then(function(resp) {
      var filename = file.name.replace(/\.jpe?g$/i, '.json');
      console.log(`Successfully analyzed ${file.name}.`, resp);
      return saveToCloudStorage(file, filename, resp);
    })
    .catch(function(err) {
      console.error(`Failed to analyze ${file.name}.`, err);
      return Promise.reject(err);
    });

};

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
