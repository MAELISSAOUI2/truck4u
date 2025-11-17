import { SocketNotificationProvider } from '@/app/components/notifications';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SocketNotificationProvider>{children}</SocketNotificationProvider>;
}
