/*
Primary file for API
 */

const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const fs = require('fs');

const handlers = require('./lib/handlers')
const helpers = require('./lib/helpers')
const config = require('./lib/config');


// instantiate the http server
const httpServer = http.createServer(function(req, res) {
    unifiedServer(req, res);
});

// start the http server
httpServer.listen(config.httpPort, function() {
    console.log(`the server is listening on port ${config.httpPort}`)
});


// instantiate the https server
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
}
const httpsServer = https.createServer(httpsServerOptions, function(req, res) {
    unifiedServer(req, res);
});

// start the https server
httpsServer.listen(config.httpsPort, function() {
    console.log(`the server is listening on port ${config.httpsPort}`)
});


// all the sever logic for both the http and https server
const unifiedServer = function(req, res) {

    // get the url and parse it
    const parsedUrl = url.parse(req.url, true);

    // get the path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // get the query string as an object
    const queryStringObject = parsedUrl.query;

    // get the http method
    const method = req.method.toLowerCase();

    // get the headers as an object
    const headers = req.headers;

    // get the payload if there is any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    // handler the request data event fired whenever a new stream of data comes in
    req.on('data', function(data) {
        // append the new incoming data stream to the buffer data string
        buffer += decoder.write(data);
    });

    // handle when the stream of data has ended
    req.on('end', function() {

        buffer += decoder.end();

        // choose the handler this request should go to
        // if one is not found go to the not found handler
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // construct the data object to send to the handler
        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObject' : queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer),
        }

        chosenHandler(data, function(statusCode, payload) {
            // use the status code called back by the handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // user the payload called back by the handler, or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // convert the payload to a string
            const payloadString = JSON.stringify(payload)

            // return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // log the request path
            console.log(`returning this response: ${statusCode} ${payloadString}`);
        })

    })
}


// define a request router
const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens
}