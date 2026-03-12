import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { Input } from '@/components/design-system/input';
import { supabase, type Order } from '@/lib/supabase';
import { RefreshCw, ShoppingBag, Clock, Package, Truck, CheckCircle, Search, Calendar, List } from 'lucide-react';

export function AdminOrders() {
  const [activeTab, setActiveTab] = useState<Order['status'] | 'all'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'last7days' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');

  const statuses: Array<Order['status'] | 'all'> = ['all', 'placed', 'preparing', 'cooking', 'prepared', 'out_for_delivery', 'delivered'];

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
                  .single();
                customerProfile = profileData;
              }

              // Fetch delivery person profile separately
              let deliveryProfile = null;
              if (order.delivery_person_id) {
                const { data: deliveryData } = await supabase
                  .from('profiles')
                  .select('id, full_name, phone_number')
                  .eq('id', order.delivery_person_id)
                  .single();
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
    let filtered = activeTab === 'all' 
      ? orders 
      : orders.filter(order => order.status === activeTab);
    
    filtered = filterByDate(filtered);
    filtered = filterBySearch(filtered);
    
    return filtered;
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'placed':
        return <Clock className="w-4 h-4" />;
      case 'preparing':
      case 'cooking':
        return <Package className="w-4 h-4" />;
      case 'prepared':
      case 'out_for_delivery':
        return <Truck className="w-4 h-4" />;
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
      case 'cooking':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'prepared':
      case 'out_for_delivery':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'delivered':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <AppHeader
        title="Live Order Monitor"
        actions={
          <button 
            onClick={() => fetchOrders(false)} 
            className="p-2 hover:bg-muted rounded-full transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs font-bold">Refresh</span>
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by Order ID, Customer Name, or Phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
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
              {getStatusIcon(status)}
              <span>{status.replace(/_/g, ' ').toUpperCase()}</span>
              <span className="text-xs opacity-75">
                ({orders.filter(o => o.status === status).length})
              </span>
            </button>
          ))}
        </div>

        {/* Live Indicator */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-green-600 uppercase">Live Updates Active</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Auto-refreshes when orders change
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeTab !== 'all' && getFilteredOrders()
            .map((order) => (
              <Card key={order.id} className="border-none shadow-sm overflow-hidden flex flex-col">
                {/* Card Header */}
                <div className={`${getStatusColor(order.status)} px-3 py-2 flex justify-between items-center border-b`}>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span className="text-xs font-black uppercase">#{order.id.slice(0, 8)}</span>
                  </div>
                  <span className="text-xs font-medium">
                    {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Card Body */}
                <CardBody className="p-3 flex-1 flex flex-col space-y-3">
                  {/* Customer Info */}
                  <div>
                    <h4 className="font-bold text-sm text-foreground leading-tight">
                      {order.profiles?.full_name || 'Anonymous'}
                    </h4>
                    {order.profiles?.phone_number && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        📞 {order.profiles.phone_number}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {order.delivery_address || 'No address'}
                    </p>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-1 py-2 border-y border-divider flex-1">
                    {order.order_items?.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          <span className="font-black text-foreground">x{item.quantity}</span> {item.name}
                        </span>
                      </div>
                    ))}
                    {order.order_items && order.order_items.length > 3 && (
                      <p className="text-xs text-muted-foreground italic">+{order.order_items.length - 3} more</p>
                    )}
                    <div className="flex justify-between pt-2 mt-2">
                      <span className="font-bold text-foreground text-xs">Total</span>
                      <span className="font-black text-primary text-base">₹{order.total_amount}</span>
                    </div>
                  </div>

                  {/* Status Badge & Time */}
                  <div className="flex items-center justify-between">
                    <Badge variant={order.status === 'delivered' ? 'success' : 'warning'}>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    {order.is_paid && (
                      <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Paid
                      </span>
                    )}
                  </div>

                  {/* Delivery Info (if applicable) */}
                  {order.delivery_person && (
                    <div className="bg-secondary/10 p-2 rounded-lg border border-secondary/20">
                      <p className="text-xs font-black text-secondary uppercase mb-1">Delivery Partner</p>
                      <p className="font-bold text-sm">{(order.delivery_person as any).full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        📞 {(order.delivery_person as any).phone_number}
                      </p>
                    </div>
                  )}

                  {/* Timeline Footer */}
                  <div className="pt-2 border-t border-divider">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Placed: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {order.status === 'delivered' && (
                        <span className="text-green-600 font-bold">
                          ✓ Delivered
                        </span>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
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
      </div>
    </div>
  );
}
