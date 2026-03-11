import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { User, MapPin, Bell, Heart, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { type Profile } from '@/lib/supabase';
import { useOutletContext } from 'react-router-dom';

export function ProfileScreen() {
  const { onLogout, profile } = useOutletContext<{ onLogout: () => void, profile: Profile | null }>();
  const menuItems = [
    { icon: User, label: 'Edit Profile', action: () => { } },
    { icon: MapPin, label: 'Saved Addresses', action: () => { } },
    { icon: Bell, label: 'Notifications', action: () => { } },
    { icon: Heart, label: 'Favorites', action: () => { } },
    { icon: HelpCircle, label: 'Help & Support', action: () => { } },
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
              {profile?.full_name || 'Guest User'}
            </h3>
            <p className="text-sm text-muted-foreground mb-1">
              {profile?.email || 'No email available'}
            </p>
            <p className="text-sm text-muted-foreground">
              {profile?.phone_number || 'No phone number'}
            </p>
            {profile?.username && (
              <p className="text-xs text-primary mt-2 font-medium">
                @{profile.username}
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
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center">
                      <Icon className="w-5 h-5 text-foreground" />
                    </div>
                    <span className="font-medium text-foreground">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
