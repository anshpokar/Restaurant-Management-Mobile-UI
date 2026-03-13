import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { User, MapPin, Bell, Heart, HelpCircle, LogOut, ChevronRight, CreditCard } from 'lucide-react';
import { type Profile } from '@/lib/supabase';
import { useOutletContext } from 'react-router-dom';
import { useNotifications } from '@/hooks/use-notifications';

export function ProfileScreen() {
  const navigate = useNavigate();
  const { onLogout, profile } = useOutletContext<{
    onLogout: () => void,
    profile: Profile | null
  }>();
  const { unreadCount } = useNotifications(profile?.id || null);
  
  // Function to capitalize first letter of each word
  const capitalizeName = (name?: string) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const menuItems = [
    { icon: User, label: 'Edit Profile', action: () => {} },
    { 
      icon: MapPin, 
      label: 'Saved Addresses', 
      action: () => navigate('/customer/addresses') 
    },
    { 
      icon: CreditCard, 
      label: 'Payment History', 
      action: () => navigate('/customer/payment-history') 
    },
    { 
      icon: Bell, 
      label: 'Notifications', 
      action: () => navigate('/customer/notifications'),
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    { 
      icon: Heart, 
      label: 'Favorites', 
      action: () => navigate('/customer/favorites') 
    },
    { 
      icon: HelpCircle, 
      label: 'Help & Support', 
      action: () => navigate('/customer/help-support') 
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Profile" />

      <div className="px-4 py-4 space-y-6">
        {/* User Info Card */}
        <Card>
          <CardBody className="p-6 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-1">
              {capitalizeName(profile?.full_name) || 'Guest User'}
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              {profile?.email || 'No email available'}
            </p>
            <p className="text-sm text-muted-foreground">
              {profile?.phone_number || 'No phone number'}
            </p>
            {profile?.username && (
              <p className="text-xs text-primary mt-2 font-medium">
                @{profile.username.toLowerCase()}
              </p>
            )}
          </CardBody>
        </Card>

        {/* Menu Items */}
        <Card>
          <CardBody className="p-0 divide-y divide-divider">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl relative"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="font-medium text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && item.badge > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </CardBody>
        </Card>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full !text-destructive !border-destructive hover:!bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          App Version 1.0.0
        </p>
      </div>
    </div>
  );
}
