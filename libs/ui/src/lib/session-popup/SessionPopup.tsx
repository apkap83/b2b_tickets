'use client';
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSessionTimeLeft } from '@b2b-tickets/react-hooks'; // Assuming this is your hook
import { formatTimeMMSS, userHasRole } from '@b2b-tickets/utils'; // Assuming this is your time formatting function
import { Button } from '@mui/material';
import config from '@b2b-tickets/config';
import { signOut } from 'next-auth/react';
import { extendSessionAction } from '@b2b-tickets/server-actions';
import { getSession } from 'next-auth/react';
import { Session } from '@b2b-tickets/shared-models';
import { AppRoleTypes } from '@b2b-tickets/shared-models';
import toast from 'react-hot-toast';
import './SessionTimer.css';

export const SessionPopup = memo(() => {
  const [showPopup, setShowPopup] = useState(false);
  const [mySession, setMySession] = useState<Session | null>(null); // Track session manually
  const [isExtending, setIsExtending] = useState(false);
  const [timeLeftInSeconds, setTimeLeftInSeconds] = useState<number | null>(
    config.SessionMaxAge
  );

  const isHandler = useMemo(() => 
    userHasRole(mySession, AppRoleTypes.B2B_TicketHandler),
    [mySession]
  );

  // Fetch Session Object from Backend
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await extendSessionAction();
      setMySession(data);
    };

    fetchSession();
  }, []);

  // Function to refresh the session
  const refreshSession = useCallback(async () => {
    const updatedSession = await getSession();
    if (updatedSession) {
      setMySession(updatedSession);
    }
  }, []);

  const calculateTimeLeft = useCallback((expiresAt: number): number => {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    return expiresAt - currentTimeInSeconds;
  }, []);

  // Calculate Time Left Every Second
  useEffect(() => {
    if (mySession && mySession.expiresAt) {
      const intervalId = setInterval(() => {
        const timeLeft = calculateTimeLeft(mySession.expiresAt as number);
        setTimeLeftInSeconds(timeLeft > 0 ? timeLeft : 0);
        if (timeLeft <= 0) {
          clearInterval(intervalId);
          signOut();
        }
      }, 1000);

      return () => clearInterval(intervalId);
    }
  }, [mySession]);

  // Determine if Popup is shown
  useEffect(() => {
    if (
      timeLeftInSeconds !== null &&
      timeLeftInSeconds <= config.SessionExpirationPopupShownInSeconds
    ) {
      setShowPopup(true);
    } else {
      setShowPopup(false);
    }
  }, [timeLeftInSeconds]);

  const extendSession = useCallback(async () => {
    const result = await extendSessionAction();

    if (result.error) {
      setIsExtending(false);
      return toast.error(result.error);
    }

    await refreshSession();
    toast.success(
      `Session Extended for ${Math.floor(config.SessionMaxAge / 60)} minutes`
    );
  }, [refreshSession]);

  const performLogOut = useCallback(() => {
    signOut();
  }, []);

  const safeTimeLeft = useMemo(() => 
    Math.max(0, timeLeftInSeconds ?? 0),
    [timeLeftInSeconds]
  );
  
  const percentage = useMemo(() => 
    safeTimeLeft && (safeTimeLeft / 3600) * 100,
    [safeTimeLeft]
  );

  const SessionTimer = memo(({ time = '30:05', title = 'Stopwatch' }) => {
    const handleExtendSession = useCallback(() => {
      extendSession();
    }, []);
    
    const strokeDashoffset = useMemo(() => 
      `${282 - (282 * (percentage || 1)) / 100}`,
      [percentage]
    );
    
    const formattedTime = useMemo(() => 
      formatTimeMMSS(timeLeftInSeconds!),
      [timeLeftInSeconds]
    );
    
    return (
      <div
        className="semi-circle-timer cursor-pointer"
        onClick={handleExtendSession}
      >
        <svg width="50" height="25" viewBox="0 0 200 100">
          <path
            d="M10,100 A90,90 0 0,1 190,100"
            fill="none"
            stroke="#777"
            strokeWidth="20"
          />
          <path
            d="M10,100 A90,90 0 0,1 190,100"
            fill="none"
            stroke="#007700"
            strokeWidth="20"
            strokeDasharray="282"
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="remaining-time">
          {formattedTime}
        </div>
      </div>
    );
  });

  // Memoize the formatted time display
  const formattedExpiryTime = useMemo(() => 
    formatTimeMMSS(timeLeftInSeconds ?? 0), 
    [timeLeftInSeconds]
  );
  
  // Memoize session extend handler for the popup button
  const handleExtendSessionWithState = useCallback(async () => {
    setIsExtending(true);
    await extendSession();
    setTimeout(() => {
      setIsExtending(false);
    }, 5000);
  }, [extendSession, setIsExtending]);
  
  return (
    <>
      {/* <SessionTimer time={formattedExpiryTime} /> */}
      {/* Show popup if time left is less than N minutes */}
      {showPopup && (
        <div className="fixed z-10 inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none">
          <div className="fixed inset-0 flex items-center justify-center z-20 pointer-events-auto">
            <div className="bg-white px-8 py-3 rounded-lg">
              <h2 className="text-center mb-3">Session Expiring Soon</h2>
              <p>
                Your session will expire in{' '}
                {formattedExpiryTime}. Do you want to extend
                your session?
              </p>
              <div className="mt-5 flex justify-center items-center gap-6">
                <Button variant="outlined" onClick={performLogOut}>
                  Log Out
                </Button>
                <Button
                  disabled={isExtending}
                  variant="contained"
                  onClick={handleExtendSessionWithState}
                >
                  {isExtending ? 'Extending...' : 'Extend Session'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
