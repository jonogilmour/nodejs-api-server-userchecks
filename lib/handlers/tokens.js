/*
 * Tokens handler
 */

// Dependencies
const _data = require('../data');
const helpers = require('../helpers');

class TokensHandler {

  // Tokens - post
  // Required: phone, password
  // Optional: none
  post(data, callback) {
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
  get(data, callback) {
    // Check id is valid
    const id =
      typeof data.queryStringObject.id === 'string'
      && data.queryStringObject.id.trim().length === 20
      ? data.queryStringObject.id.trim()
      : false;

    if(id) {
      // Lookup token
      _data.read(
        'tokens',
        id,
        (err, tokenData) => (
          !err && tokenData
          ? callback(200, tokenData)
          : callback(404)
        )
      );
    }
    else {
      callback(400, { Error: 'Missing required field.' });
    }
  }

  // Tokens - put
  // Required: id, extend
  // Optional: none
  put(data, callback) {
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
            _data.update(
              'tokens',
              id,
              tokenData,
              err => (
                !err
                ? callback(200)
                : callback(500, { Error: 'Could not update token' })
              )
            );
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
  }

  // Tokens - delete
  // Required: id
  // Optional: none
  delete(data, callback) {
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
          _data.delete(
            'tokens',
            id,
            err => (
              !err
              ? callback(200)
              : callback(500, { Error: 'Could not delete specified token'})
            )
          );
        }
        else {
          callback(400, { Error: 'Could not find specified token' });
        }
      });
    }
    else {
      callback(400, { Error: 'Missing required field.' });
    }
  }

  // Verify user is authorised to change a given token
  verifyToken(tokenId, phone, callback) {
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
    });
  }

}

module.exports = new TokensHandler();
