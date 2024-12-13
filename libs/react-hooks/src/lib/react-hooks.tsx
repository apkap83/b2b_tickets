'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useSession, getSession, signOut } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { FormState } from '@b2b-tickets/shared-models';
import { io, Socket } from 'socket.io-client';
import { config } from '@b2b-tickets/config';
import { WebSocketMessage, WebSocketData } from '@b2b-tickets/shared-models';

export const useToastMessage = (formState: FormState) => {
  const prevTimestamp = useRef(formState.timestamp);

  const showToast =
    formState.message && formState.timestamp !== prevTimestamp.current;

  useEffect(() => {
    if (showToast) {
      if (formState.status === 'ERROR') {
        toast.error(formState.message);
      } else {
        toast.success(<span className="text-center">{formState.message}</span>);
      }

      prevTimestamp.current = formState.timestamp;
    }
  }, [formState, showToast]);

  return (
    <noscript>
      {formState.status === 'ERROR' && (
        <div style={{ color: 'red' }}>{formState.message}</div>
      )}

      {formState.status === 'SUCCESS' && (
        <div style={{ color: 'green' }}>{formState.message}</div>
      )}
    </noscript>
  );
};

export const useEscKeyListener = (onEscPress: () => void) => {
  const handleEscKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscPress();
      }
    },
    [onEscPress]
  );

  useEffect(() => {
    // Attach the event listener
    window.addEventListener('keydown', handleEscKeyPress);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleEscKeyPress);
    };
  }, [handleEscKeyPress]);
};

export const useSessionTimeLeft = () => {
  const { data: session } = useSession(); // Get initial session from useSession
  const [mySession, setMySession] = useState(session); // Track session manually
  const [timeLeftInSeconds, setTimeLeftInSeconds] = useState<number | null>(
    null
  );

  // Update mySession when session changes
  useEffect(() => {
    if (session) {
      setMySession(session);
    }
  }, [session]);

  // Function to refresh the session
  const refreshSession = async () => {
    console.info('Refreshing session...');
    const updatedSession = await getSession(); // Fetch the updated session
    if (updatedSession) {
      setMySession(updatedSession); // Update mySession manually
    }
  };

  useEffect(() => {
    //@ts-ignore
    if (mySession && mySession.expiresAt) {
      const calculateTimeLeft = () => {
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);
        //@ts-ignore
        const timeLeft = mySession.expiresAt - currentTimeInSeconds;
        setTimeLeftInSeconds(timeLeft > 0 ? timeLeft : 0);

        // If time left is 0 or less, sign out the user
        if (timeLeft <= 0) {
          signOut(); // Trigger automatic sign out
        }
      };

      // Calculate time left immediately
      calculateTimeLeft();

      // Update time left every second
      const intervalId = setInterval(calculateTimeLeft, 1000);

      // Clear interval when component is unmounted or session expires
      return () => clearInterval(intervalId);
    }
  }, [mySession]); // Recalculate time when mySession changes

  return { timeLeftInSeconds, refreshSession };
};

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  emitEvent: <T extends WebSocketMessage>(
    event: T,
    data: WebSocketData[T]
  ) => void; // Make it generic
  latestEventEmitted: any;
  resetLatestEventEmitted: () => void;
}

// Custom Hook to handle Socket.IO connection
export const useWebSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [latestEventEmitted, setLatestEventEmitted] = useState<{
    event: WebSocketMessage;
    data: WebSocketData[WebSocketMessage];
  } | null>(null); // State to store the updated ticket list

  const socketURL = useMemo(
    () =>
      process.env.NODE_ENV === 'production'
        ? config.webSiteUrl
        : 'http://127.0.0.1:3455',
    []
  );

  useEffect(() => {
    const socketInstance = io(socketURL, {
      path: '/socket.io',
      transports: ['websocket'], // Use WebSocket for persistent connection
      withCredentials: true, // Allow cookies to be sent with the request
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

    // Listen for events and update the ticket list
    Object.values(WebSocketMessage).forEach((message) => {
      socketInstance.on(message, (data) =>
        setLatestEventEmitted({ event: message, data })
      );
    });

    setSocket(socketInstance);

    // Clean up the socket when the component is unmounted
    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, [socketURL]);

  // Emit an event to the server with correct data type
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

  return {
    socket,
    connected,
    emitEvent,
    latestEventEmitted,
    resetLatestEventEmitted,
  };
};
