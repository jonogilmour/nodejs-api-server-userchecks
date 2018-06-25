/*
 * Primary API file
 *
 */

// Dependencies
var http = require('http');
var url = require('url');

// The server should respond to all requests with a string
var server = http.createServer(function(req, res) {

  // Get the url and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get the url's path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  var queryStringObject = parsedUrl.query;

  // Get the http method
  var method = req.method.toLowerCase();

  // Get the headers as an object
  var headers = req.headers;

  // Send the response
  res.end('Hello world\n');

  // Log the request path
  console.log('Request received with headers',headers);
});

// Start the server and listen on port 3000
server.listen(3000, function() {
  console.log('Server is listening on port 3000');
});
