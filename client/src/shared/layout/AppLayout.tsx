import { AppShell, Button, Group, NavLink, Text } from '@mantine/core';
import {
  IconChartBar,
  IconLogout,
  IconPackage,
  IconReceipt,
  IconShoppingCart,
  IconTruck,
  IconUsers,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ size?: number }>;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: IconChartBar },
  { label: 'Products', path: '/products', icon: IconPackage },
  { label: 'Purchase Orders', path: '/purchase-orders', icon: IconTruck },
  { label: 'Sales Orders', path: '/sales-orders', icon: IconShoppingCart },
  { label: 'Customers', path: '/customers', icon: IconUsers },
  { label: 'Suppliers', path: '/suppliers', icon: IconReceipt },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <AppShell header={{ height: 64 }} navbar={{ width: 280, breakpoint: 'sm' }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Text fw={700}>KaiznTree Inventory</Text>
          <Button
            variant="light"
            leftSection={<IconLogout size={16} />}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </Button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              label={item.label}
              leftSection={<Icon size={16} />}
              active={isActive}
              onClick={() => navigate(item.path)}
            />
          );
        })}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
