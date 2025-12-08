import React, {
  ReactNode,
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { WebSocketMessage, WebSocketData } from '@b2b-tickets/shared-models';
import { io, Socket } from 'socket.io-client';
import { config } from '@b2b-tickets/config';
import { useSession } from 'next-auth/react';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  emitEvent: <T extends WebSocketMessage>(
    event: T,
    data: WebSocketData[T]
  ) => void;
  latestEventEmitted: {
    event: WebSocketMessage;
    data: WebSocketData[WebSocketMessage];
  } | null;
  resetLatestEventEmitted: () => void;
}

const WebSocketContext = createContext<any>(undefined);

export const WebSocketProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [latestEventEmitted, setLatestEventEmitted] = useState<{
    event: WebSocketMessage;
    data: WebSocketData[WebSocketMessage];
  } | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRetryingRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);

  const socketURL = useMemo(
    () =>
      process.env.NODE_ENV === 'production'
        ? config.webSiteUrl
        : 'http://127.0.0.1:3455',
    []
  );

  const createSocketConnection = useCallback(() => {
    // Clean up any existing socket first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }

    const socketInstance = io(socketURL, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setConnected(true);
      isRetryingRef.current = false;
      // Clear any pending retry timeout on successful connection
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    });

    socketInstance.on('disconnect', (reason) => {
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket Connection error:', error);
      setConnected(false);

      // Only retry if we're not already retrying
      if (!isRetryingRef.current) {
        isRetryingRef.current = true;

        // Clean up current socket
        socketInstance.disconnect();
        socketRef.current = null;
        setSocket(null);

        // Schedule retry after 30 seconds
        retryTimeoutRef.current = setTimeout(() => {
          console.log('Retrying socket connection...');
          createSocketConnection();
        }, 30000);
      }
    });

    // Clean up any existing listeners before adding new ones
    Object.values(WebSocketMessage).forEach((message) => {
      socketInstance.removeAllListeners(message);
    });

    Object.values(WebSocketMessage).forEach((message) => {
      socketInstance.on(message, (data) =>
        setLatestEventEmitted({ event: message as WebSocketMessage, data })
      );
    });

    setSocket(socketInstance);
  }, [socketURL]);

  // Set hydrated flag on client-side
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    // Only create socket connection after hydration and if user is authenticated
    if (hasHydrated && status === 'authenticated' && !socket && !socketRef.current) {
      createSocketConnection();
    }

    // Clean up on status change or unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isRetryingRef.current = false;

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [hasHydrated, status, createSocketConnection]);

  // Separate effect to handle authentication changes
  useEffect(() => {
    if (status === 'unauthenticated' && (socket || socketRef.current)) {
      // Clean up socket when user logs out
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isRetryingRef.current = false;

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setConnected(false);
    }
  }, [status, socket]);

  const emitEvent = useCallback(
    <T extends WebSocketMessage>(event: T, data: WebSocketData[T]) => {
      if (!socket || !connected) {
        console.error('Socket is not connected');
        return;
      }
      socket.emit(event, data);
    },
    [socket, connected]
  );

  const resetLatestEventEmitted = useCallback(() => {
    setLatestEventEmitted(null);
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connected,
        emitEvent,
        latestEventEmitted,
        resetLatestEventEmitted,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): UseSocketReturn => {
  try {
    const context = useContext(WebSocketContext);
    if (!context) {
      throw new Error(
        'useWebSocketContext must be used within a WebSocketProvider'
      );
    }
    return context;
  } catch (error) {
    // Fallback in case useContext fails during hydration
    console.warn('WebSocket context access failed:', error);
    return {
      socket: null,
      connected: false,
      emitEvent: () => console.warn('WebSocket not available'),
      latestEventEmitted: null,
      resetLatestEventEmitted: () => {},
    };
  }
};
