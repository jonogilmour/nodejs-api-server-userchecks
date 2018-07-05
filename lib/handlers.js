/**
 * Request Handlers
 */

// Dependencies
const users = require('./handlers/users');
const tokens = require('./handlers/tokens');
const checks = require('./handlers/checks');

class Handlers {

  // Users handler
  users(data, callback) {
    ['post', 'get', 'put', 'delete'].includes(data.method)
    ? users[data.method](data, callback)
    : callback(405);
  }

  // Tokens handler
  tokens(data, callback) {
    ['post', 'get', 'put', 'delete'].includes(data.method)
    ? tokens[data.method](data, callback)
    : callback(405);
  }

  // Checks handler
  checks(data, callback) {
    ['post', 'get', 'put', 'delete'].includes(data.method)
    ? checks[data.method](data, callback)
    : callback(405);
  }

  // Ping handler
  ping(data, callback) {
    callback(200);
  }

  // Not found handler
  notFound(data, callback) {
    callback(404);
  }
}

module.exports = new Handlers();
