import './global.css';

import AuthProvider from './utils/AuthProvider';
import ToastProvider from './utils/toast-provider';

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
      </head>
      {/* <AuthProvider> */}
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
      {/* </AuthProvider> */}
    </html>
  );
}
