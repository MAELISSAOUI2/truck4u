import type { Metadata } from 'next';
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from './providers';
import './globals.css';
import '@mantine/core/styles.css';

export const metadata: Metadata = {
  title: 'Truck4u - Transport Premium',
  description: 'Plateforme de transport de marchandises en Tunisie',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Truck4u',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
