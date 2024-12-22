import { Server } from 'socket.io';

export function initializeSocket(server) {
  const io = new Server(server, {
    connectionStateRecovery: {},
  });

  io.on('connection', async (socket) => {

    socket.on('test', (data, callback) => {
      callback({ status: 'ok', message: 'success' });
    });

  })
}

