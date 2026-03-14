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
  image?: string;
}

interface Order {
  id: string;
  table_number: number | null;
  customer_name: string;
  customer_email?: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_type: string;
  table_id: string | null;
  delivery_address: string | null;
  order_items: OrderItem[];
  elapsed_minutes: number;
  restaurant_tables?: { table_number: number } | null;
  is_delivery?: boolean;
}

export function ChefDashboardScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'placed' | 'preparing' | 'prepared'>('all');
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

  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // First, fetch orders without the join
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          order_type,
          table_id,
          delivery_address,
          customer_name,
          customer_email,
          order_items (
            id,
            name,
            quantity,
            price,
            image
          )
        `)
        .in('status', ['placed', 'preparing', 'prepared'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Then, fetch table information separately for orders with table_id
      const transformedOrders = await Promise.all(
        (ordersData || []).map(async (order) => {
          let table_number = null;
          
          // If it's a dine-in order with table_id, fetch table info
          if (order.order_type === 'dine_in' && order.table_id) {
            const { data: tableData } = await supabase
              .from('restaurant_tables')
              .select('table_number')
              .eq('id', order.table_id)
              .single();
            
            table_number = tableData?.table_number || null;
          }

          return {
            ...order,
            table_number,
            is_delivery: order.order_type === 'delivery',
            elapsed_minutes: Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000)
          };
        })
      );

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (showLoading) setLoading(false);
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
      // Optimistic update - update state immediately for instant feedback
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      // Update database in background
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Refetch silently in background without showing loading state
      setTimeout(() => {
        fetchOrders(false);
      }, 1000);
    } catch (error: any) {
      console.error('Error updating order:', error);
      // Revert on error
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: order.status } : order
        )
      );
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
    <div className="min-h-screen bg-background pb-4 w-full">
      <AppHeader title="Kitchen Dashboard" />

      <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Stats Cards - Full Width on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 w-full max-w-7xl mx-auto">
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

        {/* Filter Tabs - Responsive */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'placed', 'preparing', 'prepared'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 min-w-[100px] px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                filter === f
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {f === 'placed' ? 'Pending' : f === 'prepared' ? 'Ready' : f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1 text-xs opacity-80">
                  ({stats[f as keyof typeof stats]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders Queue - Responsive Grid Layout */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full max-w-[1800px] mx-auto">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="border-l-4 border-l-primary">
                <CardBody className="p-4 space-y-3">
                  {/* Header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                        <Utensils className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-foreground truncate">
                          {order.is_delivery ? '🚚 Delivery' : `Table ${order.table_number || 'N/A'}`}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {order.customer_name}
                        </p>
                      </div>
                    </div>
                    <div className="w-fit">
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Timing Info */}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-surface p-2 rounded-lg">
                    <Clock className="w-3 h-3" />
                    <span>{order.elapsed_minutes} minutes ago</span>
                  </div>

                  {/* Order Items */}
                  <div className="bg-surface rounded-xl p-3 space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Items:</h4>
                    {order.order_items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="font-bold text-primary text-sm bg-primary/10 px-2 py-0.5 rounded">
                          {item.quantity}x
                        </span>
                        <span className="text-sm text-foreground flex-1">{item.name}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons - Clickable */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-divider">
                    {order.status === 'placed' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateOrderStatus(order.id, 'preparing');
                          }}
                          className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors active:scale-95"
                        >
                          Start Preparing
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            updateOrderStatus(order.id, 'prepared');
                          }}
                          className="w-full px-4 py-2 bg-transparent border-2 border-primary text-primary rounded-lg font-medium hover:bg-primary/5 transition-colors active:scale-95"
                        >
                          Mark Ready
                        </button>
                      </>
                    )}
                    
                    {order.status === 'preparing' && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateOrderStatus(order.id, 'prepared');
                        }}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Ready to Serve
                      </button>
                    )}

                    {order.status === 'prepared' && (
                      <div className="w-full text-center text-green-600 text-sm font-medium py-3 bg-green-50 rounded-lg border-2 border-green-200">
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
