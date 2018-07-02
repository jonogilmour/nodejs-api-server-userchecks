/**
 * Helpers for various tasks
 */

// Dependencies
var crypto = require('crypto');
var config = require('./config');
var https = require('https');
var querystring = require('querystring');

// Container for helpers
var helpers = {};

// Create a SHA256 hash
helpers.hash = function(rawString) {
  if(typeof rawString === 'string' && rawString.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(rawString).digest('hex');
  }
  return false;
};

// Takes a string and returns the JSON rep. of that string, or false
helpers.parseJsonToObject = function(str) {
  try {
    var obj = JSON.parse(str);
    return obj;
  }
  catch(e) {
    return {};
  }
};

// Create random alphanumeric string of given length
helpers.createRandomString = function(length) {
  length =
    typeof length === 'number'
    && length > 0
    ? length
    : false;
  if(length) {
    // Define all characters that can go into a string
    var possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

    // Base string
    var str = '';

    for(var i = 0; i < length; i++) {
      // Append a random character
      str += possible.charAt(
        Math.floor(
          Math.random() * possible.length
        )
      );
    }
    return str;
  }
  else {
    return false;
  }
};

// Send an SMS via Twilio
helpers.sendTwilioSms = function(phone, message, callback) {
  // Validate params
  phone =
    typeof phone === 'string'
    && phone.trim().length === 10
    ? phone.trim()
    : false;
  message =
    typeof message === 'string'
    && message.trim().length <= 1600
    ? message.trim()
    : false;

  if(phone && message) {
    // Config the request payload
    var payload = {
      'From' : config.twilio.fromPhone,
      'To' : '+61'+phone,
      'Body' : message
    };

    // Stringify payload
    var stringPayload = querystring.stringify(payload);

    // Config request
    var requestDetails = {
      'protocol' : 'https:',
      'hostname' : 'api.twilio.com',
      'method' : 'POST',
      'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
      'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
      'headers' : {
        'Content-Type' : 'application/x-www-form-urlencoded',
        'Content-Length' : Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate request object
    var request = https.request(requestDetails, function(res) {
      // Grab status of sent request
      var status = res.statusCode;

      // Callback success if it went through
      if(status === 200 || status === 201) {
        callback(false);
      }
      else {
        callback('Status code returned was '+status);
      }
    });

    // Bind to the error event so it doesn't bubble up
    request.on('error', function(err) {
      callback(err);
    });

    // Add payload to request
    request.write(stringPayload);

    // End request
    request.end();
  }
  else {
    callback('Given params are invalid');
  }
}


module.exports = helpers;
