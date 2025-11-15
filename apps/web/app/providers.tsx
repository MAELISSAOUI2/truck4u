'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';

// Thème Uber-style - Noir, blanc, minimaliste
const theme = createTheme({
  primaryColor: 'dark',
  defaultRadius: 'md',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontWeight: '700',
  },
  components: {
    Button: {
      defaultProps: {
        size: 'lg',
        radius: 'xl',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'lg',
        radius: 'xl',
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      {children}
    </MantineProvider>
  );
}
