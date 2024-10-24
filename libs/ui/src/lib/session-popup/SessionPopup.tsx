'use client';
import React, { useState, useEffect } from 'react';
import { useSessionTimeLeft } from '@b2b-tickets/react-hooks'; // Assuming this is your hook
import { formatTimeMMSS } from '@b2b-tickets/utils'; // Assuming this is your time formatting function
import { Button } from '@mui/material';
import config from '@b2b-tickets/config';
import { signOut } from 'next-auth/react';
import { extendSessionAction } from '@b2b-tickets/server-actions';
import { getSession } from 'next-auth/react';
import toast from 'react-hot-toast';

const SessionPopup = () => {
  const { timeLeftInSeconds, refreshSession } = useSessionTimeLeft();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (
      timeLeftInSeconds !== null &&
      timeLeftInSeconds <= config.SessionExpirationPopupShownInSeconds
    ) {
      // Less than 5 minutes (300 seconds)
      setShowPopup(true);
    } else {
      setShowPopup(false); // Hide popup if more than 5 minutes
    }
  }, [timeLeftInSeconds]);

  const extendSession = async () => {
    try {
      const resp = await extendSessionAction();

      if (resp.status === 'SUCCESS') {
        await refreshSession();
        toast.success(
          `Session Extended for ${Math.floor(
            config.SessionMaxAge / 60
          )} minutes`
        );
      } else {
        console.error('Error extending session:', resp.message);
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  };

  const performLogOut = () => {
    signOut();
  };

  return (
    <>
      {/* Show popup if time left is less than 5 minutes */}
      {showPopup && (
        <div className="fixed z-10 inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white px-8 py-3 rounded-lg">
            <h2 className="text-center mb-3">Session Expiring Soon</h2>
            <p>
              Your session will expire in{' '}
              {formatTimeMMSS(timeLeftInSeconds ?? 0)}. Do you want to extend
              your session?
            </p>
            <div className="mt-5 flex justify-center items-center gap-6">
              <Button variant="outlined" onClick={performLogOut}>
                Log Out
              </Button>
              <Button variant="contained" onClick={extendSession}>
                Extend Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionPopup;
