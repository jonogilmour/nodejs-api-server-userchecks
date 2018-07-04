/**
 * Helpers for constious tasks
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');
const https = require('https');
const querystring = require('querystring');

// Container for helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = rawString => (
  typeof rawString === 'string'
  && rawString.length
  ? crypto.createHmac('sha256', config.hashingSecret).update(rawString).digest('hex')
  : false
);

// Takes a string and returns the JSON rep. of that string, or false
helpers.parseJsonToObject = (str) => {
  try {
    return obj = JSON.parse(str);
  }
  catch(e) {
    return {};
  }
};

// Create random alphanumeric string of given length
helpers.createRandomString = length => {
  if(typeof length === 'number' && length) {
    // Define all characters that can go into a string
    const possible = 'abcdefghijklmnopqrstuvwxyz0123456789';
    // Return a random string from the possible characters of the given length
    return (a = (l, str) => l ? a(--l, str + possible[Math.floor(Math.random() * possible.length)]) : str)(length, '');
  }
  else {
    return false;
  }
};

// Send an SMS via Twilio
helpers.sendTwilioSms = (phone, message, callback) => {

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
    const payload = {
      From: config.twilio.fromPhone,
      To: `+61${phone}`,
      Body: message
    };

    // Stringify payload
    const stringPayload = querystring.stringify(payload);

    // Configure request
    const requestDetails = {
      protocol: 'https:',
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate request object
    const request = https.request(requestDetails, res => {
      // Grab status of sent request
      const status = res.statusCode;

      // Callback success if it went through
      if(status === 200 || status === 201) {
        callback(false);
      }
      else {
        callback(`Status code returned was ${status}`);
      }
    });

    // Bind to the error event so it doesn't bubble up
    request.on('error', callback);

    // Add payload to request
    request.write(stringPayload);

    // End request
    request.end();

  }
  else {
    callback('Given params are invalid');
  }

};


module.exports = helpers;
