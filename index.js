/*
 * Primary API file
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const data = require('./lib/data');

data.create('testtest', 'test1', {a: 'abc'}, err => console.log(err));

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
