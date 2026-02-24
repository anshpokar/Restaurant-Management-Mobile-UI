import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BottomNav, BottomNavItem } from '@/app/components/design-system/bottom-nav';
import { LayoutDashboard, ShoppingBag, Menu, Table, BarChart3, Users } from 'lucide-react';
import { AdminDashboard } from './admin-dashboard';
import { AdminOrders } from './admin-orders';
import { AdminMenu } from './admin-menu';
import { AdminTables } from './admin-tables';
import { AdminReports } from './admin-reports';
import { AdminUserManagement } from './admin-user-management';

interface AdminAppProps {
  onLogout: () => void;
}

export function AdminApp({ onLogout }: AdminAppProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/orders')) return 'orders';
    if (path.includes('/admin/menu')) return 'menu';
    if (path.includes('/admin/tables')) return 'tables';
    if (path.includes('/admin/reports')) return 'reports';
    if (path.includes('/admin/users')) return 'users';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <div className="pb-16 min-h-screen bg-background">
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="menu" element={<AdminMenu />} />
        <Route path="tables" element={<AdminTables />} />
        <Route path="reports" element={<AdminReports onLogout={onLogout} />} />
        <Route path="users" element={<AdminUserManagement />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>

      <BottomNav>
        <BottomNavItem
          icon={<LayoutDashboard className="w-6 h-6" />}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => navigate('/admin/dashboard')}
        />
        <BottomNavItem
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Orders"
          active={activeTab === 'orders'}
          onClick={() => navigate('/admin/orders')}
        />
        <BottomNavItem
          icon={<Menu className="w-6 h-6" />}
          label="Menu"
          active={activeTab === 'menu'}
          onClick={() => navigate('/admin/menu')}
        />
        <BottomNavItem
          icon={<Table className="w-6 h-6" />}
          label="Tables"
          active={activeTab === 'tables'}
          onClick={() => navigate('/admin/tables')}
        />
        <BottomNavItem
          icon={<BarChart3 className="w-6 h-6" />}
          label="Reports"
          active={activeTab === 'reports'}
          onClick={() => navigate('/admin/reports')}
        />
        <BottomNavItem
          icon={<Users className="w-6 h-6" />}
          label="Users"
          active={activeTab === 'users'}
          onClick={() => navigate('/admin/users')}
        />
      </BottomNav>
    </div>
  );
}

