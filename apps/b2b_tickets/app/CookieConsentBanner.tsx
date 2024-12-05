'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import cookie from 'js-cookie';
import Button from '@mui/material/Button';
import { signOut } from 'next-auth/react';
import config from '@b2b-tickets/config';

const CookieConsentBanner = () => {
  const { status } = useSession();

  const [showBanner, setShowBanner] = useState(false);
  useEffect(() => {
    if (!config.ShowCookieConsentBanner) {
      return;
    }
    const consentCookie = cookie.get('cookieConsent');

    if (!consentCookie || consentCookie === 'rejected') {
      if (status === 'authenticated') {
        setTimeout(() => {
          setShowBanner(true);
        }, 2000);
      }
    }
  }, [status]);

  const handleAccept = () => {
    setShowBanner(false);
    cookie.set('cookieConsent', 'accepted', {
      expires: 365,
      secure: process.env.NODE_ENV === 'production', // Ensures the cookie is only sent over HTTPS
      sameSite: 'Strict', // Restricts cookie to same-site requests });
    });
  };

  const handleReject = async () => {
    // setShowBanner(false);
    cookie.set('cookieConsent', 'rejected', {
      expires: 365,
      secure: process.env.NODE_ENV === 'production', // Ensures the cookie is only sent over HTTPS
      sameSite: 'Strict', // Restricts cookie to same-site requests
    });

    await signOut({ callbackUrl: process.env.SIGNOUT_CALLBACKURL });
  };

  if (!config.ShowCookieConsentBanner || !showBanner) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black opacity-40"></div>
      <div className="w-full fixed bottom-[100px] opacity-100 flex-col justify-center items-center bg-white py-4">
        <p className="text-center pb-3">
          This website uses cookies to improve your browsing experience.
        </p>
        <p className="text-center pb-3">Please click Accept to continue.</p>
        <div className="flex justify-center items-center">
          <Button
            variant="contained"
            onClick={handleAccept}
            sx={{
              marginRight: '2rem',
            }}
          >
            Accept
          </Button>
          <Button variant="outlined" onClick={handleReject}>
            Reject
          </Button>
        </div>
      </div>
    </>
  );
};

export default CookieConsentBanner;
