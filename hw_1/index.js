const url = require('url');
const http = require('http');

const config = require('./config');


const httpServer = http.createServer(function(req, res) {
    doServer(req, res);
})

httpServer.listen(config.port, function() {
    console.log(`the server is listening on port ${config.port}`);
})

const doServer = function(req, res) {

    const parsedUrl = url.parse(req.url, true);

    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    const routeHandler = routes[trimmedPath] ? routes[trimmedPath] : routes['notfound'];

    const data = {
        hello: 'hi there :)'
    }

    routeHandler(data, function(statusCode, payload) {

        payload = typeof(payload) === 'object' ? payload : {};

        payload = JSON.stringify(payload);

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(statusCode);
        res.end(payload);
    })
}

const routes = {
    'hello': function(data, callback) {
        callback(200, data);
    },
    'notfound': function (data, callback) {
        callback(500);
    }
}