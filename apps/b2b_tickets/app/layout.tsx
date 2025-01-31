import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';
import Script from 'next/script';
import CssBaseline from '@mui/material/CssBaseline';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './global.css';
import './sass/main.scss';

import { AuthProvider, ToastProvider } from '@b2b-tickets/utils';
import { AppThemeProvider } from '@b2b-tickets/ui-theme';
import CookieConsentBanner from './CookieConsentBanner';
import WebSocketWrapper from './WebSocketWrapper';

// TODO Fix Error With the below entry
// import StyledComponentsRegistry from './lib/registry';

export const metadata = {
  title: 'Nova Platinum Support',
  description: 'Nova Platinum Support',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={'subpixel-antialiased'}>
        <AuthProvider>
          {/* <StyledComponentsRegistry> */}
          <CssBaseline />
          <AppRouterCacheProvider>
            <AppThemeProvider>
              <ToastProvider>
                <WebSocketWrapper>
                  <main className="mt-[0] mb-[49.92px] sm:mt-[75.2px]">
                    {children}
                  </main>
                </WebSocketWrapper>
                <CookieConsentBanner />
              </ToastProvider>
            </AppThemeProvider>
          </AppRouterCacheProvider>
          {/* </StyledComponentsRegistry> */}
        </AuthProvider>
      </body>
    </html>
  );
}
