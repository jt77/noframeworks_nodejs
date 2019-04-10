/*
Primary file for API
 */

const http = require('http');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;

// the server should respono to all requests with string
const server = http.createServer(function(req, res) {

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
            'payload': buffer,
        }

        chosenHandler(data, function(statusCode, payload) {
            // use the status code called back by the handler or default to 200
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // user the payload called back by the handler, or default to an empty object
            payload = typeof(payload) == 'object' ? payload : {};

            // convert the payload to a string
            const payloadString = JSON.stringify(payload)

            // return the response
            res.writeHead(statusCode);
            res.end(payloadString);

            // log the request path
            console.log(`returning this response: ${statusCode} ${payloadString}`);
        })

    })

});

// start the server, and have it listen on port 3000
server.listen(3000, function() {
    console.log('the server is listening on port 3000')
});

// define the handlers
const handlers = {
    // sample handler
    sample: function(data, callback) {
        // callback a http status code and a payload object
        callback(406, data);
    },
    // not found handler
    notFound: function(data, callback) {
        callback(404);
    }
};

// define a request router
const router = {
    'sample': handlers.sample
}