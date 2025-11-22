'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Title,
  Text,
  ActionIcon,
  Stack,
  Loader,
  Center,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconCheckupList,
  IconUsers,
  IconTruck,
  IconChartBar,
  IconLogout,
} from '@tabler/icons-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [opened, { toggle, close }] = useDisclosure();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token && !pathname?.includes('/login')) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader size="lg" color="dark" />
      </Center>
    );
  }

  if (!isAuthenticated && !pathname?.includes('/login')) {
    return null;
  }

  // Login page doesn't need layout
  if (pathname?.includes('/login')) {
    return <>{children}</>;
  }

  const navItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: IconLayoutDashboard },
    { href: '/admin/kyc', label: 'Vérification KYC', icon: IconCheckupList },
    { href: '/admin/drivers', label: 'Conducteurs', icon: IconUsers },
    { href: '/admin/rides', label: 'Courses', icon: IconTruck },
    { href: '/admin/analytics', label: 'Analytiques', icon: IconChartBar },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3} style={{ fontSize: '1.25rem' }}>Truck4u Admin</Title>
          </Group>
          <ActionIcon
            variant="subtle"
            color="red"
            size="lg"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <IconLogout size={20} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <NavLink
                key={item.href}
                label={item.label}
                leftSection={<Icon size={20} />}
                active={isActive}
                onClick={() => {
                  router.push(item.href);
                  close();
                }}
                style={{ borderRadius: 8 }}
              />
            );
          })}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
