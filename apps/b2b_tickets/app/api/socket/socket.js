import { Server } from 'socket.io';

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      socket.on('ticketUpdated', (ticket) => {
        socket.broadcast.emit('ticketUpdated', ticket);
      });
    });
  }
  res.end();
};

export default ioHandler;
