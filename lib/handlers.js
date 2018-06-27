/**
 * Request Handlers
 */

// Dependencies
var _data = require('./data');
var helpers = require('./helpers');

// Define the handlers
var handlers = {};

// Users handler
handlers.users = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  }
  else {
    callback(405);
  }
};

// Container for the users submethods
handlers._users = {};

// Users - post
// Requires: first, last, phone, pw, tosAgreement
// Optional: none
handlers._users.post = function(data, callback) {
  // Check all fields are present
  var firstName = typeof data.payload.firstName === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;

  var lastName = typeof data.payload.lastName === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;

  var phone = typeof data.payload.phone === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;

  var password = typeof data.payload.password === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

  var tosAgreement = typeof data.payload.tosAgreement === 'boolean' && data.payload.tosAgreement === true ? true : false;

  if(firstName && lastName && phone && password && tosAgreement) {
    // Ensure user doesnt already exist
    _data.read('users', phone, function(err, data) {
      if(err) {
        // Hash the password
        var hashedPassword = helpers.hash(password);

        // Create user obj
        if(hashedPassword) {
          var userObj = {
            'firstName' : firstName,
            'lastName' : lastName,
            'phone' : phone,
            'hashedPassword' : hashedPassword,
            'tosAgreement' : true,
          };

          // Store the user
          _data.create('users', phone, userObj, function(err) {
            if(!err) {
              callback(200);
            }
            else {
              console.log(err);
              callback(500, { 'Error' : 'Could not create new user'} );
            }
          });
        }
        else {
          callback(500, { 'Error' : 'Couldn\'t hash user\'s password.' });
        }
      }
      else {
        callback(400, { 'Error' : 'User with phone number already exists' });
      }
    });
  }
  else {
    callback(400, { 'Error' : 'Missing required fields' });
  }
};

// Users - get
// Required: phone
// Optional: none
// @TODO only let auth'd users access their own object
handlers._users.get = function(data, callback) {
  // Check phone number is valid
  var phone =
    typeof data.queryStringObject.phone === 'string'
    && data.queryStringObject.phone.trim().length === 10
    ? data.queryStringObject.phone.trim()
    : false;

  if(phone) {
    // Lookup user
    _data.read('users', phone, function(err, data) {
      if(!err && data) {
        // Remove hashed password first
        delete data.hashedPassword;
        callback(200, data);
      }
      else {
        callback(404);
      }
    });
  }
  else {
    callback(400, { 'Error' : 'Missing required field.' });
  }
};

// Users - put
// Required: phone
// Optional: firstname, lastname, password (needs at least one)
// @TODO: auth first before a user can update
handlers._users.put = function(data, callback) {
  // Check fro required field(s)
  var phone =
    typeof data.payload.phone === 'string'
    && data.payload.phone.trim().length === 10
    ? data.payload.phone.trim()
    : false;

  // Check for optional fields
  var firstName =
    typeof data.payload.firstName === 'string'
    && data.payload.firstName.trim().length > 0
    ? data.payload.firstName.trim()
    : false;

  var lastName =
    typeof data.payload.lastName === 'string'
    && data.payload.lastName.trim().length > 0
    ? data.payload.lastName.trim()
    : false;

  var password =
    typeof data.payload.password === 'string'
    && data.payload.password.trim().length > 0
    ? data.payload.password.trim()
    : false;

  // Ensure phone is valid
  if(phone) {
    // Error if nothing is sent to update
    if(firstName || lastName || password) {
      _data.read('users', phone, function(err, userData) {
        if(!err && userData) {
          // Update fields as necessary
          if(firstName) {
            userData.firstName = firstName;
          }
          if(lastName) {
            userData.lastName = lastName;
          }
          if(password) {
            userData.hashedPassword = helpers.hash(password);
          }

          // Store updates
          _data.update('users', phone, userData, function(err) {
            if(!err) {
              callback(200);
            }
            else {
              console.log(err);
              callback(500, { 'Error' : 'Couldn\'t update the user' });
            }
          });
        }
        else {
          callback(400, { 'Error' : 'The specified user doesn\'t exist' });
        }
      });
    }
    else {
      callback(400, { 'Error' : 'No fields sent to update.' });
    }
  }
  else {
    callback(400, { 'Error' : 'Missing required field.' });
  }
};

// Users - delete
// Required: phone
// Optional: none
// @TODO only let auth'd users delete own user object
// @TODO clean up any associated data files for this user (eg. owned objects)
handlers._users.delete = function(data, callback) {
  // Check for required field(s)
  var phone =
    typeof data.queryStringObject.phone === 'string'
    && data.queryStringObject.phone.trim().length === 10
    ? data.queryStringObject.phone.trim()
    : false;

  // Ensure phone is valid
  if(phone) {
    _data.read('users', phone, function(err, data) {
      if(!err && data) {
        _data.delete('users', phone, function(err) {
          if(!err) {
            callback(200);
          }
          else {
            callback(500, { 'Error' : 'Could not delete specified user'});
          }
        });
      }
      else {
        callback(400, { 'Error' : 'Could not find specified user'});
      }
    });
  }
  else {
    callback(400, { 'Error' : 'Missing required field.' });
  }
};

// Tokens handler
handlers.tokens = function(data, callback) {
  var acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  }
  else {
    callback(405);
  }
};

// Create tokens handlers container
handlers._tokens = {};

// Tokens - post
// Required: phone, password
// Optional: none
handlers._tokens.post = function(data, callback) {
  // Check fro required field(s)
  var phone =
    typeof data.payload.phone === 'string'
    && data.payload.phone.trim().length === 10
    ? data.payload.phone.trim()
    : false;

  var password =
    typeof data.payload.password === 'string'
    && data.payload.password.trim().length > 0
    ? data.payload.password.trim()
    : false;

  if(phone && password) {
    // Lookup matching user
    _data.read('users', phone, function(err, userData) {
      if(!err && userData) {
        // Hash the sent password
        var hashedPassword = helpers.hash(password);
        if(hashedPassword === userData.hashedPassword) {
          // If valid create a new random token, set expiration 1 hour in the future
          var tokenId = helpers.createRandomString(20);
          var expires = Date.now() + 1000 * 60 * 60;
          var tokenObject = {
            'phone' : phone,
            'id' : tokenId,
            'expires' : expires
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, function(err) {
            if(!err) {
              callback(200, tokenObject);
            }
            else {
              callback(500, { 'Error' : 'Couldn\'t create new token' });
            }
          })
        }
        else {
          callback(400, { 'Error' : 'Incorrect password' });
        }
      }
      else {
        callback(400, { 'Error' : 'Couldn\'t find user' });
      }
    })
  }
  else {
    callback(400, { 'Error' : 'Missing required fields' });
  }
}

// Tokens - get
handlers._tokens.get = function(data, callback) {

}

// Tokens - put
handlers._tokens.put = function(data, callback) {

}

// Tokens - delete
handlers._tokens.delete = function(data, callback) {

}

// Ping handler
handlers.ping = function(data, callback) {
  callback(200);
}

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404);
};

module.exports = handlers;
