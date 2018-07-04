/*
 * Primary API file
 *
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');
const _data = require('./lib/data');

_data.list('tokens', (err, data) => {
  console.log(err, data);
});
_data.create('test', 'test1.txt', 'This is a test', (err) => {
  if(!err) {
    _data.read('test', 'test1.txt', (err, data) => {
      if(!err && data) {
        _data.delete('test', 'test1.txt', (err) => {
          console.log('delete', err);
        });
      }
      console.log('read', err, data);
    })
  }
  console.log('create', err);
});

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
