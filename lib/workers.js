/**
 * Background worker tasks
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');
const util = require('util');
const debug = util.debuglog('workers');

// Worker object
const workers = {};

// Execute all checks
workers.gatherAllChecks = () => {
  // Gather all checks
  _data.list('checks', (err, checks) => {

    if(!err && checks && checks.length > 0) {

      checks.forEach(check => {
        // Read in the check
        _data.read('checks', check, (err, checkData) => {
          if(!err && checkData) {
            // Pass the data to a check validator
            workers.validateCheckData(checkData);
          }
          else {
            debug('Error reading data for one check');
          }
        });
      });

    }
    else {
      debug('Error: no checks to process');
    }

  });
};

// Sanity checking the check data
workers.validateCheckData = checkData => {

  const finalCheckData =
    typeof checkData === 'object'
    && checkData !== null
    ? {
      id:             typeof checkData.id === 'string' && checkData.id.length === 20 ? checkData.id : false,
      userPhone:      typeof checkData.userPhone === 'string' && checkData.userPhone.length === 10 ? checkData.userPhone : false,
      protocol:       typeof checkData.protocol === 'string' && ['https', 'http'].indexOf(checkData.protocol) !== -1 ? checkData.protocol : false,
      url:            typeof checkData.url === 'string' && checkData.url.length > 0 ? checkData.url : false,
      method:         typeof checkData.method === 'string' && ['post', 'get', 'put', 'delete'].indexOf(checkData.method) !== -1 ? checkData.method : false,
      successCodes:   typeof checkData.successCodes === 'object' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false,
      timeoutSeconds: typeof checkData.timeoutSeconds === 'number' && checkData.timeoutSeconds % 1 === 0 && checkData.timeoutSeconds > 0 && checkData.timeoutSeconds <= 5 ?  checkData.timeoutSeconds : 5,
      state:          typeof checkData.state === 'string' && ['up', 'down'].indexOf(checkData.state) !== -1 ? checkData.state : 'down',
      lastChecked:    typeof checkData.lastChecked === 'number' && checkData.lastChecked > 0 ? checkData.lastChecked : false
    }
    : {};

  // If all checks pass, pass all data to the next step
  if(
    finalCheckData.id &&
    finalCheckData.userPhone &&
    finalCheckData.protocol &&
    finalCheckData.url &&
    finalCheckData.method &&
    finalCheckData.successCodes
  ) {
    workers.performCheck(finalCheckData);
  }
  else {
    debug('Error: Malformed check is missing one or more keys, skipping.');
  }

};

// Perform the check, sending checkdata and outcome to the next step
workers.performCheck = checkData => {

  // Parse hostname and path out of original check data
  const parsedUrl = url.parse(`${checkData.protocol}://${checkData.url}`, true);
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path; // using path and not pathname because the query string is needed

  // Construct request
  const requestDetails = {
    protocol: `${checkData.protocol}:`,
    hostname: hostName,
    method: checkData.method.toUpperCase(),
    path: path,
    timeout: checkData.timeoutSeconds * 1000
  };

  // Perform request using http or https
  const _moduleToUse =
    checkData.protocol === 'http'
    ? http
    : https;

  // Mark the outcome as 'not sent'
  let outcomeSent = false;

  // Prepare initial outcome
  let checkOutcome = {
    error: false,
    responseCode: false
  };

  const req = _moduleToUse.request(requestDetails, res => {
    // Grab the status
    const status = res.statusCode;

    // Update the check and pass the data along
    checkOutcome = {
      ...checkOutcome,
      responseCode: status
    }
    if(!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Handles errors or timeouts for the request
  const handleRequestError = value => err => {
    // Update the checkoutcome and pass along
    checkOutcome = {
      ...checkOutcome,
      error: {
        error: true,
        value: value ? value : err
      }
    };
    if(!outcomeSent) {
      workers.processCheckOutcome(checkData, checkOutcome);
      outcomeSent = true;
    }
  };

  // Bind to error so it doesn't get thrown
  req.on('error', handleRequestError(false));

  // Bind to timeout
  req.on('timeout', handleRequestError('timeout'));

  // End the request
  req.end();
};

// Process the check outcome and update check data, then trigger alert (only if this is a subsequent check, not an initial one)
workers.processCheckOutcome = (checkData, checkOutcome) => {
  // Decide if the check is up or down
  const state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    checkData.successCodes.includes(checkOutcome.responseCode)
    ? 'up'
    : 'down';

  // Decide if we should alert
  // (only alert if a previous check has happened, AND the status has changed from up to down or vice versa)
  // We should only alert if the check's status has changed
  const shouldAlert = checkData.lastChecked && checkData.state !== state;

  // Log outcome of check
  const timeOfCheck = Date.now();
  workers.log(checkData, checkOutcome, state, shouldAlert, timeOfCheck);

  // Update the checkdata and save it
  const finalCheckData = {
    ...checkData,
    lastChecked: Date.now(),
    state
  };

  // Persist to disk
  _data.update('checks', finalCheckData.id, finalCheckData, err => {
    if(!err) {
      // Send the checkdata to next step
      if(shouldAlert) {
        workers.alertUserToStatusChange(finalCheckData);
      }
      else {
        debug('Check is unchanged');
      }
    }
    else {
      debug('Error: Could not save updated check data');
    }
  });
};

// Send an alert to a user that their check has changed state
workers.alertUserToStatusChange = checkData => {
  const message = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://{checkData.url} is currently ${checkData.state}`;
  helpers.sendTwilioSms(
    checkData.userPhone,
    message,
    err => (
      !err
      ? debug('Success: User was alerted to status change: ', message)
      : debug('Error: Could not send alert to user: ', message)
    )
  );
};

// Log to log file
workers.log = function(check, outcome, state, alert, time) {
  // Package log data to JSON
  const logData = {
    check,
    outcome,
    state,
    alert,
    time,
  };

  // Convert to string
  const logString = JSON.stringify(logData);

  // Form log file name
  const logFileName = check.id;

  // Write to (append) to file
  _logs.append(
    logFileName,
    logString,
    err => (
      !err
      ? debug("Logged to file.")
      : debug("Logging failed.")
    )
  );
};

// Timer to execute workers once per minute
workers.loop = () => {
  setInterval(workers.gatherAllChecks, 1000 * 60);
};

// Rotates the log files by compressing and renaming
workers.rotateLogs = () => {

  // List all non-compressed log files
  _logs.list(false, (err, logs) => {

    if(!err && logs && logs.length) {
      logs.forEach(logFileName => {

        const logId = logFileName.replace(/\.log$/, '');
        const newFileId = logId + '-' + Date.now();

        // Compress data to a different file
        _logs.compress(logId, newFileId, err => {

          if(!err) {
            // Truncate the log file
            _logs.truncate(logId, err => {
              if(!err) {
                debug('Success truncating log file.');
              }
              else {
                debug('Error truncating log file.');
              }
            });
          }
          else {
            debug('Error compressing one log file.');
          }

        });
      });
    }
    else {
      debug('Error could not find logs to rotate');
    }

  });

};

// Rotates logs once per day
workers.logRotationLoop = () => {
  setInterval(workers.rotateLogs, 1000 * 60 * 60 * 24);
};

// Init workers
workers.init = () => {

  // Send to console in yellow
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

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
