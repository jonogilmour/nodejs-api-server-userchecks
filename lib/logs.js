/**
 * Stores and rotates logs and log files
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Container
const lib = {};

// Base directory of the logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a log file, create it if it doesn't exist
lib.append = (fileName, str, callback) => {
  // Open the file for appending
  fs.open(`${lib.baseDir}${fileName}.log`, 'a', (err, fileDescriptor) => {

    if(!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, `${str}\n`, err => {

        if(!err) {
          fs.close(fileDescriptor, err => {
            if(!err) {
              callback(false);
            }
            else {
              callback('Error closing log file.');
            }
          });
        }
        else {
          callback('Error appending to log file.');
        }

      });
    }
    else {
      callback('Could not open log file for appending');
    }

  });
};

// List all logs, optionally including compressed logs
lib.list = (shouldIncludeCompressed, callback) => {

  fs.readdir(lib.baseDir, (err, data) => {
    if(!err && data && data.length) {
      const trimmedFileNames = data.reduce((aggr, fileName) => {
        // Add .log files
        if(fileName.match(/\.log$/)) {
          return [...aggr, fileName.replace(/\.log$/, '')];
        }
        else if(shouldIncludeCompressed && fileName.match(/\.gz\.b64$/)) {
          return [...aggr, fileName.replace(/\.gz\.b64$/, '')];
        }
        return aggr;
      }, []);
      callback(false, trimmedFileNames);
    }
    else {
      callback(err, data);
    }
  });

};

// Compress a log file to a .gz.b64 file in the same dir
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destFile = `${newFileId}.gz.b64`;

  // Read source file
  fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', (err, inputString) => {

   if(!err && inputString && inputString) {
      // Compress the data using zlib gzip
      zlib.gzip(inputString, (err, buffer) => {

      if(!err && buffer) {
        // Send the data to a new file
        fs.open(`${lib.baseDir}${destFile}`, 'wx', (err, fileDescriptor) => {

          if(!err && fileDescriptor) {
            // Write the destination file
            fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
              if(!err) {
                // Close destination file
                fs.close(fileDescriptor, err => !err ? callback(false) : callback(err));
              }
              else {
                callback(err);
              }
            });
          }
          else {
            callback(err);
          }

        });
       }
       else {
         callback(err);
       }

      });
    }
    else {
      callback(err);
    }

  });
};

// Decompress a log file from .gz.b64 to string
lib.decompress = (fileID, callback) => {
  const fileName = `${fileID}.gz.b64`;
  fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (err, fileData) => {
    if(!err && fileData) {
      // Decompress data
      // Create buffer from file data
      const inputBuffer = Buffer.from(fileData, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if(!err && outputBuffer) {
          const str = outputBuffer.toString();
          callback(false, str);
        }
        callback(err);
      });
    }
    else {
      callback(err);
    }
  });
};

// Truncate a log file
lib.truncate = (logId, callback) => {
  fs.truncate(lib.baseDir+logId+'.log', 0, (err) => !err ? callback(false) : callback(err));
};

module.exports = lib;
