'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import cookie from 'js-cookie';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { signOut } from 'next-auth/react';
import config from '@b2b-tickets/config';

const CookieDetails = () => (
  <div
    style={{
      padding: '1rem',
      fontFamily: 'Arial, sans-serif',
      lineHeight: 1.6,
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '1rem',
      }}
    >
      <thead>
        <tr>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>
            Cookie Name
          </th>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Category</th>
          <th style={{ border: '1px solid #ddd', padding: '8px' }}>Purpose</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            _GRECAPTCHA
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>Security</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Protects the site from spam and abuse using Google reCAPTCHA.
          </td>
        </tr>
        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            next-auth.csrf-token
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>Security</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Protection against CSRF attacks
          </td>
        </tr>
        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            _Secure-ENID
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Necessary
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Ensures secure user authentication and stores preferences for Google
            services.
          </td>
        </tr>
        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            next-auth.callback-url
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Necessary
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Used by NextAuth.js to handle authentication redirects.
          </td>
        </tr>

        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>_ga</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Analytics
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Tracks user interactions and website performance for Google
            Analytics.
          </td>
        </tr>
        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            _ga_&lt;property&gt;
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Analytics
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Tracks user interactions for specific Google Analytics properties.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const CookiePolicy = () => (
  <div
    style={{
      padding: '1rem',
      fontFamily: 'Arial, sans-serif',
      lineHeight: 1.6,
    }}
  >
    <p>
      <strong>Effective Date:</strong> 06 Dec 2024
    </p>
    <p>
      <strong>Last Updated:</strong> 20 Dec 2024
    </p>

    <p className="mt-5">
      This Cookie Policy explains how NOVA uses cookies and similar technologies
      to recognize you when you visit our website. It explains what these
      cookies are, why we use them, and your rights to control their use.
    </p>

    <h2 className="text-center font-black my-5">What Are Cookies?</h2>
    <p>
      Cookies are small data files placed on your device when you visit a
      website. Cookies are widely used to make websites function more
      efficiently and to provide reporting information.
    </p>

    <h2 className="text-center font-black my-5">Why Do We Use Cookies?</h2>
    <ul className="list-disc ml-5">
      <li>To ensure website functionality.</li>
      <li>To improve user experience and analyze traffic.</li>
      <li>To secure the website against spam and abuse.</li>
    </ul>

    <h2 className="text-left font-black my-5">1. Security Cookies</h2>
    <p>
      These cookies are essential for the proper functioning of our website and
      cannot be disabled. They are typically set in response to actions made by
      you, such as logging in, filling out forms, or ensuring website security.
    </p>

    <h2 className="text-left font-black my-5">2. Analytics Cookies</h2>
    <p>
      These cookies allow us to measure and improve the performance of our
      website by collecting and reporting information on how users interact with
      it.
    </p>
  </div>
);

const CookieConsentBanner = () => {
  const { data: session, status } = useSession();

  const [showBanner, setShowBanner] = useState(false);
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    if (!config.ShowCookieConsentBanner) {
      return;
    }
    const consentCookie = cookie.get('cookieConsent');

    if (!consentCookie || consentCookie !== 'accepted') {
      setShowBanner(true);
    }
  }, [status]);

  const handleAccept = async () => {
    setShowBanner(false);
    cookie.set('cookieConsent', 'accepted', {
      expires: config.cookieConsentValidityInDays,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    // Log analytics consent (if needed)
    //@ts-ignore
    if (window.gtag) {
      //@ts-ignore
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  };

  const handleReject = async () => {
    setShowBanner(false);
    cookie.set('cookieConsent', 'rejected', {
      expires: config.cookieConsentValidityInDays,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
    });

    //@ts-ignore
    if (window.gtag) {
      //@ts-ignore
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
    }

    await signOut({ callbackUrl: process.env.SIGNOUT_CALLBACKURL });
  };

  const toggleDetails = () => {
    setOpenDetails(!openDetails);
  };

  const togglePolicy = () => {
    setOpenPolicy(!openPolicy);
  };

  const handlePolicyRead = () => {
    setOpenPolicy(false); // Close the policy modal if open
    alert('Thank you for reading the cookie policy.');
  };

  if (!config.ShowCookieConsentBanner || !showBanner) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black opacity-40 z-10 "></div>
      <div className="w-full flex justify-center items-center fixed bottom-[75px] opacity-100 z-20">
        <div className="w-[460px] flex-col justify-center items-center bg-white p-4 rounded-md text-sm">
          <h3 className="font-extrabold mb-3">We value your privacy</h3>
          <p className="mb-4">
            We use cookies to enhance your browsing experience and ensure site
            security. By clicking "Accept All," you consent to all cookies.
          </p>
          <Button
            variant="text"
            sx={{ color: '#0000aa', mb: '1rem' }}
            onClick={togglePolicy}
          >
            View Cookie Policy
          </Button>
          <div className="flex justify-center items-center gap-4">
            <Button variant="text" onClick={toggleDetails}>
              View Cookies
            </Button>
            <Button variant="outlined" onClick={handleReject}>
              Reject All
            </Button>
            <Button variant="contained" onClick={handleAccept}>
              Accept All
            </Button>
          </div>
        </div>
      </div>

      {/* Cookie Policy Modal */}
      <Dialog open={openPolicy} onClose={togglePolicy} maxWidth="sm" fullWidth>
        <DialogTitle>
          <h3 className="text-center font-black text-3xl">
            Nova Platinum - Cookie Policy
          </h3>
        </DialogTitle>
        <DialogContent>
          <CookiePolicy />
        </DialogContent>
        <div style={{ padding: '1rem', textAlign: 'center' }} className="mb-3">
          <Button variant="contained" onClick={handlePolicyRead}>
            I have read the policy
          </Button>
        </div>
      </Dialog>

      {/* Cookie Details Modal */}
      <Dialog
        open={openDetails}
        onClose={toggleDetails}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <h3 className="text-center font-black text-3xl">
            Cookie Details and Their Functionality
          </h3>
        </DialogTitle>
        <DialogContent>
          <CookieDetails />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;
