/**
 * Storing and editing data
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container for the module
const lib = {};

class DataLib {
  constructor() {
    // Base directory of the data folder
    this.baseDir = path.join(__dirname, '/../.data/');
  }

  // Create a new file in a given folder, filling it with the provided data
  create(dir, file, data, callback) {
    // Open the file for writing
    fs.open(`${this.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
      if(!err && fileDescriptor) {
        // Convert data to string
        const stringData = JSON.stringify(data);

        // Write and close file
        fs.writeFile(fileDescriptor, stringData, err => {
          if(!err) {
            fs.close(fileDescriptor, err => !err ? callback(false) : callback('Error closing new file.'));
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
  }

  // Read data from file
  read(dir, file, callback) {
    fs.readFile(
      `${this.baseDir}${dir}/${file}.json`, 'utf8',
      (err, data) => (
        !err && data
        ? callback(false, helpers.parseJsonToObject(data))
        : callback(err, data)
      )
    );
  }

  // Update an existing file
  update(dir, file, data, callback) {
    // Open the file for writing
    fs.open(
      `${this.baseDir}${dir}/${file}.json`,
      'r+',
      (err, fileDescriptor) => {

        if(!err && fileDescriptor) {
          // Convert data to string
          const stringData = JSON.stringify(data);

          // Truncate file contents
          fs.truncate(fileDescriptor, err => {
            if(!err) {
              // Write to and then close the file
              fs.writeFile(fileDescriptor, stringData, err => {
                if(!err) {
                  fs.close(fileDescriptor, err => !err ? callback(false) : callback('Error closing file.'));
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

      }
    ); // end open
  }

  // Delete a file
  delete(dir, file, callback) {
    // Unlink the file
    fs.unlink(
      `${this.baseDir}${dir}/${file}.json`,
      err => (
        !err
        ? callback(false)
        : callback('Trouble deleting file.')
      )
    );
  }

  // List all items in a directory
  list(dir, callback) {
    const fullPath = `${this.baseDir}${dir}/`;

    fs.readdir(
      fullPath,
      (err, fileList) => (
        !err
        && fileList
        && fileList.length
        ? callback( false, fileList.map(x => x.replace(/\.json$/, '')) ) // Trim each file extension
        : callback(err, fileList)
      )
    );
  }
}

module.exports = new DataLib();
