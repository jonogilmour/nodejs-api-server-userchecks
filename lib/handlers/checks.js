/*
 * Checks handler
 */

// Dependencies
const _data = require('../data');
const createRandomString = require('../helpers').createRandomString;
const verifyToken = require('./tokens').verifyToken;
const config = require('../config');

class ChecksHandler {

  // Checks - post
  // Required: protocol, url, method, successCodes, timeoutSeconds
  // Optional: none
  post(data, callback) {

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
                const id = createRandomString(20);

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
                    _data.update(
                      'users',
                      userPhone,
                      updatedUserData,
                      err => (
                        !err
                        ? callback(200, checkObject)
                        : callback(500, { Error: 'Could not update user checks' })
                      )
                    );
                  }
                  else {
                    callback(500, { Error: 'Could not create new check' });
                  }
                })
              }
              else {
                callback(400, { Error: `Max checks reached (${config.maxChecks})` });
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
      callback(400, { Error: 'Missing required fields.' });
    }

  }

  // Checks - get
  // Required: id
  // Optional:
  get(data, callback) {

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
          verifyToken(
            token,
            checkData.userPhone,
            isValid => (
              isValid
              ? callback(200, checkData)
              : callback(403, { Error: 'Token in header is invalid' })
            )
          );
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

  // Checks - put
  // Required: id
  // Optional: protocol, url, method, successCodes, timeoutSeconds
  put(data, callback) {

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

            verifyToken(token, checkData.userPhone, isValid => {

              if(isValid) {
                let mergeCheckData = {};

                // Set any updates
                protocol && (mergeCheckData.protocol = protocol);
                url && (mergeCheckData.url = url);
                method && (mergeCheckData.method = method);
                successCodes && (mergeCheckData.successCodes = successCodes);
                timeoutSeconds && (mergeCheckData.timeoutSeconds = timeoutSeconds);

                const finalCheckData = {
                  ...checkData,
                  ...mergeCheckData
                };

                // Store the updates
                _data.update(
                  'checks',
                  id,
                  finalCheckData,
                  err => (
                    !err
                    ? callback(200)
                    : callback(500, { Error: 'Could not update check' })
                  )
                );

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

  }

  // Checks - delete
  // Required: id
  // Optional: none
  delete(data, callback) {

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
          verifyToken(token, checkData.userPhone, isValid => {

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
                          const checks = [
                            ...userData.checks.slice(0, checkIndex),
                            ...userData.checks.slice(checkIndex + 1)
                          ];
                          const finalUserData = {
                            ...userData,
                            checks
                          };

                          _data.update(
                            'users',
                            checkData.userPhone,
                            finalUserData,
                            err => (
                              !err
                              ? callback(200)
                              : callback(500, { Error: 'Could not update user' })
                            )
                          );
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

  }

}

module.exports = new ChecksHandler();
