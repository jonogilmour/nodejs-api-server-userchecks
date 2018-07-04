/**
 * Server related tasks
 *
 */


// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
var helpers = require('./helpers');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

// Instantiate server object
var server = {};


// HTTP server
server.httpServer = http.createServer(function(req, res) {
  server.unifiedServer(req, res);
});


// HTTPS server
server.httpsServerOptions = {
  'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  'cert' : fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function(req, res) {
  server.unifiedServer(req, res);
});


// All the server logic for http(s)
server.unifiedServer = function(req, res) {

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
    var chosenHandler = typeof server.router[trimmedPath] !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // construct data object to send to handler
    var data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method' : method,
      'headers' : headers,
      'payload' : helpers.parseJsonToObject(buffer)
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

      // Print green if 200, else print red
      if(statusCode === 200) {
        debug('\x1b[32m%s\x1b[0m', method.toUpperCase()+ ' /'+trimmedPath+' '+statusCode);
      }
      else {
        debug('\x1b[31m%s\x1b[0m', method.toUpperCase()+ ' /'+trimmedPath+' '+statusCode);  
      }
    });

  });

};


// Define a request router
server.router = {
  'ping' : handlers.ping,
  'users' : handlers.users,
  'tokens' : handlers.tokens,
  'checks' : handlers.checks
};


// Server startup
server.init = function() {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, function() {
    console.log('\x1b[36m%s\x1b[0m', 'Server is listening on port '+config.httpPort);
  });

  // Start HTTPS server
  server.httpsServer.listen(config.httpsPort, function() {
    console.log('\x1b[35m%s\x1b[0m', 'Server is listening on port '+config.httpsPort);
  });
};


module.exports = server;
