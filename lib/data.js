/**
 * Storing and editing data
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module
const lib = {};

// Base directory of the data folder
lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if(!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Write and close file
      fs.writeFile(fileDescriptor, stringData, err => {
        if(!err) {
          fs.close(fileDescriptor, err => {
            if(!err) {
              callback(false);
            }
            else {
              callback('Error closing new file.')
            }
          });
        }
        else {
          callback('Error writing to new file.');
        }
      });
    }
    else {
      callback('Could not create new file.');
    }
  });
};

// Read data from file
lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', (err, data) => {
    if(!err && data) {
      callback(false, helpers.parseJsonToObject(data));
    }
    else {
      callback(err, data);
    }
  })
};

// Update an existing file
lib.update = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
    if(!err && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Truncate file contents
      fs.truncate(fileDescriptor, err => {
        if(!err) {
          // Write to and then close the file
          fs.writeFile(fileDescriptor, stringData, err => {
            if(!err) {
              fs.close(fileDescriptor, err => {
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
lib.delete = (dir, file, callback) => {
  // Unlink the file
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, err => {
    if(!err) {
      callback(false);
    }
    else {
      callback('Trouble deleting file.');
    }
  });
};

// List all items in a directory
lib.list = (dir, callback) => {
  const fullPath = `${lib.baseDir}${dir}/`;

  fs.readdir(fullPath, (err, fileList) => {
    if(!err && fileList && fileList.length) {
      // Trim each file extension
      const trimmedFileNames = fileList.map(x => x.replace(/\.json$/, ''));
      callback(false, trimmedFileNames);
    }
    else {
      callback(err, fileList);
    }
  });
};

module.exports = lib;
