import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { BottomNav, BottomNavItem } from '../design-system/bottom-nav';
import { Truck, Package, MapPin, User, CheckCircle2, LogOut as LogOutIcon } from 'lucide-react';
import { AppHeader } from '../design-system/app-header';
import { Card, CardBody } from '../design-system/card';
import { Badge } from '../design-system/badge';
import { Button } from '../design-system/button';

interface DeliveryAppProps {
  onLogout: () => void;
}

export function DeliveryApp({ onLogout }: DeliveryAppProps) {
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
        <Routes>
          <Route index element={<DeliveryTasks />} />
          <Route path="tasks" element={<DeliveryTasks />} />
          <Route path="history" element={<DeliveryHistory />} />
          <Route path="profile" element={<DeliveryProfile onLogout={onLogout} />} />
          <Route path="*" element={<Navigate to="/delivery" replace />} />
        </Routes>
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

function DeliveryTasks() {
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
        <p className="text-sm font-medium text-primary mb-1">Status: Online</p>
        <p className="text-xs text-muted-foreground">You are currently visible to new orders.</p>
      </div>

      <h3 className="font-bold text-foreground">Active Orders</h3>
      {[
        { id: '#12344', customer: 'Jane Smith', address: 'B-42, Sector 15, Noida', items: '2 items', status: 'ready' },
        { id: '#12345', customer: 'John Doe', address: 'C-10, Connaught Place', items: '3 items', status: 'picked_up' }
      ].map(order => (
        <Card key={order.id}>
          <CardBody className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-foreground">{order.id}</p>
                <p className="text-xs text-muted-foreground">{order.items}</p>
              </div>
              <Badge variant={order.status === 'ready' ? 'warning' : 'info'}>
                {order.status === 'ready' ? 'Ready to Pick' : 'In Transit'}
              </Badge>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{order.customer}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{order.address}</span>
              </div>
            </div>

            <Button className="w-full" size="sm">
              {order.status === 'ready' ? 'Pick Up Order' : 'Mark as Delivered'}
            </Button>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

function DeliveryHistory() {
  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
        <CardBody className="p-6">
          <p className="text-sm opacity-90">Today's Earnings</p>
          <p className="text-3xl font-bold">₹840.00</p>
          <p className="text-xs mt-2 opacity-80">Completed 12 deliveries today</p>
        </CardBody>
      </Card>

      <h3 className="font-bold text-foreground">Recent Deliveries</h3>
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Order #1234{i}</p>
              <p className="text-xs text-muted-foreground">Jan 28, 2026 • 2:30 PM</p>
            </div>
          </div>
          <p className="font-bold text-green-600">+₹70</p>
        </div>
      ))}
    </div>
  );
}

function DeliveryProfile({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto mb-4 flex items-center justify-center">
          <Truck className="w-12 h-12 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">Rajesh Kumar</h3>
        <p className="text-sm text-muted-foreground">ID: DEL-98765</p>
      </div>

      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start gap-3">
          <User className="w-5 h-5" /> Account Details
        </Button>
        <Button variant="outline" className="w-full justify-start gap-3 text-destructive" onClick={onLogout}>
          <LogOutIcon className="w-5 h-5" /> Logout
        </Button>
      </div>
    </div>
  );
}

