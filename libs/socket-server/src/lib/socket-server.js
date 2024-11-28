const { Server } = require('socket.io');
const http = require('http');

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.IO server is running');
});

// Create a Socket.IO server
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins, restrict this in production
  },
});

try {
  // Listen for connections
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Listen for an event from clients
    socket.on('MyBigEvent', (data) => {
      console.log('MyBigEvent triggered with data:', data);
      // Emit event to this specific client or all clients
      io.emit('MyBigEvent', data);
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
    });
  });
} catch (error) {
  console.log(error);
}

// Start the server
server.listen(3456, () => {
  console.log('Socket.IO server is listening on http://127.0.0.1:3456');
});
