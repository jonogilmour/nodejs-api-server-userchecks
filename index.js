/*
 * Primary API file
 *
 */

// Dependencies
var http = require('http');

// The server should respond to all requests with a string
var server = http.createServer(function(req, res) {
  res.end('Hello world\n');
});

// Start the server and listen on port 3000
server.listen(3000, function() {
  console.log('Server is listening on port 3000');
});
