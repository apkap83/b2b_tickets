import { AppRouterCacheProvider } from '@mui/material-nextjs/v13-appRouter';

// @ts-ignore
import { ThemeProvider, CssVarsProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

import './global.css';
import './sass/main.scss';
import NavBar from './components/NavBar';

import AuthProvider from './utils/AuthProvider';
import ToastProvider from './utils/toast-provider';

import AppThemeProvider from './themeProvider';
import { Paper } from '@mui/material';

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
      </body>
      {/* </AuthProvider> */}
    </html>
  );
}
