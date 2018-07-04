/**
 * Request Handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Define the handlers
const handlers = {};

// Users handler
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method)) {
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
handlers._users.post = (data, callback) => {
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
};

// Users - get
// Required: phone
// Optional: none
handlers._users.get = (data, callback) => {
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
    handlers._tokens.verifyToken(token, phone, isValid => {
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
};

// Users - put
// Required: phone
// Optional: firstname, lastname, password (needs at least one)
handlers._users.put = (data, callback) => {
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
      handlers._tokens.verifyToken(token, phone, isValid => {
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
              _data.update('users', phone, userData, err => {
                if(!err) {
                  callback(200);
                }
                else {
                  console.log(err);
                  callback(500, { Error: 'Couldn\'t update the user' });
                }
              });
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
};

// Users - delete
// Required: phone
// Optional: none
handlers._users.delete = (data, callback) => {
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
    handlers._tokens.verifyToken(token, phone, isValid => {
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
                        _data.delete('users', phone, err => {
                          if(!err) {
                            callback(200);
                          }
                          else {
                            callback(500, { Error: 'Could not delete specified user'});
                          }
                        });
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
              _data.delete('users', phone, err => {
                if(!err) {
                  callback(200);
                }
                else {
                  callback(500, { Error: 'Could not delete specified user'});
                }
              });
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
};

// Tokens handler
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method)) {
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
handlers._tokens.post = (data, callback) => {
  // Check fro required field(s)
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

  if(phone && password) {
    // Lookup matching user
    _data.read('users', phone, (err, userData) => {
      if(!err && userData) {
        // Hash the sent password
        const hashedPassword = helpers.hash(password);
        if(hashedPassword === userData.hashedPassword) {
          // If valid create a new random token, set expiration 1 hour in the future
          const id = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone,
            id,
            expires
          };

          // Store the token
          _data.create('tokens', id, tokenObject, err => {
            if(!err) {
              callback(200, tokenObject);
            }
            else {
              callback(500, { Error: 'Couldn\'t create new token' });
            }
          })
        }
        else {
          callback(400, { Error: 'Incorrect password' });
        }
      }
      else {
        callback(400, { Error: 'Couldn\'t find user' });
      }
    })
  }
  else {
    callback(400, { Error: 'Missing required fields' });
  }
}

// Tokens - get
// Required: id
// Opetional: none
handlers._tokens.get = (data, callback) => {
  // Check id is valid
  const id =
    typeof data.queryStringObject.id === 'string'
    && data.queryStringObject.id.trim().length === 20
    ? data.queryStringObject.id.trim()
    : false;

  if(id) {
    // Lookup token
    _data.read('tokens', id, (err, tokenData) => {
      if(!err && tokenData) {
        callback(200, tokenData);
      }
      else {
        callback(404);
      }
    });
  }
  else {
    callback(400, { Error: 'Missing required field.' });
  }
}

// Tokens - put
// Required: id, extend
// Optional: none
handlers._tokens.put = (data, callback) => {
  const id =
    typeof data.payload.id === 'string'
    && data.payload.id.trim().length === 20
    ? data.payload.id.trim()
    : false;

  const extend = data.payload.extend === true;

  if(id && extend) {
    // Look up the token
    _data.read('tokens', id, (err, tokenData) => {
      if(!err && tokenData) {
        // Check token is not expired
        if(tokenData.expires > Date.now()) {

          // Create a new expiry time
          tokenData = {
            ...tokenData,
            expires: Date.now() + 1000 * 60 * 60
          };

          // Update the token
          _data.update('tokens', id, tokenData, err => {
            if(!err) {
              callback(200);
            }
            else {
              callback(500, { Error: 'Could not update token' });
            }
          });
        }
        else {
          callback(400, { Error: 'Token expired' });
        }
      }
      else {
        callback(400, { Error: 'Provided token not found' });
      }
    });
  }
  else {
    callback(400, { Error: 'Invalid required fields' });
  }
};

// Tokens - delete
// Required: id
// Optional: none
handlers._tokens.delete = (data, callback) => {
  // Check for required field(s)
  const id =
    typeof data.queryStringObject.id === 'string'
    && data.queryStringObject.id.trim().length
    ? data.queryStringObject.id.trim()
    : false;

  // Ensure id is valid
  if(id) {
    _data.read('tokens', id, (err, data) => {
      if(!err && data) {
        _data.delete('tokens', id, err => {
          if(!err) {
            callback(200);
          }
          else {
            callback(500, { Error: 'Could not delete specified token'});
          }
        });
      }
      else {
        callback(400, { Error: 'Could not find specified token' });
      }
    });
  }
  else {
    callback(400, { Error: 'Missing required field.' });
  }
};

// Verify user is authorised to change a given token
handlers._tokens.verifyToken = (tokenId, phone, callback) => {
  // Lookup token`
  _data.read('tokens', tokenId, (err, tokenData) => {
    if(!err && tokenData) {
      // Check token matches user and is not expired
      if(tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      }
      else {
        callback(false);
      }
    }
    else {
      callback(false);
    }
  })
};

// Checks
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if(acceptableMethods.includes(data.method)) {
    handlers._checks[data.method](data, callback);
  }
  else {
    callback(405);
  }
};


// Checks container
handlers._checks = {};

// Checks - post
// Required: protocol, url, method, successCodes, timeoutSeconds
// Optional: none
handlers._checks.post = (data, callback) => {
  // Validate inputs
  const protocol =
    typeof data.payload.protocol === 'string'
    && ['https', 'http'].includes(data.payload.protocol)
    ? data.payload.protocol
    : false;

  const url =
    typeof data.payload.url === 'string'
    && data.payload.url.trim().length
    ? data.payload.url
    : false;

  const method =
    typeof data.payload.method === 'string'
    && ['post', 'get', 'put', 'delete'].includes(data.payload.method)
    ? data.payload.method
    : false;

  const successCodes =
    typeof data.payload.successCodes === 'object'
    && data.payload.successCodes instanceof Array
    && data.payload.successCodes.length
    ? data.payload.successCodes
    : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds === 'number'
    && data.payload.timeoutSeconds % 1 === 0
    && data.payload.timeoutSeconds >= 1
    && data.payload.timeoutSeconds <= 5
    ? data.payload.timeoutSeconds
    : false;

  if(protocol && url && method && successCodes && timeoutSeconds) {
    // Get token from the headers
    const token =
      typeof data.headers.token === 'string'
      ? data.headers.token
      : false;

    // Lookup user by reading the token
    _data.read('tokens', token, (err, tokenData) => {
      if(!err && tokenData) {
        const userPhone = tokenData.phone;

        // Lookup user
        _data.read('users', userPhone, (err, userData) => {
          if(!err && userData) {
            const userChecks =
              typeof userData.checks === 'object'
              && userData.checks instanceof Array
              ? userData.checks
              : [];

            if(userChecks.length < config.maxChecks) {
              // Create random ID for check
              const id = helpers.createRandomString(20);

              // Create check object
              const checkObject = {
                id,
                userPhone,
                protocol,
                url,
                method,
                successCodes,
                timeoutSeconds
              };

              // Save the check
              _data.create('checks', id, checkObject, (err) => {
                if(!err) {
                  const updatedUserData = {
                    ...userData,
                    checks: [
                      ...userChecks,
                      id
                    ]
                  };

                  // Save the new user data
                  _data.update('users', userPhone, updatedUserData, (err) => {
                    if(!err) {
                      // Return data about the new check
                      callback(200, checkObject);
                    }
                    else {
                      callback(500, { Error: 'Could not update user checks' });
                    }
                  });
                }
                else {
                  callback(500, { Error: 'Could not create new check' });
                }
              })
            }
            else {
              callback(400, { Error: 'Max checks reached ('+config.maxChecks+')' });
            }
          }
          else {
            callback(403);
          }
        });
      }
      else {
        callback(403);
      }
    });
  }
  else {
    callback(400, { Error: 'Missing required fields.'} );
  }
};

// Checks - get
// Required: id
// Optional:
handlers._checks.get = (data, callback) => {

  // Check id is valid
  const id =
    typeof data.queryStringObject.id === 'string'
    && data.queryStringObject.id.trim().length === 20
    ? data.queryStringObject.id.trim()
    : false;

  if(id) {

    // Lookup check
    _data.read('checks', id, (err, checkData) => {
      if(!err && checkData) {

        // Get token from headers
        const token =
          typeof data.headers.token === 'string'
          ? data.headers.token
          : false;

        // Verify the token is valid for the user's phone number, which is in the check object
        handlers._tokens.verifyToken(token, checkData.userPhone, isValid => {

          if(isValid) {
            callback(200, checkData);
          }
          else {
            callback(403, { Error: 'Token in header is invalid' });
          }

        });

      }
      else {
        callback(404);
      }
    });
  }
  else {
    callback(400, { Error: 'Missing required field.' });
  }

};

// Checks - put
// Required: id
// Optional: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = (data, callback) => {

  // Check id is valid
  const id =
    typeof data.payload.id === 'string'
    && data.payload.id.trim().length === 20
    ? data.payload.id.trim()
    : false;

  // Check optional fields
  const protocol =
    typeof data.payload.protocol === 'string'
    && ['https', 'http'].includes(data.payload.protocol)
    ? data.payload.protocol
    : false;

  const url =
    typeof data.payload.url === 'string'
    && data.payload.url.trim().length
    ? data.payload.url
    : false;

  const method =
    typeof data.payload.method === 'string'
    && ['post', 'get', 'put', 'delete'].includes(data.payload.method)
    ? data.payload.method
    : false;

  const successCodes =
    typeof data.payload.successCodes === 'object'
    && data.payload.successCodes instanceof Array
    && data.payload.successCodes.length
    ? data.payload.successCodes
    : false;

  const timeoutSeconds =
    typeof data.payload.timeoutSeconds === 'number'
    && data.payload.timeoutSeconds % 1 === 0
    && data.payload.timeoutSeconds >= 1
    && data.payload.timeoutSeconds <= 5
    ? data.payload.timeoutSeconds
    : false;

  if(id) {

    // Ensure at least one optional field is provided
    if(protocol || url || method || successCodes || timeoutSeconds) {

      // Look up the check
      _data.read('checks', id, (err, checkData) => {

        if(!err && checkData) {

          // Get token from headers
          const token =
            typeof data.headers.token === 'string'
            ? data.headers.token
            : false;

          handlers._tokens.verifyToken(token, checkData.userPhone, isValid => {

            if(isValid) {

              // Set any updates
              if(protocol) {
                checkData = {
                  ...checkData,
                  protocol
                };
              }
              if(url) {
                checkData = {
                  ...checkData,
                  url
                };
              }
              if(method) {
                checkData = {
                  ...checkData,
                  method
                };
              }
              if(successCodes) {
                checkData = {
                  ...checkData,
                  successCodes
                };
              }
              if(timeoutSeconds) {
                checkData = {
                  ...checkData,
                  timeoutSeconds
                };
              }

              // Store the updates
              _data.update('checks', id, checkData, err => {

                if(!err) {
                  callback(200);
                }
                else {
                  callback(500, { Error: 'Could not update check' })
                }

              });

            }
            else {
              callback(403, { Error: 'Token in header is invalid' });
            }

          });
        }
        else {
          callback(400, { Error: 'Check ID did not exist' });
        }
      });
    }
    else {
      callback(400, { Error: 'Missing at least one set field.' });
    }
  }
  else {
    callback(400, { Error: 'Missing required field.' });
  }

};

// Checks - delete
// Required: id
// Optional: none
handlers._checks.delete = (data, callback) => {

  // Check id is valid
  const id =
    typeof data.queryStringObject.id === 'string'
    && data.queryStringObject.id.trim().length === 20
    ? data.queryStringObject.id.trim()
    : false;

  if(id) {

    _data.read('checks', id, (err, checkData) => {

      if(!err && checkData) {

        // Get token from headers
        const token =
          typeof data.headers.token === 'string'
          ? data.headers.token
          : false;

        // Verify the token
        handlers._tokens.verifyToken(token, checkData.userPhone, isValid => {

          if(isValid) {
            // Delete the check
            _data.delete('checks', id, err => {

              if(!err) {
                // Delete the check id from the user's checks array
                _data.read('users', checkData.userPhone, (err, userData) => {

                  if(!err && userData) {
                    if(typeof userData.checks === 'object' && userData.checks instanceof Array) {

                      const checkIndex = userData.checks.indexOf(id);
                      if(checkIndex > -1) {
                        const checks = [...userData.checks.slice(0, checkIndex), ...userData.checks.slice(checkIndex + 1)];
                        userData = {
                          ...userData,
                          checks
                        };

                        _data.update('users', checkData.userPhone, userData, err => {
                          if(!err) {
                            callback(200);
                          }
                          else {
                            callback(500, { Error: 'Could not update user' });
                          }
                        });
                      }
                      else {
                        callback(500, { Error: 'Could not find check id in the given user' });
                      }
                    }
                    else {
                      callback(500, { Error: 'Could not find checks for the given user' });
                    }
                  }
                  else {
                    callback(500, { Error: 'Could not find the user for the check' });
                  }
                });

              }
              else {
                callback(500, { Error: 'Could not delete the check' });
              }
            });
          }
          else {
            callback(403);
          }
        });
      }
      else {
        callback(400, { Error: 'Check ID did not exist' });
      }
    });

  }
  else {
    callback(400, { Error: 'Missing required field.' });
  }

};


// Ping handler
handlers.ping = (data, callback) => {
  callback(200);
}

// Not found handler
handlers.notFound = (data, callback) => {
  callback(404);
};

module.exports = handlers;
