import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, type Profile, getStoredUser } from '@/lib/supabase';
import { Clock, ChefHat, Bell, CheckCircle2, Timer } from 'lucide-react';
import { toast } from 'sonner';


interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  spice_level?: 'mild' | 'medium' | 'spicy' | 'extra_spicy';
  special_instructions?: string;
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
          await fetchOrders(false); // Silent fetch
          playNotificationSound();
        }
      )
      .on('postgres_changes' as any,
        { event: 'UPDATE', table: 'orders', schema: 'public' },
        async (payload: any) => {
          // Only refetch if the status was changed by someone else (e.g. admin or waiter)
          // or if it's a new order status we care about
          if (payload.new.status !== payload.old.status) {
            await fetchOrders(false);
          }
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
            image,
            spice_level,
            special_instructions
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
      setOrders((prevOrders: Order[]) => 
        prevOrders.map((order: Order) => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      // Update database in background
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      
      // Refetch silently in background is handled by real-time subscription
    } catch (error: any) {
      console.error('Error updating order:', error);
      // Revert on error
      setOrders((prevOrders: Order[]) => 
        prevOrders.map((order: Order) => 
          order.id === orderId ? { ...order, status: order.status } : order
        )
      );
      toast.error('Failed to update order status');
    }

  };


  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const stats = {
    pending: orders.filter((o: Order) => o.status === 'placed').length,
    preparing: orders.filter((o: Order) => o.status === 'preparing').length,
    ready: orders.filter((o: Order) => o.status === 'prepared').length
  };

  return (
    <div className="min-h-screen bg-background pb-10 w-full font-header">
      {/* Section Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-brand-maroon uppercase">
            Order <span className="text-brand-gold">Queue</span>
          </h1>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-0.5">
            {filteredOrders.length} orders in status: {filter}
          </p>
        </div>
        
        {/* Connection status dot */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Live Sync</span>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Stats Cards - Full Width on Desktop */}
        {/* Stats Section - Premium Gradients */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative overflow-hidden p-6 rounded-[2rem] bg-blue-500/5 border border-blue-500/20 shadow-xl"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Clock className="w-20 h-20 text-blue-600" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                <Clock className="w-6 h-6" />
              </div>
              <span className="text-4xl font-black text-blue-600 tracking-tighter">{stats.pending}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/60 mt-2">Incoming Orders</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="group relative overflow-hidden p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 shadow-xl"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Timer className="w-20 h-20 text-amber-600" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30">
                <Timer className="w-6 h-6" />
              </div>
              <span className="text-4xl font-black text-amber-600 tracking-tighter">{stats.preparing}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/60 mt-2">Currently Preparing</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="group relative overflow-hidden p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/20 shadow-xl"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <CheckCircle2 className="w-20 h-20 text-emerald-600" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="text-4xl font-black text-emerald-600 tracking-tighter">{stats.ready}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 mt-2">Ready to Serve</span>
            </div>
          </motion.div>
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

        {/* Filter Navigation */}
        <div className="flex bg-muted/30 p-1.5 rounded-2xl backdrop-blur-md border border-divider">
          {(['all', 'placed', 'preparing', 'prepared'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === f
                  ? 'bg-brand-maroon text-white shadow-xl scale-[1.02]'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <span className="block mb-0.5">
                {f === 'placed' ? 'Incoming' : f === 'prepared' ? 'Finished' : f}
              </span>
              {f !== 'all' && (
                <span className={`text-[9px] ${filter === f ? 'text-brand-gold' : 'text-primary'}`}>
                  {stats[f as keyof typeof stats]} Active
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order: Order) => (
                <motion.div
                  key={order.id}
                  layout="position"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 30,
                    layout: { duration: 0.3 }
                  }}
                  className="group relative flex flex-col bg-card rounded-[2.5rem] border border-divider shadow-2xl hover:shadow-brand-maroon/5 p-6 transition-shadow duration-300"
                >
                  {/* Status Indicator Bar */}
                  <div className={`absolute top-0 left-12 right-12 h-1 rounded-b-full ${
                    order.status === 'placed' ? 'bg-blue-500' : 
                    order.status === 'preparing' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />

                  {/* Order Card Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 bg-muted flex items-center justify-center rounded-3xl group-hover:bg-brand-gold/20 transition-colors duration-500">
                        {order.is_delivery ? (
                          <div className="w-10 h-10 bg-brand-maroon rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-black text-xs">DEL</span>
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-brand-maroon/10 rounded-2xl flex items-center justify-center">
                            <span className="text-brand-maroon font-black text-lg">{order.table_number || '•'}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-brand-maroon">
                          {order.is_delivery ? 'DELIVERY ORDER' : `TABLE ${order.table_number}`}
                        </h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          #{order.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-brand-maroon bg-brand-gold/10 px-3 py-1.5 rounded-full mb-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">{order.elapsed_minutes}M</span>
                      </div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{order.order_type}</p>
                    </div>
                  </div>

                  {/* Order Items List */}
                  <div className="flex-1 space-y-4 mb-8 bg-muted/30 p-5 rounded-[2rem] border border-divider/50">
                    {order.order_items.map((item: any, idx: number) => (
                      <div key={idx} className="space-y-2 group/item">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 flex items-center justify-center bg-white text-brand-maroon rounded-xl shadow-sm text-xs font-black ring-1 ring-divider ring-inset">
                              {item.quantity}
                            </span>
                            <span className="text-sm font-bold text-foreground group-hover/item:text-brand-maroon transition-colors">
                              {item.name}
                            </span>
                          </div>
                          
                          {/* Spice Level Visualization */}
                          {item.spice_level && item.spice_level !== 'mild' && (
                            <div className="flex gap-0.5">
                              {Array.from({ length: 
                                item.spice_level === 'extra_spicy' ? 3 : 
                                item.spice_level === 'spicy' ? 2 : 1 
                              }).map((_, i) => (
                                <span key={i} className="text-xs">🌶️</span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Special Instructions Note */}
                        {item.special_instructions && (
                          <div className="ml-11 p-2 bg-brand-gold/10 rounded-lg border-l-2 border-brand-gold">
                            <p className="text-[10px] font-bold text-brand-maroon/70 leading-tight">
                              📝 {item.special_instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Actions Area */}
                  <div className="mt-auto space-y-3">
                    {order.status === 'placed' && (
                      <div className="grid grid-cols-2 gap-3">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="px-4 py-4 bg-brand-maroon text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-brand-maroon/20 hover:bg-brand-maroon/90"
                        >
                          Start Cook
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => updateOrderStatus(order.id, 'prepared')}
                          className="px-4 py-4 bg-white border-2 border-brand-maroon text-brand-maroon rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-muted"
                        >
                          Mark Ready
                        </motion.button>
                      </div>
                    )}

                    {order.status === 'preparing' && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateOrderStatus(order.id, 'prepared')}
                        className="w-full px-4 py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 flex items-center justify-center gap-3"
                      >
                        <ChefHat className="w-4 h-4" />
                        Complete Order
                      </motion.button>
                    )}

                    {order.status === 'prepared' && (
                      <div className="w-full py-4 text-center bg-emerald-50 text-emerald-700 rounded-[1.5rem] border border-emerald-200 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Order is Ready
                      </div>
                    )}
                  </div>

                  {/* Hover Decoration */}
                  <div className="absolute inset-0 rounded-[2.5rem] transition-colors group-hover:bg-brand-maroon/[0.01] pointer-events-none" />
                </motion.div>
              ))}
            </AnimatePresence>
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
