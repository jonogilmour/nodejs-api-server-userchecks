/*
 * Users handler
 */

// Dependencies
const _data = require('../data');
const verifyToken = require('./tokens').verifyToken;
const helpers = require('../helpers');

class UsersHandler {

  // Users - post
  // Requires: first, last, phone, pw, tosAgreement
  // Optional: none
  post(data, callback) {
    // Check all fields are present
    const firstName =
      typeof data.payload.firstName === 'string'
      && data.payload.firstName.trim().length
      ? data.payload.firstName.trim()
      : false;

    const lastName =
      typeof data.payload.lastName === 'string'
      && data.payload.lastName.trim().length
      ? data.payload.lastName.trim()
      : false;

    const phone =
      typeof data.payload.phone === 'string'
      && data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

    const password =
      typeof data.payload.password === 'string'
      && data.payload.password.trim().length
      ? data.payload.password.trim()
      : false;

    const tosAgreement =
      typeof data.payload.tosAgreement === 'boolean'
      && data.payload.tosAgreement === true
      ? true
      : false;

    if(firstName && lastName && phone && password && tosAgreement) {
      // Ensure user doesnt already exist
      _data.read('users', phone, (err, data) => {
        if(err) {
          // Hash the password
          const hashedPassword = helpers.hash(password);

          // Create user obj
          if(hashedPassword) {
            const userObj = {
              firstName,
              lastName,
              phone,
              hashedPassword,
              tosAgreement: true,
            };

            // Store the user
            _data.create('users', phone, userObj, err => {
              if(!err) {
                callback(200);
              }
              else {
                console.log(err);
                callback(500, { Error: 'Could not create new user'} );
              }
            });
          }
          else {
            callback(500, { Error: 'Couldn\'t hash user\'s password.' });
          }
        }
        else {
          callback(400, { Error: 'User with phone number already exists' });
        }
      });
    }
    else {
      callback(400, { Error: 'Missing required fields' });
    }
  }

  // Users - get
  // Required: phone
  // Optional: none
  get(data, callback) {
    // Check phone number is valid
    const phone =
      typeof data.queryStringObject.phone === 'string'
      && data.queryStringObject.phone.trim().length === 10
      ? data.queryStringObject.phone.trim()
      : false;

    if(phone) {
      // Get token from headers
      const token =
        typeof data.headers.token === 'string'
        ? data.headers.token
        : false;

      // Verify the token is valid for the user's phone number
      verifyToken(token, phone, isValid => {
        if(isValid) {
          // Lookup user
          _data.read('users', phone, (err, data) => {
            if(!err && data) {
              // Remove hashed password first
              const {hashedPassword, ...cleanData} = data;
              callback(200, cleanData);
            }
            else {
              callback(404);
            }
          });
        }
        else {
          callback(403, { Error: 'Token in header is invalid' });
        }
      });
    }
    else {
      callback(400, { Error: 'Missing required field.' });
    }
  }

  // Users - put
  // Required: phone
  // Optional: firstname, lastname, password (needs at least one)
  put(data, callback) {
    // Check fro required field(s)
    const phone =
      typeof data.payload.phone === 'string'
      && data.payload.phone.trim().length === 10
      ? data.payload.phone.trim()
      : false;

    // Check for optional fields
    const firstName =
      typeof data.payload.firstName === 'string'
      && data.payload.firstName.trim().length
      ? data.payload.firstName.trim()
      : false;

    const lastName =
      typeof data.payload.lastName === 'string'
      && data.payload.lastName.trim().length
      ? data.payload.lastName.trim()
      : false;

    const password =
      typeof data.payload.password === 'string'
      && data.payload.password.trim().length
      ? data.payload.password.trim()
      : false;

    // Ensure phone is valid
    if(phone) {
      // Error if nothing is sent to update
      if(firstName || lastName || password) {
        // Get token from headers
        const token =
          typeof data.headers.token === 'string'
          ? data.headers.token
          : false;

        // Verify the token is valid for the user's phone number
        verifyToken(token, phone, isValid => {
          if(isValid) {
            _data.read('users', phone, (err, userData) => {
              if(!err && userData) {
                // Update fields as necessary
                if(firstName) {
                  userData = {
                    ...userData,
                    firstName
                  };
                }
                if(lastName) {
                  userData = {
                    ...userData,
                    lastName
                  };
                }
                if(password) {
                  userData = {
                    ...userData,
                    hashedPassword: helpers.hash(password)
                  };
                }

                // Store updates
                _data.update(
                  'users',
                  phone,
                  userData,
                  err => (
                    !err
                    ? callback(200)
                    : callback(500, { Error: 'Couldn\'t update the user' })
                  )
                );
              }
              else {
                callback(400, { Error: 'The specified user doesn\'t exist' });
              }
            });
          }
          else {
            callback(403, { Error: 'Token in header is invalid' });
          }
        });
      }
      else {
        callback(400, { Error: 'No fields sent to update.' });
      }
    }
    else {
      callback(400, { Error: 'Missing required field.' });
    }
  }

  // Users - delete
  // Required: phone
  // Optional: none
  delete(data, callback) {
    // Check for required field(s)
    const phone =
      typeof data.queryStringObject.phone === 'string'
      && data.queryStringObject.phone.trim().length === 10
      ? data.queryStringObject.phone.trim()
      : false;

    // Ensure phone is valid
    if(phone) {
      // Get token from headers
      const token =
        typeof data.headers.token === 'string'
        ? data.headers.token
        : false;

      // Verify the token is valid for the user's phone number
      verifyToken(token, phone, isValid => {
        if(isValid) {
          // Get the user checks
          _data.read('users', phone, (err, userData) => {
            if(!err && userData) {
              const userChecks =
                typeof userData.checks === 'object'
                && userData.checks instanceof Array
                && userData.checks.length
                ? userData.checks
                : [false];

              if(userChecks) {
                // Delete each check associated with this user
                const checksToDelete = userChecks.length;
                const isError = false;
                userChecks.forEach(checkId => {
                  if(!isError) {
                    _data.delete('checks', checkId, err => {
                      checksToDelete--;
                      if(!err) {
                        if(checksToDelete === 0) {
                          // Delete the user now
                          _data.delete(
                            'users',
                            phone,
                            err => (
                              !err
                              ? callback(200)
                              : callback(500, { Error: 'Could not delete specified user'})
                            )
                          );
                        }
                      }
                      else {
                        isError = true;
                        callback(500, { Error: 'Could not delete check for user'});
                      }
                    });
                  }
                });
              }
              else {
                _data.delete(
                  'users',
                  phone,
                  err => (
                    !err
                    ? callback(200)
                    : callback(500, { Error: 'Could not delete specified user'})
                  )
                );
              }
            }
            else {
              callback(400, { Error: 'Could not find specified user'});
            }
          });
        }
        else {
          callback(403, { Error: 'Token in header is invalid' });
        }
      });
    }
    else {
      callback(400, { Error: 'Missing required field.' });
    }
  }

}

module.exports = new UsersHandler();
