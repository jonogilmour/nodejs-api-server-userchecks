/*
 * Primary API file
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const data = require('./lib/data');

data.read('checks', '2q62k151g4h02nggdzyt', (...args) => console.log(...args));

// Declare the app
const app = {};

// Init
app.init = () => {
  // Start server
  server.init();

  // Start workers
  workers.init();
};

// Execute
app.init();

module.exports = app;
