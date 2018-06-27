/**
 * Storing and editing data
 */

// Dependencies
var fs = require('fs');
var path = require('path');

// Container for the module
var lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = function(dir, file, data, callback) {
  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', function(err, fileDescriptor) {
    if(!err && fileDescriptor) {
      // Convert data to string
      var stringData = JSON.stringify(data);

      // Write and close file
      fs.writeFile(fileDescriptor, stringData, function(err) {
        if(!err) {
          fs.close(fileDescriptor, function(err) {
            if(!err) {
              callback(false);
            }
            else {
              callback('Error closing new file.')
            }
          })
        }
        else {
          callback('Error writing to new file.');
        }
      })
    }
    else {
      callback('Could not create new file.');
    }
  });
};

// Read data from file
lib.read = function(dir, file, callback) {
  fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf-8', function(err, data) {
    if(!err && data) {
      var parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    }
    else {
      callback(err, data);
    }
  })
};

// Update an existing file
lib.update = function(dir, file, data, callback) {
  // Open the file for writing
  fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', function(err, fileDescriptor) {
    if(!err && fileDescriptor) {
      // Convert data to string
      var stringData = JSON.stringify(data);

      // Truncate file contents
      fs.truncate(fileDescriptor, function(err) {
        if(!err) {
          // Write to and then close the file
          fs.writeFile(fileDescriptor, stringData, function(err) {
            if(!err) {
              fs.close(fileDescriptor, function(err) {
                if(!err) {
                  callback(false);
                }
                else {
                  callback('Error closing file.');
                }
              });
            }
            else {
              callback('Error writing to existing file.');
            }
          });
        }
        else {
          callback('Could not truncate file');
        }
      });
    }
    else {
      callback('Could not open the file for updating, please ensure it exists.');
    }
  });
};

// Delete a file
lib.delete = function(dir, file, callback) {
  // Unlink the file
  fs.unlink(lib.baseDir + dir + '/' + file + '.json', function(err) {
    if(!err) {
      callback(false);
    }
    else {
      callback('Trouble deleting file.');
    }
  })
};


module.exports = lib;
