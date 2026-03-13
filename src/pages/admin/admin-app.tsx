import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BottomNav, BottomNavItem } from '@/components/design-system/bottom-nav';
import { LayoutDashboard, ShoppingBag, Menu, Table, BarChart3, Users, LogOut, Calendar, CreditCard } from 'lucide-react';

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
    if (path.includes('/admin/bookings')) return 'bookings';
    if (path.includes('/admin/payment-verification')) return 'payment';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-black text-primary tracking-tighter">
            RESTO<span className="text-foreground">FLOW</span> ADMIN
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => navigate('/admin/dashboard')}
          />
          <SidebarItem
            icon={<ShoppingBag className="w-5 h-5" />}
            label="Orders"
            active={activeTab === 'orders'}
            onClick={() => navigate('/admin/orders')}
          />
          <SidebarItem
            icon={<Menu className="w-5 h-5" />}
            label="Menu"
            active={activeTab === 'menu'}
            onClick={() => navigate('/admin/menu')}
          />
          <SidebarItem
            icon={<Table className="w-5 h-5" />}
            label="Tables"
            active={activeTab === 'tables'}
            onClick={() => navigate('/admin/tables')}
          />
          <SidebarItem
            icon={<Calendar className="w-5 h-5" />}
            label="Bookings"
            active={activeTab === 'bookings'}
            onClick={() => navigate('/admin/bookings')}
          />
          <SidebarItem
            icon={<CreditCard className="w-5 h-5" />}
            label="Payment Verification"
            active={activeTab === 'payment'}
            onClick={() => navigate('/admin/payment-verification')}
          />
          <SidebarItem
            icon={<Users className="w-5 h-5" />}
            label="Users"
            active={activeTab === 'users'}
            onClick={() => navigate('/admin/users')}
          />
          <SidebarItem
            icon={<BarChart3 className="w-5 h-5" />}
            label="Reports"
            active={activeTab === 'reports'}
            onClick={() => navigate('/admin/reports')}
          />
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto">
        <div className="pb-16 lg:pb-0">
          <Outlet context={{ onLogout }} />
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
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
              icon={<Calendar className="w-6 h-6" />}
              label="Bookings"
              active={activeTab === 'bookings'}
              onClick={() => navigate('/admin/bookings')}
            />
            <BottomNavItem
              icon={<CreditCard className="w-6 h-6" />}
              label="Payment"
              active={activeTab === 'payment'}
              onClick={() => navigate('/admin/payment-verification')}
            />
            <BottomNavItem
              icon={<Users className="w-6 h-6" />}
              label="Users"
              active={activeTab === 'users'}
              onClick={() => navigate('/admin/users')}
            />
            <BottomNavItem
              icon={<BarChart3 className="w-6 h-6" />}
              label="Reports"
              active={activeTab === 'reports'}
              onClick={() => navigate('/admin/reports')}
            />
          </BottomNav>
        </div>
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold text-sm ${active
        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
    >
      {icon}
      {label}
    </button>
  );
}
