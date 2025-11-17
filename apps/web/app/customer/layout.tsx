import { Toaster } from 'react-hot-toast';
import { SocketNotificationProvider } from '@/app/components/notifications/SocketNotificationProvider';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketNotificationProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 4000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </SocketNotificationProvider>
  );
}
