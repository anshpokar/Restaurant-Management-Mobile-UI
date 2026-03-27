import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { Input } from '@/components/design-system/input';
import { supabase, type Order } from '@/lib/supabase';
import { RefreshCw, Search, Calendar, List, ShoppingBag, Clock, Package, Truck, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AdminOrders() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7days' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');

  const statuses = ['all', 'pending', 'preparing', 'prepared', 'out_for_delivery', 'delivered'];

  useEffect(() => {
    fetchOrders();

    // Set up real-time subscription for live updates
    const channel = supabase
      .channel('admin-orders-live')
      .on(
        'postgres_changes' as any,
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        },
        () => {
          // Refetch when any change happens
          fetchOrders(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // Fetch orders first
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // If we have orders, enrich with profile and order_items data
      if (ordersData && ordersData.length > 0) {
        const enrichedOrders = await Promise.all(
          ordersData.map(async (order) => {
            try {
              // Fetch customer profile separately
              let customerProfile = null;
              if (order.user_id) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('id, full_name, phone_number, email')
                  .eq('id', order.user_id)
                  .maybeSingle();
                customerProfile = profileData;
              }

              // Fetch delivery person profile separately
              let deliveryProfile = null;
              if (order.delivery_person_id) {
                const { data: deliveryData } = await supabase
                  .from('profiles')
                  .select('id, full_name, phone_number')
                  .eq('id', order.delivery_person_id)
                  .maybeSingle();
                deliveryProfile = deliveryData;
              }

              // Fetch order items
              const { data: itemsData } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', order.id);

              return {
                ...order,
                profiles: customerProfile,
                delivery_person: deliveryProfile,
                order_items: itemsData || []
              };
            } catch (err) {
              console.warn(`Error enriching order ${order.id}:`, err);
              return {
                ...order,
                profiles: null,
                delivery_person: null,
                order_items: []
              };
            }
          })
        );
        setOrders(enrichedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Filter orders by date
  const filterByDate = (orderList: Order[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        return orderList.filter(order => new Date(order.created_at) >= today);
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return orderList.filter(order => 
          new Date(order.created_at) >= yesterday && 
          new Date(order.created_at) < today
        );
      case 'last7days':
        const last7Days = new Date(today);
        last7Days.setDate(last7Days.getDate() - 7);
        return orderList.filter(order => new Date(order.created_at) >= last7Days);
      case 'custom':
        if (!customDate) return orderList;
        const customDateObj = new Date(customDate);
        return orderList.filter(order => 
          new Date(order.created_at).toDateString() === customDateObj.toDateString()
        );
      default:
        return orderList;
    }
  };

  // Filter orders by search query
  const filterBySearch = (orderList: Order[]) => {
    if (!searchQuery.trim()) return orderList;
    const query = searchQuery.toLowerCase();
    
    return orderList.filter(order => {
      // Search by order ID
      if (order.id.toLowerCase().includes(query)) return true;
      
      // Search by customer name
      if (order.profiles?.full_name?.toLowerCase().includes(query)) return true;
      
      // Search by phone number
      if (order.profiles?.phone_number?.toLowerCase().includes(query)) return true;
      
      return false;
    });
  };

  // Get filtered orders
  const getFilteredOrders = () => {
    let filtered = orders;
    
    if (activeTab !== 'all') {
      filtered = orders.filter(order => {
        if (activeTab === 'pending') return order.status === 'placed';
        if (activeTab === 'preparing') return order.status === 'preparing';
        if (activeTab === 'prepared') return order.status === 'prepared';
        if (activeTab === 'out_for_delivery') return order.delivery_status === 'out_for_delivery';
        if (activeTab === 'delivered') return order.delivery_status === 'delivered';
        return order.status === activeTab;
      });
    } else {
      // For "All" tab, still filter out cancelled if the user wants cleaner view
      // But user said "all every order should be displayed", so keep it
    }
    
    filtered = filterByDate(filtered);
    filtered = filterBySearch(filtered);
    
    return filtered;
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed':
        return <Clock className="w-4 h-4" />;
      case 'preparing':
        return <Package className="w-4 h-4" />;
      case 'prepared':
      case 'out_for_delivery':
        return <Truck className="w-4 h-4" />;
      case 'served':
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'preparing':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'prepared':
      case 'out_for_delivery':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'served':
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader
        title="Live Order Monitor"
        actions={
          <button 
            onClick={() => fetchOrders(false)} 
            className="p-2 hover:bg-muted rounded-full transition-colors flex items-center gap-2 group"
          >
            <RefreshCw className={`w-5 h-5 text-brand-maroon ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span className="text-xs font-bold text-brand-maroon">Refresh</span>
          </button>
        }
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 py-4 space-y-6 max-w-[1600px] mx-auto"
      >
        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-brand-maroon transition-colors" />
          <Input
            type="text"
            placeholder="Search by Order ID, Customer Name, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 rounded-2xl border-none bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-brand-maroon/20 transition-all"
          />
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap gap-2 items-center">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 bg-card border border-border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="last7days">Last 7 Days</option>
            <option value="custom">Custom Date</option>
          </select>
          
          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
          
          <span className="text-xs text-muted-foreground ml-auto">
            Showing {getFilteredOrders().length} of {orders.length} orders
          </span>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === status
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
            >
              {getStatusIcon(status === 'pending' ? 'placed' : status)}
              <span>{status.replace(/_/g, ' ').toUpperCase()}</span>
              <span className="text-xs opacity-75">
                ({filterBySearch(filterByDate(orders)).filter(order => {
                   if (status === 'all') return true;
                   if (status === 'pending') return order.status === 'placed';
                   if (status === 'preparing') return order.status === 'preparing';
                   if (status === 'prepared') return order.status === 'prepared';
                   if (status === 'out_for_delivery') return order.delivery_status === 'out_for_delivery';
                   if (status === 'delivered') return order.delivery_status === 'delivered';
                   return order.status === status;
                }).length})
              </span>
            </button>
          ))}
        </div>

        {/* Live Indicator */}
        <div className="flex items-center justify-between px-2 bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-white/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-xs font-black text-green-700 uppercase tracking-widest">Live Updates Active</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
            Syncing with Supabase Realtime
          </span>
        </div>

        {/* All Orders List Section */}
        {activeTab === 'all' && getFilteredOrders().length > 0 && (
          <Card className="border-none shadow-sm">
            <div className="bg-primary/5 px-4 py-3 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <List className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">ALL ORDERS</h3>
                </div>
                <Badge variant="secondary">
                  {getFilteredOrders().length} orders
                </Badge>
              </div>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {getFilteredOrders().map((order) => (
                <div key={order.id} className="p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Order Info */}
                      <div className="flex-shrink-0">
                        <span className="text-xs font-black text-primary">#{order.id.slice(0, 8)}</span>
                      </div>
                      
                      {/* Customer Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {order.profiles?.full_name || 'Anonymous'}
                        </p>
                        {order.profiles?.phone_number && (
                          <p className="text-xs text-muted-foreground truncate">
                            📞 {order.profiles.phone_number}
                          </p>
                        )}
                      </div>
                      
                      {/* Total Amount */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-black text-primary">₹{order.total_amount}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="ml-3 flex-shrink-0">
                      <Badge variant={order.status === 'delivered' ? 'success' : 'warning'}>
                        {order.status.replace(/_/g, ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Orders Grid - Responsive Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {activeTab !== 'all' && getFilteredOrders()
              .map((order, index) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="border-none shadow-xl shadow-black/5 overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-300 rounded-[2rem]">
                    {/* Card Header */}
                    <div className={`${getStatusColor(order.status)} px-5 py-3 flex justify-between items-center border-b border-black/5`}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(order.status)}
                        <span className="text-xs font-black uppercase tracking-tighter">#{order.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 opacity-60" />
                        <span className="text-[10px] font-bold uppercase">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <CardBody className="p-5 flex-1 flex flex-col space-y-4">
                      {/* Customer Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-black text-base text-foreground leading-tight truncate">
                            {order.profiles?.full_name || 'Anonymous Customer'}
                          </h4>
                          {order.profiles?.phone_number && (
                            <p className="text-xs font-bold text-brand-maroon/60 mt-1">
                              {order.profiles.phone_number}
                            </p>
                          )}
                        </div>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          order.order_type === 'delivery' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          <Truck className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="space-y-2 py-3 border-y border-dashed border-border flex-1">
                        {order.order_items?.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex justify-between items-start text-xs">
                            <span className="text-muted-foreground flex-1 pr-2">
                              <span className="font-black text-foreground">x{item.quantity}</span> {item.name}
                            </span>
                            <span className="font-bold text-foreground shrink-0">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        {order.order_items && order.order_items.length > 3 && (
                          <p className="text-[10px] font-black text-brand-maroon uppercase tracking-widest pt-1">
                            +{order.order_items.length - 3} MORE ITEMS
                          </p>
                        )}
                        <div className="flex justify-between pt-3 mt-1 border-t border-border">
                          <span className="font-bold text-foreground text-xs uppercase tracking-widest">Total Amount</span>
                          <span className="font-black text-brand-maroon text-lg leading-none">₹{order.total_amount}</span>
                        </div>
                      </div>

                      {/* Status & Payment */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={order.status === 'delivered' ? 'success' : 'warning'} className="rounded-lg px-3 py-1 text-[10px] font-black uppercase">
                          {order.status.replace(/_/g, ' ')}
                        </Badge>
                        {order.is_paid ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-[10px] text-green-700 font-black uppercase">Paid</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-red-600" />
                            <span className="text-[10px] text-red-700 font-black uppercase">Unpaid</span>
                          </div>
                        )}
                      </div>

                      {/* Delivery Partner */}
                      {order.delivery_person && (
                        <div className="bg-muted/30 p-3 rounded-2xl border border-border group-hover:border-brand-maroon/20 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-4 bg-brand-maroon rounded-full" />
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Delivery Partner</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm text-foreground">{(order.delivery_person as any).full_name}</span>
                            <ArrowRight className="w-4 h-4 text-brand-maroon transform group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {getFilteredOrders().length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium">No orders found</p>
            <p className="text-xs text-muted-foreground mt-2">
              {searchQuery 
                ? 'Try adjusting your search or filters' 
                : 'Switch tabs or wait for new orders'
              }
            </p>
            {(searchQuery || dateFilter !== 'today') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('today');
                  setCustomDate('');
                }}
                className="mt-4 text-sm text-primary font-bold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
