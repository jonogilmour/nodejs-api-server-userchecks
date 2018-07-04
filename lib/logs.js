/**
 * Stores and rotates logs and log files
 */

// Dependencies
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

// Container
var lib = {};

// Base directory of the logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a log file, create it if it doesn't exist
lib.append = function(fileName, str, callback) {
  // Open the file for appending
  fs.open(lib.baseDir+fileName+'.log', 'a', function(err, fileDescriptor) {
    if(!err && fileDescriptor) {
      fs.appendFile(fileDescriptor, str+'\n', function(err) {
        if(!err) {
          fs.close(fileDescriptor, function(err) {
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
lib.list = function(shouldIncludeCompressed, callback) {
  fs.readdir(lib.baseDir, function(err, data) {
    if(!err && data && data.length) {
      var trimmedFileNames = [];
      data.forEach(function(fileName) {
        // Add .log files
        if(fileName.match(/\.log$/)) {
          trimmedFileNames.push(fileName.replace(/\.log$/, ''));
        }

        // Add compressed files if needed (.gz)
        if(shouldIncludeCompressed && fileName.match(/\.gz\.b64$/)) {
          trimmedFileNames.push(fileName.replace(/\.gz\.b64$/, ''));
        }
      });
      callback(false, trimmedFileNames);
    }
    else {
      callback(err, data);
    }
  });
};

// Compress a log file to a .gz.b64 file in the same dir
lib.compress = function(logId, newFileId, callback) {
  var sourceFile = logId+'.log' ;
  var destFile = newFileId+'.gz.b64';

   // Read source file
   fs.readFile(lib.baseDir+sourceFile, 'utf8', function(err, inputString) {
     if(!err && inputString && inputString) {
       // Compress the data using zlib gzip
       zlib.gzip(inputString, function(err, buffer) {
         if(!err && buffer) {
           // Send the data to a new file
           fs.open(lib.baseDir+destFile, 'wx', function(err, fileDescriptor) {
             if(!err && fileDescriptor) {
               // Write the destination file
               fs.writeFile(fileDescriptor, buffer.toString('base64'), function(err) {
                 if(!err) {
                   // Close destination file
                   fs.close(fileDescriptor, function(err) {
                     if(!err) {
                       callback(false);
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
     else {
       callback(err);
     }
   });
};

// Decompress a log file from .gz.b64 to string
lib.decompress = function(fileID, callback) {
  var fileName = fileID+'.gz.b64';
  fs.readFile(lib.baseDir+fileName, 'utf8', function(err, fileData) {
    if(!err && fileData) {
      // Decompress data
      // Create buffer from file data
      var inputBuffer = Buffer.from(fileData, 'base64');
      zlib.unzip(inputBuffer, function(err, outputBuffer) {
        if(!err && outputBuffer) {
          var str = outputBuffer.toString();
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
lib.truncate = function(logId, callback) {
  fs.truncate(lib.baseDir+logId+'.log', 0, function(err) {
    if(!err) {
      callback(false);
    }
    else {
      callback(err);
    }
  });
};

module.exports = lib;
