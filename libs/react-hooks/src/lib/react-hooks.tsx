'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useSession, getSession, signOut } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { FormState } from '@b2b-tickets/shared-models';
import { io, Socket } from 'socket.io-client';
import { config } from '@b2b-tickets/config';
import { WebSocketMessage, WebSocketData } from '@b2b-tickets/shared-models';
import { getLatestTicketCreated } from '@b2b-tickets/server-actions';

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
    console.log('Refreshing session...');
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
}

// Custom Hook to handle Socket.IO connection
export const useWebSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [latestEventEmitted, setLatestEventEmitted] = useState<any>(); // State to store the updated ticket list

  useEffect(() => {
    const socketInstance = io(config.webSocketURL, {
      transports: ['websocket'], // Use WebSocket for persistent connection
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected due to:', reason);
      setConnected(false);
    });

    // Listen for events and update the ticket list
    socketInstance.on(
      WebSocketMessage.NEW_TICKET_CREATED,
      (data: WebSocketData[WebSocketMessage.NEW_TICKET_CREATED]) => {
        console.log('Received NEW_TICKET_CREATED:', data);
        setLatestEventEmitted({
          event: WebSocketMessage.NEW_TICKET_CREATED,
          data,
        });
      }
    );

    socketInstance.on(
      WebSocketMessage.TICKET_ALTERED_SEVERITY,
      (data: WebSocketData[WebSocketMessage.TICKET_ALTERED_SEVERITY]) => {
        console.log(
          `Received ${WebSocketMessage.TICKET_ALTERED_SEVERITY}:`,
          data
        );
        setLatestEventEmitted({
          event: WebSocketMessage.TICKET_ALTERED_SEVERITY,
          data,
        });
      }
    );

    socketInstance.on(
      WebSocketMessage.TICKET_ALTERED_REMEDY_INC,
      (data: WebSocketData[WebSocketMessage.TICKET_ALTERED_REMEDY_INC]) => {
        console.log(
          `Received ${WebSocketMessage.TICKET_ALTERED_REMEDY_INC}:`,
          data
        );
        setLatestEventEmitted({
          event: WebSocketMessage.TICKET_ALTERED_REMEDY_INC,
          data,
        });
      }
    );

    socketInstance.on(
      WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE,
      (
        data: WebSocketData[WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE]
      ) => {
        console.log(
          `Received ${WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE}:`,
          data
        );
        setLatestEventEmitted({
          event: WebSocketMessage.TICKET_ALTERED_CATEGORY_SERVICE_TYPE,
          data,
        });
      }
    );

    socketInstance.on(
      WebSocketMessage.NEW_COMMENT_ADDED,
      (data: WebSocketData[WebSocketMessage.NEW_COMMENT_ADDED]) => {
        console.log(`Received ${WebSocketMessage.NEW_COMMENT_ADDED}:`, data);
        setLatestEventEmitted({
          event: WebSocketMessage.NEW_COMMENT_ADDED,
          data,
        });
      }
    );

    // Clean up the socket when the component is unmounted
    return () => {
      socketInstance.disconnect();
      console.log('Socket disconnected!');
    };
  }, []); // Run the effect only once on mount

  // Emit an event to the server with correct data type
  const emitEvent = <T extends WebSocketMessage>(
    event: T,
    data: WebSocketData[T]
  ) => {
    if (socket && connected) {
      socket.emit(event, data);
      console.log(`Event ${event} emitted with data:`, data);
    } else {
      console.log('Socket is not connected');
    }
  };

  return { socket, connected, emitEvent, latestEventEmitted };
};

const triggerRevalidation = async (path: string) => {
  const response = await fetch('/api/revalidate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      path, // Path you want to revalidate
    }),
  });

  const data = await response.json();
  if (response.ok) {
    console.log(`Revalidated: ${data.message}`);
  } else {
    console.log(`Error: ${data.error}`);
  }
};
