/*
 * Primary API file
 *
 */

// Dependencies
var server = require('./lib/server');
var workers = require('./lib/workers');

// Declare the app
var app = {};

// Init
app.init = function() {
  // Start server
  server.init();

  // Start workers
  workers.init();
};

// Execute
app.init();

module.exports = app;
