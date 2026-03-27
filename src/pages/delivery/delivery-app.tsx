import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BottomNav, BottomNavItem } from '@/components/design-system/bottom-nav';
import { Truck, Package, User } from 'lucide-react';
import { AppHeader } from '@/components/design-system/app-header';

import { Profile } from '@/lib/supabase';

interface DeliveryAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function DeliveryApp({ onLogout, profile }: DeliveryAppProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/delivery/history')) return 'history';
    if (path.includes('/delivery/profile')) return 'profile';
    return 'tasks';
  };

  const activeTab = getActiveTab();

  return (
    <div className="flex flex-col min-h-screen bg-background pb-16">
      <AppHeader title={activeTab === 'tasks' ? 'Delivery Tasks' : activeTab === 'history' ? 'Earnings History' : 'Profile'} />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        <Outlet context={{ onLogout, profile }} />
      </div>

      <BottomNav>
        <BottomNavItem
          icon={<Truck className="w-6 h-6" />}
          label="Tasks"
          active={activeTab === 'tasks'}
          onClick={() => navigate('/delivery/tasks')}
        />
        <BottomNavItem
          icon={<Package className="w-6 h-6" />}
          label="History"
          active={activeTab === 'history'}
          onClick={() => navigate('/delivery/history')}
        />
        <BottomNavItem
          icon={<User className="w-6 h-6" />}
          label="Profile"
          active={activeTab === 'profile'}
          onClick={() => navigate('/delivery/profile')}
        />
      </BottomNav>
    </div>
  );
}

