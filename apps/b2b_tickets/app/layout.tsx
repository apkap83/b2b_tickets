import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';

// @ts-ignore
import CssBaseline from '@mui/material/CssBaseline';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './global.css';
import './sass/main.scss';
import { NavBar } from '@b2b-tickets/ui';
import { Footer } from '@b2b-tickets/ui';

import { AuthProvider, ToastProvider } from '@b2b-tickets/utils';
import { AppThemeProvider } from '@b2b-tickets/ui-theme';

// TODO Fix Error With the below entry
// import StyledComponentsRegistry from './lib/registry';

export const metadata = {
  title: 'NOVA - B2B Tickets',
  description: 'NOVA B2B Ticketing System',
};

import { getServerSession } from 'next-auth';
import { options } from '@b2b-tickets/auth-options';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(options);
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
                <main>
                  {session ? <NavBar /> : null}
                  {children}
                  {session ? <Footer /> : null}
                </main>
              </ToastProvider>
            </AppThemeProvider>
          </AppRouterCacheProvider>
          {/* </StyledComponentsRegistry> */}
        </body>
      </AuthProvider>
    </html>
  );
}
