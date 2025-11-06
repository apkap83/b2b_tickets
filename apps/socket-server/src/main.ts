import { Server, Socket } from 'socket.io';
import * as http from 'http';
import cookie from 'cookie';
import dotenv from 'dotenv';
import logger from './logger';
import axios from 'axios';
import {
  WebSocketMessage,
  WebSocketData,
  Session,
} from '@b2b-tickets/shared-models';
import { PresenceService } from '@b2b-tickets/redis-service';

// Extend Socket interface to include user property
interface AuthenticatedSocket extends Socket {
  user?: Session['user'];
}

// Load environment variables
dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

const PORT = process.env.PORT || 3456;
const CORS_ORIGIN = process.env.SOCKET_CORS_ORIGIN || '*';
const SESSION_API_URL = process.env.NEXT_AUTH_SESSION_URL;
const DEBUG = process.env.DEBUG || '0';

// console.log('DEBUG', DEBUG);
// console.log('NODE_ENV', process.env.NODE_ENV || 'development');
// console.log('PORT', PORT);
// console.log('CORS_ORIGIN', CORS_ORIGIN);
// console.log('SESSION_API_URL', SESSION_API_URL);
// console.log(
//   'NODE_TLS_REJECT_UNAUTHORIZED',
//   process.env.NODE_TLS_REJECT_UNAUTHORIZED
// );

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
    origin: CORS_ORIGIN,
    credentials: true,
  },
});

const validateSession = async (sessionToken: string) => {
  if (!SESSION_API_URL) {
    throw new Error('Session API URL is not defined');
  }

  // Determine the cookie name dynamically
  const nodeEnv = process.env.NODE_ENV as string;
  const cookieName =
    nodeEnv === 'production' || nodeEnv === 'staging'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

  try {
    const response = await axios.get(SESSION_API_URL, {
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${cookieName}=${sessionToken}`, // Dynamically use the correct cookie name
      },
      proxy: false, // Disable proxy usage
    });

    if (response.status !== 200) {
      throw new Error(
        `Session validation failed with status: ${response.status}`
      );
    }

    const session = (await response.data) as Session;

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
io.use(async (socket: AuthenticatedSocket, next) => {
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
    socket.user = session.user;
    // logger.info(
    //   `Authenticated user: id: ${session.user.user_id}, userName: ${session.user.userName}`
    // );

    if (session?.user) {
      // Add to Redis presence store
      await PresenceService.addOnlineUser(session.user.user_id.toString(), {
        userId: session.user.user_id.toString(),
        userName: session.user.userName,
        customer_id: session.user.customer_id.toString(),
        roles: session.user.roles,
        connectedAt: Date.now(),
        lastSeen: Date.now(),
        socketId: socket.id,
      });
      next();
    } else {
      next(new Error('Authentication failed'));
    }
  } catch (error) {
    logger.error('Error during cookie parsing or session validation:', error);
    next(new Error('Authentication error'));
  }
});

// Variable to keep track of the number of connected users
let connectedUsers = 0;

// Track user cleanup timeouts to cancel them on quick reconnection
const userCleanupTimeouts = new Map<string, NodeJS.Timeout>();

// Listen for connections
io.on('connection', (socket: AuthenticatedSocket) => {
  connectedUsers++;
  // logger.info(
  //   `User connected: id: ${socket.user?.user_id}, userName: ${socket.user?.userName}`
  // );
  // logger.info(`Total connected users: ${connectedUsers}`);

  const userId = socket.user?.user_id?.toString();

  // If this user has a pending cleanup timeout, cancel it (quick reconnection)
  if (userId && userCleanupTimeouts.has(userId)) {
    const existingTimeout = userCleanupTimeouts.get(userId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      userCleanupTimeouts.delete(userId);
    }
  }

  // Heartbeat to keep user presence alive in Redis
  const heartbeatInterval = setInterval(async () => {
    if (socket.user) {
      await PresenceService.updateLastSeen(socket.user.user_id.toString());
    }
  }, 25000); // Every 25 seconds

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
    WebSocketMessage.TICKET_ALTERED_ACTUAL_RESOLUTION_DATE,
    (
      data: WebSocketData[WebSocketMessage.TICKET_ALTERED_ACTUAL_RESOLUTION_DATE]
    ) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.TICKET_ALTERED_ACTUAL_RESOLUTION_DATE,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.TICKET_ALTERED_ACTUAL_RESOLUTION_DATE, data); // Emit event to all clients
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

  socket.on(
    WebSocketMessage.NEW_FILE_ATTACHMENT_FOR_TICKET,
    (data: WebSocketData[WebSocketMessage.NEW_FILE_ATTACHMENT_FOR_TICKET]) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.NEW_FILE_ATTACHMENT_FOR_TICKET,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.NEW_FILE_ATTACHMENT_FOR_TICKET, data); // Emit event to all clients
    }
  );

  socket.on(
    WebSocketMessage.DELETE_FILE_ATTACHMENT_FOR_TICKET,
    (
      data: WebSocketData[WebSocketMessage.DELETE_FILE_ATTACHMENT_FOR_TICKET]
    ) => {
      if (DEBUG)
        logger.info(
          WebSocketMessage.DELETE_FILE_ATTACHMENT_FOR_TICKET,
          'triggered with data:',
          data
        );
      io.emit(WebSocketMessage.DELETE_FILE_ATTACHMENT_FOR_TICKET, data); // Emit event to all clients
    }
  );

  // Other event handlers...

  socket.on('disconnect', async () => {
    const userId = socket.user?.user_id?.toString();

    const timeoutId = setTimeout(async () => {
      // Double-check if this timeout is still valid (not cancelled by reconnection)
      if (userId && !userCleanupTimeouts.has(userId)) {
        // console.log('Cleanup already cancelled for user', userId);
        return;
      }

      connectedUsers--;
      // logger.info(`User disconnected: id: ${socket.user?.user_id}`);
      // logger.info(`Total connected users: ${connectedUsers}`);

      // Clean up heartbeat interval
      clearInterval(heartbeatInterval);

      // Remove user from Redis presence store
      if (socket.user) {
        await PresenceService.removeOnlineUser(
          socket.user.user_id.toString(),
          socket.user
        );
      }

      // Remove the timeout from tracking map
      if (userId) {
        userCleanupTimeouts.delete(userId);
      }
    }, 5000);

    // Track this cleanup timeout so it can be cancelled on reconnection
    if (userId) {
      userCleanupTimeouts.set(userId, timeoutId);
    }
  });
});

// Start the server
server.listen(PORT, () => {
  logger.info(`Socket.IO server is listening on http://127.0.0.1:${PORT}`);
});
