import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';

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
  title: 'Nova Platinum Ticketing',
  description: 'Nova Business To Business Ticketing System',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>{metadata.title}</title>
        <meta name="description" content={metadata.description} />
        <meta name="color-scheme" content="light only" />
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </head>
      <AuthProvider>
        <body className={'subpixel-antialiased'}>
          {/* <StyledComponentsRegistry> */}
          <CssBaseline />
          <AppRouterCacheProvider>
            <AppThemeProvider>
              <ToastProvider>
                <WebSocketWrapper>
                  <main>
                    {/* {session ? <NavBar /> : null} */}
                    {children}
                    {/* {session ? <Footer /> : null} */}
                  </main>
                </WebSocketWrapper>
                <CookieConsentBanner />
              </ToastProvider>
            </AppThemeProvider>
          </AppRouterCacheProvider>
          {/* </StyledComponentsRegistry> */}
        </body>
      </AuthProvider>
    </html>
  );
}
