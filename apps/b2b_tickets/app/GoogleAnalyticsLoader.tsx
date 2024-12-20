'use client';

import React, { useEffect } from 'react';
import cookie from 'js-cookie';

const GoogleAnalyticsLoader = () => {
  useEffect(() => {
    const consent = cookie.get('cookieConsent');
    if (consent === 'accepted') {
      // Dynamically load Google Analytics script
      const scriptTag = document.createElement('script');
      scriptTag.async = true;
      scriptTag.src = `https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`;
      document.head.appendChild(scriptTag);

      scriptTag.onload = () => {
        //@ts-ignore
        window.dataLayer = window.dataLayer || [];
        //@ts-ignore
        window.gtag = function gtag() {
          //@ts-ignore
          window.dataLayer.push(arguments);
        };
        //@ts-ignore
        window.gtag('js', new Date());
        //@ts-ignore
        window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID, {
          send_page_view: false,
        });
      };
    }
  }, []);

  return null; // This component only handles the script logic
};

export default GoogleAnalyticsLoader;
