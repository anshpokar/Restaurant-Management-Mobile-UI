import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Button } from '@/app/components/design-system/button';
import { Badge } from '@/app/components/design-system/badge';
import { supabase, type Order, type Profile } from '@/lib/supabase';
import { RefreshCw, UserPlus, Truck, CheckCircle2 } from 'lucide-react';

export function AdminOrders() {
  const [activeTab, setActiveTab] = useState<Order['status']>('placed');
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryStaff, setDeliveryStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const statuses: Order['status'][] = ['placed', 'preparing', 'cooking', 'prepared', 'out_for_delivery', 'delivered'];

  useEffect(() => {
    fetchOrders();
    fetchDeliveryStaff();

    const subscription = supabase
      .channel('admin-orders')
      .on('postgres_changes' as any, { event: '*', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (full_name),
          delivery_person:profiles!delivery_person_id (full_name, phone_number),
          order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'delivery');
      if (error) throw error;
      setDeliveryStaff(data || []);
    } catch (error) {
      console.error('Error fetching delivery staff:', error);
    }
  };

  const assignDeliveryPerson = async (orderId: string, staffId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          delivery_person_id: staffId,
          status: 'out_for_delivery'
        })
        .eq('id', orderId);

      if (error) throw error;
      setAssigningId(null);
      fetchOrders();
    } catch (error) {
      console.error('Error assigning staff:', error);
      alert('Failed to assign delivery person');
    }
  };

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <AppHeader 
        title="Order Management" 
        actions={
          <button onClick={fetchOrders} className="p-2 hover:bg-muted rounded-full transition-colors">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === status
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {status.replace(/_/g, ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders
            .filter((order) => order.status === activeTab)
            .map((order) => (
              <Card key={order.id} className="border-none shadow-sm overflow-hidden">
                <div className="bg-primary/5 px-4 py-2 flex justify-between items-center border-b border-primary/10">
                  <span className="text-xs font-black text-primary uppercase">Order #{order.id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <CardBody className="p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg text-foreground leading-tight">
                        {order.profiles?.full_name || 'Anonymous Customer'}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{order.delivery_address || 'No address provided'}</p>
                    </div>
                    <Badge variant={order.status === 'delivered' ? 'success' : 'warning'}>
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-1 py-3 border-y border-divider">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground"><span className="font-black text-foreground">x{item.quantity}</span> {item.name}</span>
                        <span className="font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="font-black text-primary text-lg">₹{order.total_amount}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    {order.status === 'prepared' && (
                      <div className="space-y-3">
                        <p className="text-xs font-black text-muted-foreground uppercase flex items-center gap-2">
                          <Truck className="w-3 h-3" /> Assign Delivery Person
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {deliveryStaff.length > 0 ? (
                            deliveryStaff.map(staff => (
                              <button
                                key={staff.id}
                                onClick={() => assignDeliveryPerson(order.id, staff.id)}
                                className="flex items-center justify-between p-3 bg-primary/5 hover:bg-primary/10 rounded-xl border border-primary/20 transition-all text-left group"
                              >
                                <div>
                                  <p className="font-bold text-sm group-hover:text-primary transition-colors">{staff.full_name}</p>
                                  <p className="text-xs text-muted-foreground">{staff.phone_number}</p>
                                </div>
                                <UserPlus className="w-4 h-4 text-primary" />
                              </button>
                            ))
                          ) : (
                            <p className="text-sm text-center py-4 bg-muted/20 rounded-xl text-muted-foreground italic">
                              No delivery persons available
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {order.status === 'out_for_delivery' && order.delivery_person && (
                      <div className="flex items-center gap-3 p-3 bg-secondary/10 rounded-xl border border-secondary/20">
                        <div className="w-10 h-10 bg-secondary/20 rounded-full flex items-center justify-center text-xl">
                          🚚
                        </div>
                        <div>
                          <p className="text-xs font-black text-secondary uppercase">Assigned To</p>
                          <p className="font-bold text-sm">{(order.delivery_person as any).full_name}</p>
                        </div>
                      </div>
                    )}

                    {order.status === 'delivered' && (
                      <div className="flex items-center justify-center gap-2 py-2 text-green-600 font-bold">
                        <CheckCircle2 className="w-5 h-5" /> Order Completed
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
