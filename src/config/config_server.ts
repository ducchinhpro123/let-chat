import {createServer} from 'http';
import {initializeSocket} from '../socket/config_socket.js';
import express from 'express';
import debug from 'debug';

export function configServer(app: express.Application) {
  /**
   * Setup socket.io
   */
  const port = normalizePort(process.env.PORT || '3000');
  app.set('port', port);

  const server = createServer(app);

  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);

  initializeSocket(server);

  function normalizePort(val: string ) {
    const port = parseInt(val, 10);
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

  function onError(error: NodeJS.ErrnoException) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof port === 'string'
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
    console.log(`Server listing on port: ${port}`);
    var addr = server.address();
    var bind = typeof addr === 'string'
      ? 'pipe ' + addr
      : 'port ' + addr?.port;
    debug('Listening on ' + bind);
  }
}
