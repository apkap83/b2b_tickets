import React, {
  ReactNode,
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
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

  const socketURL = useMemo(
    () =>
      process.env.NODE_ENV === 'production'
        ? config.webSiteUrl
        : 'http://127.0.0.1:3455',
    []
  );
  useEffect(() => {
    // Abort Socket Connection if User is not authenticated
    if (status === 'authenticated' && socket === null) {
      const socketInstance = io(socketURL, {
        path: '/socket.io',
        transports: ['websocket'],
        withCredentials: true,
      });

      socketInstance.on('connect', () => {
        setConnected(true);
      });

      socketInstance.on('disconnect', (reason) => {
        setConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('Socket Connection error:', error);
      });

      Object.values(WebSocketMessage).forEach((message) => {
        socketInstance.on(message, (data) =>
          setLatestEventEmitted({ event: message as WebSocketMessage, data })
        );
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
        setSocket(null);
      };
    }
  }, [socketURL, status]);

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

  const resetLatestEventEmitted = () => {
    setLatestEventEmitted(null);
  };

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
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      'useWebSocketContext must be used within a WebSocketProvider'
    );
  }
  return context;
};
