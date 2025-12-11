'use client';

import { useState } from 'react';
import { ActionIcon, Indicator } from '@mantine/core';
import { IconBell } from '@tabler/icons-react';
import { useNotificationStore } from '@/lib/store';
import { NotificationDrawer } from './NotificationDrawer';

export function NotificationBell() {
  const [opened, setOpened] = useState(false);
  const { unreadCount } = useNotificationStore();

  return (
    <>
      <Indicator
        inline
        label={unreadCount > 9 ? '9+' : unreadCount}
        size={20}
        color="red"
        disabled={unreadCount === 0}
        style={{ cursor: 'pointer' }}
      >
        <ActionIcon
          size="xl"
          radius="xl"
          variant="light"
          color="dark"
          onClick={() => setOpened(true)}
        >
          <IconBell size={24} />
        </ActionIcon>
      </Indicator>

      <NotificationDrawer opened={opened} onClose={() => setOpened(false)} />
    </>
  );
}
