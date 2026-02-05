import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Badge } from '@/app/components/design-system/badge';
import { Package, Clock, CheckCircle2, Truck, Phone, User } from 'lucide-react';
import { supabase, type Order } from '@/lib/supabase';

export function OrdersScreen() {
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyOrders();

    const subscription = supabase
      .channel('my-orders')
      .on('postgres_changes' as any, { event: '*', table: 'orders' }, () => {
        fetchMyOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_person:profiles!delivery_person_id (full_name, phone_number),
          order_items (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="My Orders" />

      <div className="px-4 py-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-2xl">
          {['all', 'ongoing', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === tab
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders
            .filter((order) => {
              if (filter === 'all') return true;
              if (filter === 'ongoing') return order.status !== 'delivered' && order.status !== 'cancelled';
              return order.status === 'delivered' || order.status === 'cancelled';
            })
            .map((order) => (
              <Card key={order.id} className="border-none shadow-sm overflow-hidden">
                <div className={`h-1.5 ${
                  order.status === 'delivered' ? 'bg-green-500' :
                  order.status === 'cancelled' ? 'bg-red-500' :
                  order.status === 'out_for_delivery' ? 'bg-secondary' : 'bg-primary'
                }`} />
                <CardBody className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-muted-foreground uppercase">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant={
                      order.status === 'delivered' ? 'success' :
                      order.status === 'cancelled' ? 'error' :
                      order.status === 'out_for_delivery' ? 'paid' : 'pending'
                    }>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2 py-3 border-y border-divider">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm text-foreground">
                        <span className="flex items-center gap-2">
                          <span className="font-bold">x{item.quantity}</span>
                          {item.name}
                        </span>
                        <span className="font-medium text-muted-foreground">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2">
                      <span className="font-bold">Total Amount</span>
                      <span className="font-black text-primary">₹{order.total_amount}</span>
                    </div>
                  </div>

                  {/* Delivery Tracking Section */}
                  {(order.status === 'out_for_delivery' || order.status === 'delivered') && order.delivery_person && (
                    <div className="bg-primary/5 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                          <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-primary uppercase">
                            {order.status === 'out_for_delivery' ? 'Out for Delivery' : 'Delivered By'}
                          </p>
                          <p className="font-bold text-foreground">{(order.delivery_person as any).full_name}</p>
                        </div>
                        <a 
                          href={`tel:${(order.delivery_person as any).phone_number}`}
                          className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {order.status === 'placed' && <Clock className="w-3 h-3" />}
                      {order.status === 'delivered' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      <span>
                        {order.status === 'placed' ? 'Waiting for kitchen' : 
                         order.status === 'preparing' ? 'Chef is preparing' :
                         order.status === 'cooking' ? 'Dish is being cooked' :
                         order.status === 'prepared' ? 'Ready for pickup' :
                         order.status === 'out_for_delivery' ? 'On its way!' : 'Completed'}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>

        {/* Empty State */}
        {orders.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground font-bold">No orders found yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
