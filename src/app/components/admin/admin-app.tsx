import React, { useState } from 'react';
import { BottomNav, BottomNavItem } from '@/app/components/design-system/bottom-nav';
import { LayoutDashboard, ShoppingBag, Menu, Table, BarChart3, Users } from 'lucide-react';
import { AdminDashboard } from './admin-dashboard';
import { AdminOrders } from './admin-orders';
import { AdminMenu } from './admin-menu';
import { AdminTables } from './admin-tables';
import { AdminReports } from './admin-reports';
import { AdminUserManagement } from './admin-user-management';

type AdminTab = 'dashboard' | 'orders' | 'menu' | 'tables' | 'reports' | 'users';

interface AdminAppProps {
  onLogout: () => void;
}

export function AdminApp({ onLogout }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    return (localStorage.getItem('adminActiveTab') as AdminTab) || 'dashboard';
  });

  React.useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  return (
    <div className="pb-16">
      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'orders' && <AdminOrders />}
      {activeTab === 'menu' && <AdminMenu />}
      {activeTab === 'tables' && <AdminTables />}
      {activeTab === 'reports' && <AdminReports onLogout={onLogout} />}
      {activeTab === 'users' && <AdminUserManagement />}

      <BottomNav>
        <BottomNavItem
          icon={<LayoutDashboard className="w-6 h-6" />}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => setActiveTab('dashboard')}
        />
        <BottomNavItem
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Orders"
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
        />
        <BottomNavItem
          icon={<Menu className="w-6 h-6" />}
          label="Menu"
          active={activeTab === 'menu'}
          onClick={() => setActiveTab('menu')}
        />
        <BottomNavItem
          icon={<Table className="w-6 h-6" />}
          label="Tables"
          active={activeTab === 'tables'}
          onClick={() => setActiveTab('tables')}
        />
        <BottomNavItem
          icon={<BarChart3 className="w-6 h-6" />}
          label="Reports"
          active={activeTab === 'reports'}
          onClick={() => setActiveTab('reports')}
        />
        <BottomNavItem
          icon={<Users className="w-6 h-6" />}
          label="Users"
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
        />
      </BottomNav>
    </div>
  );
}
