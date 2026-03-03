import { AppShell, Button, NavLink, Text } from '@mantine/core';
import {
  IconChartBar,
  IconDatabase,
  IconLogout,
  IconPackage,
  IconReceipt,
  IconShoppingCart,
  IconTruck,
  IconUsers,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/useAuth';

type NavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ size?: number }>;
};

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: IconChartBar },
  { label: 'Products', path: '/products', icon: IconPackage },
  { label: 'Stock', path: '/stocks', icon: IconDatabase },
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
    <AppShell navbar={{ width: 280, breakpoint: 'sm' }} padding="md">
      <AppShell.Navbar p="sm">
        <div className="h-full flex flex-col">
          <Text fw={700} mb="md">
            Kaizntree
          </Text>

          <div className="flex-1">
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
          </div>

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
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
