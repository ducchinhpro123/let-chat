"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configServer = configServer;
var http_1 = require("http");
var config_socket_js_1 = require("../socket/config_socket.js");
var debug_1 = require("debug");
function configServer(app) {
    /**
     * Setup socket.io
     */
    var port = normalizePort(process.env.PORT || '3000');
    app.set('port', port);
    var server = (0, http_1.createServer)(app);
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
    (0, config_socket_js_1.initializeSocket)(server);
    function normalizePort(val) {
        var port = parseInt(val, 10);
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
    function onError(error) {
        if (error.syscall !== 'listen') {
            throw error;
        }
        var bind = typeof port === 'string'
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
        console.log("Server listing on port: ".concat(port));
        var addr = server.address();
        var bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;
        (0, debug_1.default)('Listening on ' + bind);
    }
}
