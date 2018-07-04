/**
 * Background worker tasks
 */

// Dependencies
var path = require('path');
var fs = require('fs');
var _data = require('./data');
var https = require('https');
var http = require('http');
var helpers = require('./helpers');
var url = require('url');
var _logs = require('./logs');

// Worker object
var workers = {};

// Execute all checks
workers.gatherAllChecks = function() {
  // Gather all checks
  _data.list('checks', function(err, checks) {
    if(!err && checks && checks.length > 0) {
      checks.forEach(function(check) {
        // Read in the check
        _data.read('checks', check, function(err, checkData) {
          if(!err && checkData) {
            // Pass the data to a check validator
            workers.validateCheckData(checkData);
          }
          else {
            console.log('Error reading data for one check');
          }
        });
      });
    }
    else {
      console.log('Error: no checks to process');
    }
  });
};

// Sanity checking the check data
workers.validateCheckData = function(checkData) {
  checkData =
    typeof checkData === 'object'
    && checkData !== null
    ? checkData
    : {};

  checkData.id =
    typeof checkData.id === 'string'
    && checkData.id.length === 20
    ? checkData.id
    : false;

  checkData.userPhone =
    typeof checkData.userPhone === 'string'
    && checkData.userPhone.length === 10
    ? checkData.userPhone
    : false;

  checkData.protocol =
    typeof checkData.protocol === 'string'
    && ['https', 'http'].indexOf(checkData.protocol) !== -1
    ? checkData.protocol
    : false;

  checkData.url =
    typeof checkData.url === 'string'
    && checkData.url.length > 0
    ? checkData.url
    : false;

  checkData.method =
    typeof checkData.method === 'string'
    && ['post', 'get', 'put', 'delete'].indexOf(checkData.method) !== -1
    ? checkData.method
    : false;

  checkData.successCodes =
    typeof checkData.successCodes === 'object'
    && checkData.successCodes instanceof Array
    && checkData.successCodes.length > 0
    ? checkData.successCodes
    : false;

  checkData.timeoutSeconds =
    typeof checkData.timeoutSeconds === 'number'
    && checkData.timeoutSeconds % 1 === 0
    && checkData.timeoutSeconds > 0
    && checkData.timeoutSeconds <= 5
    ? checkData.timeoutSeconds
    : 5;

  // Set keys that may not be set if this is a new check
  checkData.state =
    typeof checkData.state === 'string'
    && ['up', 'down'].indexOf(checkData.state) !== -1
    ? checkData.state
    : 'down';

  checkData.lastChecked =
    typeof checkData.lastChecked === 'number'
    && checkData.lastChecked > 0
    ? checkData.lastChecked
    : false;

  // If all checks pass, pass all data to the next step
  if(
    checkData.id &&
    checkData.userPhone &&
    checkData.protocol &&
    checkData.url &&
    checkData.method &&
    checkData.successCodes
  ) {
    workers.performCheck(checkData);
  }
  else {
    console.log('Error: Malformed check is missing one or more keys, skipping.');
  }
};

// Perform the check, sending checkdata and outcome to the next step
workers.performCheck = function(checkData) {
  // Prepare initial outcome
  var checkOutcome = {
    'error' : false,
    'responseCode' : false
  };

  // Mark the outcome as 'not sent'
  var outcomeSent = false;

  // Parse hostname and path out of original check data
  var parsedUrl = url.parse(checkData.protocol+'://'+checkData.url, true);
  var hostName = parsedUrl.hostname;
  var path = parsedUrl.path; // using path and not pathname because the query string is needed

  // Construct request
  var requestDetails = {
    'protocol' : checkData.protocol+':',
    'hostname' : hostName,
    'method' : checkData.method.toUpperCase(),
    'path' : path,
    'timeout' : checkData.timeoutSeconds * 1000
  };

  // Perform request using http or https
  var _moduleToUse = checkData.protocol === 'http' ? http : https;
  var req = _moduleToUse.request(requestDetails, function(res) {
    // Grab the status
    var status = res.statusCode;

    // Update the check and pass the data along
    checkOutcome.responseCode = status;
    if(!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to error so it doesn't get thrown
  req.on('error', function(err) {
    // Update the checkoutcome and pass along
    checkOutcome.error = {
      'error' : true,
      'value' : err
    };
    if(!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to timeout
  req.on('timeout', function(err) {
    // Update the checkoutcome and pass along
    checkOutcome.error = {
      'error' : true,
      'value' : 'timeout'
    };
    if(!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // End the request
  req.end();
};

// Process the check outcome and update check data, then trigger alert (only if this is a subsequent check, not an initial one)
workers.processCheckOutcome = function(checkData, checkOutcome) {
  // Decide if the check is up or down
  var state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    checkData.successCodes.indexOf(checkOutcome.responseCode) > -1
    ? 'up'
    : 'down';

  // Decide if we should alert
  // (only alert if a previous check has happened, AND the status has changed from up to down or vice versa)
  // We should only alert if the check's status has changed
  var shouldAlert =
    checkData.lastChecked
    && checkData.state !== state
    ? true
    : false;

  // Log outcome of check
  var timeOfCheck = Date.now();
  workers.log(checkData, checkOutcome, state, shouldAlert, timeOfCheck);

  // Update the checkdata and save it
  checkData.lastChecked = Date.now();
  checkData.state = state;

  // Persist to disk
  _data.update('checks', checkData.id, checkData, function(err) {
    if(!err) {
      // Send the checkdata to next step
      if(shouldAlert) {
        workers.alertUserToStatusChange(checkData);
      }
      else {
        console.log('Check is unchanged');
      }
    }
    else {
      console.log('Error: Could not save updated check data');
    }
  });
};

// Send an alert to a user that their check has changed state
workers.alertUserToStatusChange = function(checkData) {
  var message = 'Alert: Your check for '+checkData.method.toUpperCase()+' '+checkData.protocol+'://'+checkData.url+' is currently '+checkData.state;
  helpers.sendTwilioSms(checkData.userPhone, message, function(err) {
    if(!err) {
      console.log('Success: User was alerted to status change: ', message);
    }
    else {
      console.log('Error: Could not send alert to user: ', message);
    }
  });
};

// Log to log file
workers.log = function(checkData, checkOutcome, state, shouldAlert, timeOfCheck) {
  // Package log data to JSON
  var logData = {
    'check' : checkData,
    'outcome' : checkOutcome,
    'state' : state,
    'alert' : shouldAlert,
    'time' : timeOfCheck,
  };

  // Convert to string
  var logString = JSON.stringify(logData);

  // Form log file name
  var logFileName = checkData.id;

  // Write to (append) to file
  _logs.append(logFileName, logString, function(err) {
    if(!err) {
      console.log("Logged to file.");
    }
    else {
      console.log("Logging failed.");
    }
  });
};

// Timer to execute workers once per minute
workers.loop = function() {
  setInterval(function() {
    workers.gatherAllChecks();
  }, 1000 * 5);
};

// Rotates the log files by compressing and renaming
workers.rotateLogs = function() {
  // List all non-compressed log files
  _logs.list(false, function(err, logs) {
    if(!err && logs && logs.length) {
      logs.forEach(function(logFileName) {
        // Compress data to a different file
        var logId = logFileName.replace(/\.log$/, '');
        var newFileId = logId + '-' + Date.now();
        _logs.compress(logId, newFileId, function(err) {
          if(!err) {
            // Truncate the log file
            _logs.truncate(logId, function(err) {
              if(!err) {
                console.log('Success truncating log file.');
              }
              else {
                console.log('Error truncating log file.');
              }
            });
          }
          else {
            console.log('Error compressing one log file.');
          }
        });
      });
    }
    else {
      console.log('Error could not find logs to rotate');
    }
  });
};

// Rotates logs once per day
workers.logRotationLoop = function() {
  setInterval(function() {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

// Init workers
workers.init = function() {
  // Execute all checks straight away
  workers.gatherAllChecks();

  // Loop through checks continuously
  workers.loop();

  // Compress all logs immediately
  workers.rotateLogs();

  // Call compression loop so logs will be compressed later
  workers.logRotationLoop();
};

module.exports = workers;
