'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/lib/store';
import { NotificationPanel } from './NotificationPanel';

export function NotificationBell() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const { unreadCount } = useNotificationStore();

  return (
    <>
      <button
        onClick={() => setIsPanelOpen(true)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
    </>
  );
}
