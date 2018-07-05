/*
 * Server related tasks
 *
 */


// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

// Instantiate server object
const server = {};


// HTTP server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});


// HTTPS server
server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});


// All the server logic for http(s)
server.unifiedServer = (req, res) => {

  // Get the url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the url's path
  const trimmedPath = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the http method
  const method = req.method.toLowerCase();

  // Get the headers as an object
  const headers = req.headers;

  // Get the payload if present
  const decoder = new StringDecoder('utf-8');

  // Buffer to store chunks from stream (cannot be const)
  let buffer = '';
  req.on('data', data => {
    buffer += decoder.write(data);
  });
  req.on('end', () => {
    buffer += decoder.end();

    // Send the request to the handler, otherwise send to not_found
    const chosenHandler =
      typeof server.router[trimmedPath] !== 'undefined'
      ? server.router[trimmedPath]
      : handlers.notFound;

    // construct data object to send to handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    // Route the request to the handler specified in the router
    chosenHandler(data, (statusCode, payload) => {
      // Default statuscode 200
      const finalStatusCode =
        typeof statusCode ==='number'
        ? statusCode
        : 200;

      // Default payload empty object
      const finalPayload =
        typeof payload === 'object'
        ? payload
        : {};

      // Convert payload to string
      const payloadString = JSON.stringify(finalPayload);

      // return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(finalStatusCode);
      res.end(payloadString);

      // Print green if 200, else print red
      const logColour =
        finalStatusCode === 200
        ? '32'  // Green
        : '31'; // Red

      debug(`\x1b[${logColour}m%s\x1b[0m`, `${method.toUpperCase()} /${trimmedPath} ${finalStatusCode}`);
    });

  });

};


// Define a request router
server.router = {
  ping:    handlers.ping,
  users:   handlers.users,
  tokens:  handlers.tokens,
  checks:  handlers.checks
};


// Server startup
server.init = () => {
  // Start the HTTP server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `Server is listening on port ${config.httpPort}`);
  });

  // Start HTTPS server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `Server is listening on port ${config.httpsPort}`);
  });
};


module.exports = server;
