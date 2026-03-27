import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { ShoppingBag, DollarSign, Users, Calendar, Star, Tag, Plus, Trash2, RefreshCw, CreditCard, Coins } from 'lucide-react';
import { supabase, type MenuItem, type Offer } from '@/lib/supabase';
import { ADMIN_TEXT, COMMON_TEXT } from '@/constants/text';
import { startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { AdminLiveDeliveryPanel } from '@/components/admin/AdminLiveDeliveryPanel';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { motion } from 'motion/react';


export function AdminDashboard() {
  const navigate = useNavigate();
  const [specials, setSpecials] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({ 
    title: '', 
    description: '', 
    discount_code: '', 
    discount_value: 0, 
    discount_type: 'flat' as 'flat' | 'percentage',
    min_order_amount: 0
  });
  const [stats, setStats] = useState({
    ordersCount: 0,
    revenue: 0,
    activeTables: 0,
    totalTables: 0,
    bookingsCount: 0,
    pendingUpiVerifications: 0,
    pendingTableBookings: 0
  });

  useEffect(() => {
    fetchData();

    // REAL-TIME SYSTEM SYNC
    // Listen for any high-level changes that affect KPIs
    const channels = [
      supabase.channel('admin-orders-sync')
        .on('postgres_changes', { event: '*', table: 'orders', schema: 'public' }, () => {
          console.log('📦 Admin Sync: Orders change detected');
          fetchKpis();
        }),
      supabase.channel('admin-tables-sync')
        .on('postgres_changes', { event: '*', table: 'restaurant_tables', schema: 'public' }, () => {
          console.log('🪑 Admin Sync: Tables change detected');
          fetchKpis();
        }),
      supabase.channel('admin-bookings-sync')
        .on('postgres_changes', { event: '*', table: 'table_bookings', schema: 'public' }, () => {
          console.log('📅 Admin Sync: Bookings change detected');
          fetchKpis();
        }),
      supabase.channel('admin-payments-sync')
        .on('postgres_changes', { event: '*', table: 'upi_payments', schema: 'public' }, () => {
          console.log('💳 Admin Sync: Payments change detected');
          fetchKpis();
        })
    ];

    channels.forEach(ch => ch.subscribe());

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  const fetchKpis = async () => {
    try {
      const today = new Date();
      const start = startOfDay(today).toISOString();
      const end = endOfDay(today).toISOString();

      // 1. Today's Orders
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start)
        .lte('created_at', end);

      // 2. Today's Revenue
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('is_paid', true)
        .gte('created_at', start)
        .lte('created_at', end);

      const totalRevenue = revenueData?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;

      // 3. Active Tables
      const { data: tablesData } = await supabase
        .from('restaurant_tables')
        .select('status');

      const activeTables = tablesData?.filter(t => t.status === 'occupied').length || 0;
      const totalTables = tablesData?.length || 0;

      // 4. Bookings
      const dateStr = today.toISOString().split('T')[0];
      const { count: bookingsCount } = await supabase
        .from('table_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('booking_date', dateStr);

      // 5. Pending UPI Verifications
      try {
        const { count: upiCount, error: upiError } = await supabase
          .from('upi_payments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'verification_requested');
        
        if (upiError) {
          console.warn('UPI payments query error:', upiError.message);
        }
        
        // 6. Pending Table Bookings
        const { count: bookingCount, error: bookingError } = await supabase
          .from('table_bookings')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (bookingError) {
          console.warn('Table bookings query error:', bookingError.message);
        }

        // 7. Pending COD Sessions (Add to Payment Verification KPI)
        const { count: codCount, error: codError } = await supabase
          .from('dine_in_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('payment_method', 'cod')
          .eq('payment_status', 'pending');

        if (codError) {
          console.warn('COD sessions query error:', codError.message);
        }
        
        setStats({
          ordersCount: ordersCount || 0,
          revenue: totalRevenue,
          activeTables,
          totalTables,
          bookingsCount: bookingsCount || 0,
          pendingUpiVerifications: (upiCount || 0) + (codCount || 0), // Combined payment verifications
          pendingTableBookings: bookingCount || 0
        });
      } catch (error) {
        console.warn('Error fetching UPI verifications (table may not exist or RLS issue):', error);
        setStats({
          ordersCount: ordersCount || 0,
          revenue: totalRevenue,
          activeTables,
          totalTables,
          bookingsCount: bookingsCount || 0,
          pendingUpiVerifications: 0,
          pendingTableBookings: 0
        });
      }
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        // Fetch Specials
        supabase
          .from('menu_items')
          .select('*')
          .eq('is_special', true)
          .then(({ data }) => setSpecials(data || [])),

        // Fetch Offers
        supabase
          .from('offers')
          .select('*')
          .order('created_at', { ascending: false })
          .then(({ data }) => setOffers(data || [])),

        // Fetch KPIs
        fetchKpis()
      ]);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert([{ 
          ...newOffer, 
          is_active: true,
          // Ensure numbers are numbers
          discount_value: Number(newOffer.discount_value),
          min_order_amount: Number(newOffer.min_order_amount)
        }])
        .select()
        .single();
      if (error) throw error;
      setOffers([data, ...offers]);
      setIsAddingOffer(false);
      setNewOffer({ 
        title: '', 
        description: '', 
        discount_code: '', 
        discount_value: 0, 
        discount_type: 'flat',
        min_order_amount: 0
      });
      toast.success('Offer created successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add offer');
    }
  };

  const deleteOffer = async (id: string) => {
    if (!window.confirm('Delete this offer?')) return;

    try {
      await supabase.from('offers').delete().eq('id', id);
      setOffers(offers.filter(o => o.id !== id));
    } catch (error) {
      toast.error('Failed to delete offer');
    }

  };

  const toggleSpecial = async (item: MenuItem) => {
    try {
      await supabase
        .from('menu_items')
        .update({ is_special: !item.is_special })
        .eq('id', item.id);
      fetchData();
    } catch (error) {
      toast.error('Failed to update special status');
    }

  };
  const kpis = [
    { label: ADMIN_TEXT.KPIS.TODAYS_ORDERS, value: stats.ordersCount.toString(), change: '+12%', trend: 'up' as const, icon: ShoppingBag, variant: 'glass' as const },
    { label: ADMIN_TEXT.KPIS.REVENUE, value: `${COMMON_TEXT.CURRENCY_SYMBOL}${stats.revenue.toLocaleString()}`, change: '+8%', trend: 'up' as const, icon: DollarSign, variant: 'primary' as const },
    { label: ADMIN_TEXT.KPIS.ACTIVE_TABLES, value: `${stats.activeTables}/${stats.totalTables}`, change: `${stats.totalTables - stats.activeTables} vacant`, trend: 'neutral' as const, icon: Users, variant: 'glass' as const },
    { label: 'Bookings', value: stats.bookingsCount.toString(), change: '+5 new', trend: 'up' as const, icon: Calendar, variant: 'gold' as const },
  ];

  const quickActions = [
    {
      label: 'Table Reservations',
      value: stats.pendingTableBookings > 0 ? `${stats.pendingTableBookings} pending` : `${stats.bookingsCount} today`,
      icon: Calendar,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      action: () => navigate('/admin/bookings'),
      badge: stats.pendingTableBookings > 0
    },
    {
      label: 'Payment Verifications',
      value: stats.pendingUpiVerifications > 0 ? `${stats.pendingUpiVerifications} pending` : 'No pending',
      icon: CreditCard,
      color: 'text-pink-600',
      bg: 'bg-pink-100',
      action: () => navigate('/admin/payment-verification'),
      badge: stats.pendingUpiVerifications > 0
    },
    {
      label: 'Driver Settlements',
      value: 'Pending cash',
      icon: Coins,
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      action: () => navigate('/admin/settlements')
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title={ADMIN_TEXT.DASHBOARD_TITLE} />

      <div className="px-4 py-4 space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <AdminKpiCard
              key={index}
              {...kpi}
              index={index}
            />
          ))}
        </div>

        {/* Live Delivery Panel */}
        <AdminLiveDeliveryPanel />

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
            <span className="w-2 h-8 bg-brand-maroon rounded-full" /> Quick Operations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={index}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  onClick={action.action}
                  className={`relative group flex flex-col p-6 rounded-[2.5rem] text-left transition-all ${
                    action.badge 
                      ? 'bg-gradient-to-br from-brand-maroon to-[#5D1227] text-white shadow-xl shadow-brand-maroon/20' 
                      : 'bg-card border border-border hover:border-brand-maroon/30 shadow-sm'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                    action.badge ? 'bg-white/20' : action.bg
                  }`}>
                    <Icon className={`w-7 h-7 ${action.badge ? 'text-white' : action.color}`} />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-black text-lg tracking-tight">{action.label}</h4>
                    <p className={`text-sm ${action.badge ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {action.value}
                    </p>
                  </div>

                  {action.badge && (
                    <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full ring-1 ring-white/30">
                      <span className="w-2 h-2 bg-brand-gold rounded-full animate-ping" />
                      <span className="text-[10px] font-black uppercase tracking-wider">{stats.pendingTableBookings} ACTION</span>
                    </div>
                  )}
                  
                  {/* Hover Arrow */}
                  <div className={`absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity ${
                    action.badge ? 'text-white' : 'text-brand-maroon'
                  }`}>
                    <Plus className="w-5 h-5 rotate-45" />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Today's Specials Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> {ADMIN_TEXT.TODAYS_SPECIALS_TITLE}
            </h3>
            <button onClick={fetchData} className="p-2 hover:bg-muted rounded-full">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-3">
            {specials.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">{ADMIN_TEXT.NO_SPECIALS}</p>
            ) : (
              specials.map(item => (
                <Card key={item.id} className="border-none shadow-sm bg-yellow-50/30">
                  <CardBody className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.image}</span>
                      <div>
                        <p className="font-bold text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{COMMON_TEXT.CURRENCY_SYMBOL}{item.price}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSpecial(item)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardBody>
                </Card>
              ))
            )}
            <p className="text-[10px] text-muted-foreground px-1 uppercase font-bold tracking-tighter mt-2">
              Manage specials from the "Menu Management" tab by clicking edit.
            </p>
          </div>
        </div>

        {/* Offers Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> {ADMIN_TEXT.ACTIVE_OFFERS_TITLE}
            </h3>
            <Button size="sm" onClick={() => setIsAddingOffer(true)}>
              <Plus className="w-4 h-4 mr-1" /> {COMMON_TEXT.CREATE.toLowerCase() === 'create' ? 'New' : COMMON_TEXT.CREATE}
            </Button>
          </div>

          <div className="space-y-3">
            {offers.map(offer => (
              <Card key={offer.id} className="border-dashed border-2 border-primary/20 bg-primary/5">
                <CardBody className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-black text-primary uppercase text-sm">{offer.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{offer.description}</p>
                    <div className="mt-2 inline-block px-2 py-1 bg-white border-2 border-primary/10 rounded-lg text-[10px] font-black tracking-widest uppercase">
                      CODE: {offer.discount_code}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteOffer(offer.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* New Offer Modal */}
        {isAddingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <Card className="w-full max-w-sm">
              <CardBody className="p-6 space-y-4">
                <h3 className="text-lg font-black">{ADMIN_TEXT.CREATE_NEW_OFFER}</h3>
                <form onSubmit={handleAddOffer} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Title</label>
                    <input
                      required
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary"
                      value={newOffer.title}
                      onChange={e => setNewOffer({ ...newOffer, title: e.target.value })}
                      placeholder="e.g. FLAT 30% OFF"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Discount Code</label>
                    <input
                      required
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary font-black uppercase tracking-widest"
                      value={newOffer.discount_code}
                      onChange={e => setNewOffer({ ...newOffer, discount_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. SAVE50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                    <input
                      required
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary"
                      value={newOffer.description}
                      onChange={e => setNewOffer({ ...newOffer, description: e.target.value })}
                      placeholder="e.g. On orders above ₹499"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Type</label>
                      <select
                        className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary h-12"
                        value={newOffer.discount_type}
                        onChange={e => setNewOffer({ ...newOffer, discount_type: e.target.value as any })}
                      >
                        <option value="flat">Flat (₹)</option>
                        <option value="percentage">Percent (%)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-muted-foreground">Value</label>
                      <input
                        type="number"
                        required
                        className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary h-12"
                        value={newOffer.discount_value}
                        onChange={e => setNewOffer({ ...newOffer, discount_value: Number(e.target.value) })}
                        placeholder="e.g. 50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Min Order Amount (Optional)</label>
                    <input
                      type="number"
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary h-12"
                      value={newOffer.min_order_amount}
                      onChange={e => setNewOffer({ ...newOffer, min_order_amount: Number(e.target.value) })}
                      placeholder="e.g. 499"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setIsAddingOffer(false)}>{COMMON_TEXT.CANCEL}</Button>
                    <Button type="submit" className="flex-[2] h-12 rounded-xl font-bold">{ADMIN_TEXT.NEW_OFFER}</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
