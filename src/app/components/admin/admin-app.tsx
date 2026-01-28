import React, { useState } from 'react';
import { BottomNav, BottomNavItem } from '@/app/components/design-system/bottom-nav';
import { LayoutDashboard, ShoppingBag, Menu, Table, BarChart3 } from 'lucide-react';
import { AdminDashboard } from './admin-dashboard';
import { AdminOrders } from './admin-orders';
import { AdminMenu } from './admin-menu';
import { AdminTables } from './admin-tables';
import { AdminReports } from './admin-reports';

type AdminTab = 'dashboard' | 'orders' | 'menu' | 'tables' | 'reports';

interface AdminAppProps {
  onLogout: () => void;
}

export function AdminApp({ onLogout }: AdminAppProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  return (
    <div className="pb-16">
      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'orders' && <AdminOrders />}
      {activeTab === 'menu' && <AdminMenu />}
      {activeTab === 'tables' && <AdminTables />}
      {activeTab === 'reports' && <AdminReports onLogout={onLogout} />}

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
      </BottomNav>
    </div>
  );
}
