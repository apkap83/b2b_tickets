import { io } from 'socket.io-client';

// Create a connection to the Socket.IO server
const socket = io('http://127.0.0.1:3456');

// Emit event to the Socket.IO server
export function emitSocketEvent(eventName: any, data: any) {
  if (socket.connected) {
    socket.emit(eventName, data);
    console.log(`Event ${eventName} emitted`);
  } else {
    console.log('Socket is not connected');
  }
}

// Check the connection status
socket.on('connect', () => {
  console.log('Socket connected to server:', socket.id);
});

socket.on('connect_error', (err) => {
  console.log('Socket connection error:', err);
});

socket.on('reconnect', (attempt) => {
  console.log('Reconnected after', attempt, 'attempt(s)');
});
