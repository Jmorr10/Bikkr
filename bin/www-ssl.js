#!/usr/bin/env node

/**
 * Module dependencies.
 */

const app = require('../app');
const debug = require('debug')('Bikkr:server');
const https = require('https');
const fs = require('fs');
const socketIO = require('socket.io');
const socketEvents = require('./socket_listeners');

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '6000');
app.set('port', port);

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/jrmsoftworks.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/jrmsoftworks.com/fullchain.pem'),
};


/**
 * Create HTTP server.
 */

const server = https.createServer(options, app);
const io = socketIO(server, {
    cors: {
        origin: ["https://bikkr.jrmsoftworks.com", "https://www.bikkr.jrmsoftworks.com", "https://localhost:6000"]
    },
    pingTimeout: 1200000
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Set socket listeners
socketEvents(io);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    let port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}

module.exports = {
    server: server,
    sio: io
};