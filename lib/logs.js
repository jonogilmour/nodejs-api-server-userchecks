/*
 * Stores and rotates logs and log files
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class Logs {
  constructor() {
    // Base directory of the logs folder
    this.baseDir = path.join(__dirname, '/../.logs/');
  }

  // Append a string to a log file, create it if it doesn't exist
  append(fileName, str, callback) {
    // Check if the basedir exists
    fs.access(this.baseDir, fs.constants.F_OK, err => {
      // Open the file for appending
      const createLogFile = err => {
        if(!err) {
          fs.open(`${this.baseDir}${fileName}.log`, 'a', (err, fileDescriptor) => {

            if(!err && fileDescriptor) {
              fs.appendFile(fileDescriptor, `${str}\n`, err => {

                if(!err) {
                  fs.close(
                    fileDescriptor,
                    err => (
                      !err
                      ? callback(false)
                      : callback('Error closing log file.')
                    )
                  );
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
        }
        else {
          callback('Could not create basedir');
        }
      };

      if(err) {
        // Base dir doesn't exist, create it
        fs.mkdir(this.baseDir, null, createLogFile);
      }
      else {
        createLogFile(false);
      }
    });
  }

  // List all logs, optionally including compressed logs
  list(shouldIncludeCompressed, callback) {

    fs.readdir(this.baseDir, (err, data) => {

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

  }

  // Compress a log file to a .gz.b64 file in the same dir
  compress(logId, newFileId, callback) {
    const sourceFile = `${logId}.log`;
    const destFile = `${newFileId}.gz.b64`;

    // Read source file
    fs.readFile(`${this.baseDir}${sourceFile}`, 'utf8', (err, inputString) => {

     if(!err && inputString && inputString) {
        // Compress the data using zlib gzip
        zlib.gzip(inputString, (err, buffer) => {

        if(!err && buffer) {
          // Send the data to a new file
          fs.open(`${this.baseDir}${destFile}`, 'wx', (err, fileDescriptor) => {

            if(!err && fileDescriptor) {
              // Write the destination file
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => {
                if(!err) {
                  // Close destination file
                  fs.close(
                    fileDescriptor,
                    err => (
                      !err
                      ? callback(false)
                      : callback(err)
                    )
                  );
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
  }

  // Decompress a log file from .gz.b64 to string
  decompress(fileID, callback) {
    const fileName = `${fileID}.gz.b64`;
    fs.readFile(`${this.baseDir}${fileName}`, 'utf8', (err, fileData) => {

      if(!err && fileData) {
        // Create buffer from file data
        const inputBuffer = Buffer.from(fileData, 'base64');

        // Decompress data
        zlib.unzip(
          inputBuffer,
          (err, outputBuffer) => (
            (!err && outputBuffer)
            ? callback(false, outputBuffer.toString())
            : callback(err)
          )
        );
      }
      else {
        callback(err);
      }

    });
  }

  // Truncate a log file
  truncate(logId, callback) {
    fs.truncate(this.baseDir+logId+'.log', 0, (err) => !err ? callback(false) : callback(err));
  }

}

module.exports = new Logs();
