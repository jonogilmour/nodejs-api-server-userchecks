/*
 * Primary API file
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const logs = require('./lib/logs');


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
