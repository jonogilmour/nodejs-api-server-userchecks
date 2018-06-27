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

module.exports = helpers;