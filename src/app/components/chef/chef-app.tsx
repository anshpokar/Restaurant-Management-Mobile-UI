import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Button } from '@/app/components/design-system/button';
import { Badge } from '@/app/components/design-system/badge';
import {
  LogOut,
  Flame,
  Utensils,
  Timer,
  RefreshCw,
  ChefHat,
  CheckCircle2
} from 'lucide-react';
import { supabase, type Order, type Profile } from '@/lib/supabase';

interface ChefAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function ChefApp({ onLogout, profile }: ChefAppProps) {
  return (
    <Routes>
      <Route index element={<ChefDashboard onLogout={onLogout} profile={profile} />} />
      <Route path="*" element={<Navigate to="/chef" replace />} />
    </Routes>
  );
}

function ChefDashboard({ onLogout }: ChefAppProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchActiveOrders();

    const subscription = supabase
      .channel('chef-orders')
      .on('postgres_changes' as any, { event: '*', table: 'orders' }, () => {
        fetchActiveOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchActiveOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (full_name),
          order_items (*),
          restaurant_tables (table_number)
        `)
        .in('status', ['placed', 'preparing', 'cooking'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      fetchActiveOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <AppHeader
        title="Kitchen Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={fetchActiveOrders} className="p-2 hover:bg-muted rounded-full transition-colors">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
                <ChefHat className="text-primary" /> Active Kitchen Orders
              </h2>
              <p className="text-muted-foreground">Manage ongoing preparations</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-card px-4 py-2 rounded-2xl shadow-sm border border-border text-center">
                <p className="text-xs font-bold text-muted-foreground uppercase">New</p>
                <p className="text-xl font-black text-primary">
                  {orders.filter(o => o.status === 'placed').length}
                </p>
              </div>
              <div className="bg-card px-4 py-2 rounded-2xl shadow-sm border border-border text-center">
                <p className="text-xs font-bold text-muted-foreground uppercase">In Progress</p>
                <p className="text-xl font-black text-orange-500">
                  {orders.filter(o => o.status === 'preparing' || o.status === 'cooking').length}
                </p>
              </div>
            </div>
          </div>

          {orders.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
              <Utensils className="w-20 h-20 mb-4" />
              <p className="text-xl font-bold">Kitchen is clear!</p>
              <p>No active orders to prepare.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {orders.map((order) => (
                <Card key={order.id} className="border-none shadow-xl overflow-hidden group">
                  <div className={`h-2 ${order.status === 'placed' ? 'bg-primary' :
                    order.status === 'preparing' ? 'bg-orange-400' :
                      'bg-orange-600 animate-pulse'
                    }`} />
                  <CardBody className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                          Order #{order.id.slice(0, 5)}
                        </p>
                        <h4 className="font-bold text-lg text-foreground">
                          {order.restaurant_tables ? `Table ${order.restaurant_tables.table_number}` : (order.profiles?.full_name || 'Customer')}
                        </h4>
                        {order.table_id && (
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                            Dine-in
                          </span>
                        )}
                      </div>
                      <Badge variant={
                        order.status === 'placed' ? 'info' :
                          order.status === 'preparing' ? 'warning' : 'error'
                      }>
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="space-y-2 py-4 border-y border-divider">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-primary">x{item.quantity}</span>
                            <span className="font-medium text-foreground">{item.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {order.status === 'placed' && (
                        <Button
                          className="flex-1 bg-orange-400 hover:bg-orange-500"
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                        >
                          <Timer className="w-4 h-4 mr-2" /> Start Preparing
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                          onClick={() => updateOrderStatus(order.id, 'cooking')}
                        >
                          <Flame className="w-4 h-4 mr-2" /> Start Cooking
                        </Button>
                      )}
                      {order.status === 'cooking' && (
                        <Button
                          className="flex-1 bg-green-500 hover:bg-green-600"
                          onClick={() => updateOrderStatus(order.id, 'prepared')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Ready/Prepared
                        </Button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

