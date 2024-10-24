'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useSession, getSession, signOut } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { FormState } from '@b2b-tickets/shared-models';

export const useToastMessage = (formState: FormState) => {
  const prevTimestamp = useRef(formState.timestamp);

  const showToast =
    formState.message && formState.timestamp !== prevTimestamp.current;

  useEffect(() => {
    if (showToast) {
      if (formState.status === 'ERROR') {
        toast.error(formState.message);
      } else {
        toast.success(formState.message);
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
    if (mySession && mySession.expiresAt) {
      const calculateTimeLeft = () => {
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);
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
