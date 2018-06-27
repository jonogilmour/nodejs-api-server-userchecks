/**
 * Helpers for various tasks
 */

// Dependencies
var crypto = require('crypto');
var config = require('./config');

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

module.exports = helpers;
