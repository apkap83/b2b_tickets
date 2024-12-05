import { Server, Socket } from 'socket.io';
import * as http from 'http';
import { WebSocketMessage, WebSocketData } from './shared-models';
import cookie from 'cookie';
import dotenv from 'dotenv';
import logger from './logger';
import axios from 'axios';

// Load environment variables
dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

const PORT = process.env.PORT || 3456;
const CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || '*';
const SESSION_API_URL = process.env.NEXT_AUTH_SESSION_URL;
const DEBUG = process.env.DEBUG || '0';

console.log('DEBUG', DEBUG);
console.log('NODE_ENV', process.env.NODE_ENV || 'development');
console.log('PORT', PORT);
console.log('CORS_ORIGIN', CORS_ORIGIN);
console.log('SESSION_API_URL', SESSION_API_URL);
console.log(
  'NODE_TLS_REJECT_UNAUTHORIZED',
  process.env.NODE_TLS_REJECT_UNAUTHORIZED
);

const tokenNames = [
  '__Secure-next-auth.session-token',
  'next-auth.session-token',
];

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket.IO server is running');
});

// Create a Socket.IO server
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    // TODO Change Origin
    origin: CORS_ORIGIN,
    credentials: true,
  },
});

const validateSession = async (sessionToken: string) => {
  if (!SESSION_API_URL) {
    throw new Error('Session API URL is not defined');
  }

  // Determine the cookie name dynamically
  const cookieName =
    process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

  try {
    const response = await axios.get(SESSION_API_URL, {
      headers: {
        'Content-Type': 'application/json', // Add if required by the API
        Cookie: `${cookieName}=${sessionToken}`, // Dynamically use the correct cookie name
      },
      proxy: false, // Disable proxy usage
    });

    if (response.status !== 200) {
      throw new Error(
        `Session validation failed with status: ${response.status}`
      );
    }

    const session = (await response.data) as {
      user: { user_id: string; userName: string };
    };

    if (!session || !session.user) {
      throw new Error('Invalid session data');
    }

    return session;
  } catch (error) {
    logger.error('Error during session validation:', error);
    throw error;
  }
};

function getSessionToken(cookieString: string) {
  for (const tokenName of tokenNames) {
    const match = cookieString.match(new RegExp(`${tokenName}=([^;]+)`));
    if (match) {
      return match[1]; // Return the value of the matched token
    }
  }
  logger.error('No Session Token was found in Cookie');
  return null; // Return null if no token is found
}

// Middleware
io.use(async (socket, next) => {
  try {
    const rawCookies = socket.handshake.headers.cookie;

    if (!rawCookies || typeof rawCookies !== 'string') {
      logger.error('Authentication error: Invalid or missing cookies');
      return next(
        new Error('Authentication error: Invalid or missing cookies')
      );
    }

    const sessionToken = getSessionToken(rawCookies);

    if (!sessionToken) {
      logger.error('Authentication error: Session token missing');
      return next(new Error('Authentication error: Session token missing'));
    }

    // Proceed with session validation
    const session = await validateSession(sessionToken);
    if (!session || !session.user) {
      logger.error('Authentication error: Invalid session');
      return next(new Error('Authentication error: Invalid session'));
    }

    // Attach user to socket
    //@ts-ignore
    socket.user = session.user;
    logger.info(
      `Authenticated user: id: ${session.user.user_id}, userName: ${session.user.userName}`
    );

    next();
  } catch (error) {
    logger.error('Error during cookie parsing or session validation:', error);
    next(new Error('Authentication error'));
  }
});

// Variable to keep track of the number of connected users
let connectedUsers = 0;

// Listen for connections
io.on('connection', (socket: Socket) => {
  connectedUsers++;
  logger.info(
    //@ts-ignore
    `User connected: id: ${socket.user.user_id}, userName: ${socket.user.userName}`
  );
  logger.info(`Total connected users: ${connectedUsers}`);

  // Listen for events using the enum values and the WebSocketData type
  socket.on(
    WebSocketMessage.NEW_TICKET_CREATED,
    (data: WebSocketData[WebSocketMessage.NEW_TICKET_CREATED]) => {
      if (DEBUG)
        logger.info(
          `Event ${
            WebSocketMessage.NEW_TICKET_CREATED
          } triggered with data: ${JSON.stringify(data)}`
        );
      io.emit(WebSocketMessage.NEW_TICKET_CREATED, data);
    }
  );

  socket.on(
    WebSocketMessage.TICKET_CLOSED,
    (data: WebSocketData[WebSocketMessage.TICKET_CLOSED]) => {
      if (DEBUG)
        logger.info(
          `Event ${
            WebSocketMessage.TICKET_CLOSED
          } triggered with data: ${JSON.stringify(data)}`
        );
      io.emit(WebSocketMessage.TICKET_CLOSED, data);
    }
  );

  socket.on(
    WebSocketMessage.TICKET_CANCELED,
    (data: WebSocketData[WebSocketMessage.TICKET_CANCELED]) => {
      if (DEBUG)
        logger.info(
          `Event ${
            WebSocketMessage.TICKET_CANCELED
          } triggered with data: ${JSON.stringify(data)}`
        );
      io.emit(WebSocketMessage.TICKET_CANCELED, data);
    }
  );

  socket.on(
    WebSocketMessage.TICKET_ESCALATED,
    (data: WebSocketData[WebSocketMessage.TICKET_ESCALATED]) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.TICKET_ESCALATED,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.TICKET_ESCALATED, data); // Emit event to all clients
    }
  );

  socket.on(
    WebSocketMessage.NEW_COMMENT_ADDED,
    (data: WebSocketData[WebSocketMessage.NEW_COMMENT_ADDED]) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.NEW_COMMENT_ADDED,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.NEW_COMMENT_ADDED, data); // Emit event to all clients
    }
  );

  socket.on(
    WebSocketMessage.TICKET_ALTERED_SEVERITY,
    (data: WebSocketData[WebSocketMessage.TICKET_ALTERED_SEVERITY]) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.TICKET_ALTERED_SEVERITY,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.TICKET_ALTERED_SEVERITY, data); // Emit event to all clients
    }
  );

  // More events can be handled similarly
  socket.on(
    WebSocketMessage.TICKET_ALTERED_REMEDY_INC,
    (data: WebSocketData[WebSocketMessage.TICKET_ALTERED_REMEDY_INC]) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.TICKET_ALTERED_REMEDY_INC,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.TICKET_ALTERED_REMEDY_INC, data); // Emit event to all clients
    }
  );

  socket.on(
    WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE,
    (
      data: WebSocketData[WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE]
    ) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE, data); // Emit event to all clients
    }
  );

  socket.on(
    WebSocketMessage.TICKET_STARTED_WORK,
    (data: WebSocketData[WebSocketMessage.TICKET_STARTED_WORK]) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.TICKET_STARTED_WORK,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.TICKET_STARTED_WORK, data); // Emit event to all clients
    }
  );

  // Other event handlers...

  socket.on('disconnect', () => {
    connectedUsers--;
    //@ts-ignore
    logger.info(`User disconnected: id: ${socket.user.user_id}`);
    logger.info(`Total connected users: ${connectedUsers}`);
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`Socket.IO server is listening on http://127.0.0.1:${PORT}`);
});
