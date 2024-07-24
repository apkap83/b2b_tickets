import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';

// @ts-ignore
import CssBaseline from '@mui/material/CssBaseline';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './global.css';
import './sass/main.scss';
// import NavBar from './components/NavBar';
import { NavBar } from '@b2b-tickets/ui';

import { AuthProvider, ToastProvider } from '@b2b-tickets/utils';
import { AppThemeProvider } from '@b2b-tickets/ui-theme';
import { Paper } from '@mui/material';
import StyledComponentsRegistry from './lib/registry';

export const metadata = {
  title: 'NOVA - B2B Tickets',
  description: 'NOVA B2B Ticketing System',
};

export default function RootLayout({
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
      {/* <AuthProvider> */}
      <body>
        <StyledComponentsRegistry>
          <CssBaseline />
          <AppRouterCacheProvider>
            <AppThemeProvider>
              <ToastProvider>
                <div className="app">
                  <main className="content">
                    <NavBar />
                    {children}
                  </main>
                </div>
              </ToastProvider>
            </AppThemeProvider>
          </AppRouterCacheProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
