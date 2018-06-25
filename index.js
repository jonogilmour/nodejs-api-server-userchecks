/*
 * Primary API file
 *
 */

// Dependencies
var http = require('http');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;

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

  // Get the payload if present
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  req.on('end', function() {
    buffer += decoder.end();

    // Send the request to the handler, otherwise send to not_found
    var chosenHandler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound;

    // construct data object to send to handler
    var data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method' : method,
      'headers' : headers,
      'payload' : buffer
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, function(statusCode, payload){
      // Default statuscode 200
      statusCode = typeof statusCode ==='number' ? statusCode : 200;

      // Default payload empty object
      payload = typeof payload === 'object' ? payload : {};

      // Convert payload to string
      var payloadString = JSON.stringify(payload);

      // return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      console.log('Returning this response: ', statusCode, payloadString);
    });

  });
});

// Start the server and listen on port 3000
server.listen(3000, function() {
  console.log('Server is listening on port 3000');
});

// Define the handlers
var handlers = {};

// Sample handler
handlers.sample = function(data, callback) {
  // Callback a http status code and a payload object
  callback(406, {'name' : 'My name sample handler'});
};

// Not found handler
handlers.notFound = function(data, callback) {
  callback(404);
};

// Define a request router
var router = {
  'sample' : handlers.sample
};
