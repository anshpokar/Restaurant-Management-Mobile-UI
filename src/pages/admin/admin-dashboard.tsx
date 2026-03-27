import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Users, Calendar, Star, Tag, Plus, Trash2, RefreshCw, CreditCard, Clock, Coins } from 'lucide-react';
import { supabase, type MenuItem, type Offer } from '@/lib/supabase';
import { ADMIN_TEXT, COMMON_TEXT } from '@/constants/text';
import { startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { AdminLiveDeliveryPanel } from '@/components/admin/AdminLiveDeliveryPanel';


export function AdminDashboard() {
  const navigate = useNavigate();
  const [specials, setSpecials] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({ title: '', description: '', discount_code: '' });
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
        
        setStats({
          ordersCount: ordersCount || 0,
          revenue: totalRevenue,
          activeTables,
          totalTables,
          bookingsCount: bookingsCount || 0,
          pendingUpiVerifications: upiCount || 0,
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
        .insert([{ ...newOffer, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      setOffers([data, ...offers]);
      setIsAddingOffer(false);
      setNewOffer({ title: '', description: '', discount_code: '' });
    } catch (error) {
      toast.error('Failed to add offer');
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
    { label: ADMIN_TEXT.KPIS.TODAYS_ORDERS, value: stats.ordersCount.toString(), change: '+12%', trend: 'up', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: ADMIN_TEXT.KPIS.REVENUE, value: `${COMMON_TEXT.CURRENCY_SYMBOL}${stats.revenue.toLocaleString()}`, change: '+8%', trend: 'up', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: ADMIN_TEXT.KPIS.ACTIVE_TABLES, value: `${stats.activeTables}/${stats.totalTables}`, change: `${stats.totalTables - stats.activeTables} vacant`, trend: 'neutral', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Bookings', value: stats.bookingsCount.toString(), change: '+5 new', trend: 'up', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-100' },
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
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <Card key={index}>
                <CardBody className="p-4">
                  <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground mb-1">{kpi.value}</p>
                  <div className="flex items-center gap-1">
                    {kpi.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600" />}
                    {kpi.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-600" />}
                    <span className={`text-xs ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {kpi.change}
                    </span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Live Delivery Panel */}
        <AdminLiveDeliveryPanel />

        {/* Quick Actions */}
        <div>
          <h3 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-pink-600" /> Quick Actions
          </h3>
          <div className="flex flex-row gap-3 overflow-x-auto pb-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div 
                  key={index} 
                  className={`min-w-[280px] flex-1 border-2 ${action.badge ? 'border-orange-200 bg-orange-50 hover:bg-orange-100 animate-pulse' : 'border-border bg-card hover:bg-muted'} transition-colors cursor-pointer rounded-2xl`}
                  onClick={action.action}
                >
                  <CardBody className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${action.bg} rounded-xl flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${action.color}`} />
                      </div>
                      <div>
                        <p className="font-bold text-base text-foreground">{action.label}</p>
                        <p className={`text-sm ${action.badge ? 'text-orange-600 font-bold' : 'text-muted-foreground'}`}>
                          {action.value}
                        </p>
                      </div>
                    </div>
                    {action.badge && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
                        <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
                          {stats.pendingTableBookings}
                        </span>
                      </div>
                    )}
                  </CardBody>
                </div>
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
                    <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                    <input
                      required
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary"
                      value={newOffer.description}
                      onChange={e => setNewOffer({ ...newOffer, description: e.target.value })}
                      placeholder="e.g. On orders above ₹499"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Discount Code</label>
                    <input
                      required
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary"
                      value={newOffer.discount_code}
                      onChange={e => setNewOffer({ ...newOffer, discount_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. NAV30"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddingOffer(false)}>{COMMON_TEXT.CANCEL}</Button>
                    <Button type="submit" className="flex-[2]">{ADMIN_TEXT.NEW_OFFER}</Button>
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
