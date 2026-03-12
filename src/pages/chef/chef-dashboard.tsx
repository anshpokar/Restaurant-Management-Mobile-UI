import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { supabase, type Profile, getStoredUser } from '@/lib/supabase';
import { Clock, ChefHat, Bell, CheckCircle2, Timer, Utensils } from 'lucide-react';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
  special_instructions?: string;
  spice_level?: string;
}

interface Order {
  id: string;
  table_number: number;
  customer_name: string;
  customer_email?: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
  elapsed_minutes: number;
}

export function ChefDashboardScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
  const [audioPermission, setAudioPermission] = useState(false);

  useEffect(() => {
    fetchOrders();

    // Real-time subscription for new orders
    const subscription = supabase
      .channel('chef-orders')
      .on('postgres_changes' as any, 
        { event: 'INSERT', table: 'orders', schema: 'public' },
        async (payload) => {
          console.log('New order received!', payload);
          await fetchOrders();
          playNotificationSound();
        }
      )
      .on('postgres_changes' as any,
        { event: 'UPDATE', table: 'orders', schema: 'public' },
        async () => {
          await fetchOrders();
        }
      )
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
          restaurant_tables!left (
            table_number
          ),
          order_items (*)
        `)
        // Remove order_type filter to show both dine_in and delivery
        // Only exclude completed/cancelled orders
        .neq('status', 'delivered')
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data
      const transformedOrders = data?.map(order => ({
        ...order,
        table_number: (order.restaurant_tables as any)?.table_number || null,
        is_delivery: order.order_type === 'delivery',
        elapsed_minutes: Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
      })) || [];

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const playNotificationSound = async () => {
    if (!audioPermission) return;
    
    try {
      const audio = new Audio('/notification-sound.mp3');
      await audio.play();
    } catch (error) {
      console.log('Could not play sound:', error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      await fetchOrders();
      
      // Show success feedback
      alert(`Order status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
        return 'bg-blue-500 text-white';
      case 'preparing':
        return 'bg-yellow-500 text-white';
      case 'prepared':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'placed':
        return 'info';
      case 'preparing':
        return 'warning';
      case 'prepared':
        return 'success';
      default:
        return 'info';
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const stats = {
    pending: orders.filter(o => o.status === 'placed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'prepared').length
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Kitchen Dashboard" />

      <div className="px-4 py-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardBody className="p-3 text-center">
              <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-3 text-center">
              <div className="w-8 h-8 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Timer className="w-4 h-4 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.preparing}</p>
              <p className="text-xs text-muted-foreground">Preparing</p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-3 text-center">
              <div className="w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.ready}</p>
              <p className="text-xs text-muted-foreground">Ready</p>
            </CardBody>
          </Card>
        </div>

        {/* Enable Sound Toggle */}
        <div className="flex items-center justify-between bg-surface p-3 rounded-xl border">
          <div className="flex items-center gap-2">
            <Bell className={`w-5 h-5 ${audioPermission ? 'text-green-600' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">Notification Sound</span>
          </div>
          <button
            onClick={() => setAudioPermission(!audioPermission)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              audioPermission ? 'bg-green-600' : 'bg-divider'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              audioPermission ? 'left-7' : 'left-1'
            }`} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['all', 'pending', 'preparing', 'ready'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === f
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1 text-xs opacity-80">
                  ({stats[f as keyof typeof stats]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders Queue */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-10 bg-surface rounded-2xl border border-dashed">
            <ChefHat className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm font-medium text-foreground">No orders in this section</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === 'all' ? 'Waiting for new orders...' : `No ${filter} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-primary">
                <CardBody className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                        <Utensils className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-foreground">
                            Table {order.table_number}
                          </h3>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.customer_name}
                          {order.customer_email && ' ✓'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">₹{order.total_amount}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {order.elapsed_minutes}m ago
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="bg-surface rounded-xl p-3 space-y-2">
                    {order.order_items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{item.quantity}x</span>
                            <span className="text-foreground">{item.name}</span>
                          </div>
                          {item.special_instructions && (
                            <p className="text-xs text-orange-600 mt-1">
                              📝 {item.special_instructions}
                            </p>
                          )}
                          {item.spice_level && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className={`w-2 h-2 rounded-full ${
                                item.spice_level === 'mild' ? 'bg-green-500' :
                                item.spice_level === 'medium' ? 'bg-yellow-500' :
                                item.spice_level === 'spicy' ? 'bg-orange-500' :
                                'bg-red-500'
                              }`} />
                              <span className="text-xs text-muted-foreground capitalize">
                                {item.spice_level.replace('_', ' ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-divider">
                    {order.status === 'placed' && (
                      <>
                        <Button
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="flex-1"
                          size="sm"
                        >
                          Start Preparing
                        </Button>
                        <Button
                          onClick={() => updateOrderStatus(order.id, 'prepared')}
                          variant="outline"
                          size="sm"
                        >
                          Mark Ready
                        </Button>
                      </>
                    )}
                    
                    {order.status === 'preparing' && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, 'prepared')}
                        className="w-full"
                        size="sm"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Ready to Serve
                      </Button>
                    )}

                    {order.status === 'prepared' && (
                      <div className="w-full text-center text-green-600 text-sm font-medium py-2">
                        ✓ Ready for serving
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-blue-900">
            💡 Pro Tip: Update order status promptly so waiters know when to serve.
          </p>
        </div>
      </div>
    </div>
  );
}
