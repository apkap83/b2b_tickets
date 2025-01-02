'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

import { useSession } from 'next-auth/react';
import cookie from 'js-cookie';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { signOut } from 'next-auth/react';
import config from '@b2b-tickets/config';
import { NovaLogo } from '@b2b-tickets/assets';
import { FaChevronRight } from 'react-icons/fa6';

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
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>ENID</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>Security</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Ensures secure user authentication and stores preferences for Google
            services.
          </td>
        </tr>
        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            next-auth.callback-url
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>Security</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Used by NextAuth.js to handle authentication redirects.
          </td>
        </tr>
        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            next-auth.session-token
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>Security</td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Used by NextAuth.js to handle authentication.
          </td>
        </tr>
        <tr>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            cookieConsent
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Necessary
          </td>
          <td style={{ border: '1px solid #ddd', padding: '8px' }}>
            Used by application for storing Consent response
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
      <div>
        <div
          className="flex justify-center"
          style={{
            position: 'fixed',
            bottom: 0,
            width: '100%',
            backgroundColor: '#fff',
            padding: '1rem',
            borderTop: '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div className="flex gap-7 mx-auto justify-center">
            <div className="flex justify-center items-center">
              <Image
                priority
                src={NovaLogo}
                alt={'Nova Logo'}
                className="w-[250px]"
              />
            </div>
            <div style={{ maxWidth: '60%' }}>
              <p style={{ fontSize: '0.875rem', margin: '0.5rem 8px' }}>
                <strong>This page uses cookies</strong>
              </p>
              <p style={{ fontSize: '0.875rem', marginLeft: '8px' }}>
                Cookies are essential for the proper functioning of the site and
                for improving your browsing experience.
              </p>
              <Button
                variant="text"
                sx={{
                  fontSize: '0.875rem',
                  marginTop: '0.5rem',
                  color: '#000',
                  marginLeft: '0',
                }}
                onClick={toggleDetails}
              >
                View Details &nbsp;
                <FaChevronRight size="12" />
              </Button>
            </div>
            <div className="flex flex-col gap-3 justify-center">
              <Button
                variant="contained"
                style={{
                  backgroundColor: '#000',
                  color: '#fff',
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  textTransform: 'none',
                }}
                onClick={handleAccept}
              >
                Accept All
              </Button>
              {/* <Button
                variant="outlined"
                style={{
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                }}
                onClick={handleReject}
              >
                Customize &nbsp;
                <FaChevronRight size="12" />
              </Button> */}
              <Button
                variant="outlined"
                style={{
                  fontSize: '0.875rem',
                  padding: '0.5rem 1rem',
                  textTransform: 'none',
                }}
                onClick={handleReject}
              >
                Reject All
              </Button>
            </div>
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
