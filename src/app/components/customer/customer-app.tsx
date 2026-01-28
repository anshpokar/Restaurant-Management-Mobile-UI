import React, { useState } from 'react';
import { BottomNav, BottomNavItem } from '../design-system/bottom-nav';
import { Home, Menu, Calendar, ShoppingBag, User } from 'lucide-react';
import { HomeScreen } from './home-screen';
import { MenuScreen } from './menu-screen';
import { BookingsScreen } from './bookings-screen';
import { OrdersScreen } from './orders-screen';
import { ProfileScreen } from './profile-screen';

type CustomerTab = 'home' | 'menu' | 'bookings' | 'orders' | 'profile';

interface CustomerAppProps {
  onLogout: () => void;
}

export function CustomerApp({ onLogout }: CustomerAppProps) {
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');

  return (
    <div className="pb-16">
      {activeTab === 'home' && <HomeScreen onNavigate={(tab: CustomerTab) => setActiveTab(tab)} />}
      {activeTab === 'menu' && <MenuScreen />}
      {activeTab === 'bookings' && <BookingsScreen />}
      {activeTab === 'orders' && <OrdersScreen />}
      {activeTab === 'profile' && <ProfileScreen onLogout={onLogout} />}

      <BottomNav>
        <BottomNavItem
          icon={<Home className="w-6 h-6" />}
          label="Home"
          active={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
        />
        <BottomNavItem
          icon={<Menu className="w-6 h-6" />}
          label="Menu"
          active={activeTab === 'menu'}
          onClick={() => setActiveTab('menu')}
        />
        <BottomNavItem
          icon={<Calendar className="w-6 h-6" />}
          label="Book Table"
          active={activeTab === 'bookings'}
          onClick={() => setActiveTab('bookings')}
        />
        <BottomNavItem
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Orders"
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
        />
        <BottomNavItem
          icon={<User className="w-6 h-6" />}
          label="Profile"
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        />
      </BottomNav>
    </div>
  );
}
