import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Download, LogOut, TrendingUp, Calendar, RefreshCw, BarChart3, PieChart, Layers } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { toast } from 'sonner';

export function AdminReports() {
  const { onLogout } = useOutletContext<{ onLogout: () => void }>();
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    growth: 0
  });
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [distribution, setDistribution] = useState({
    dine_in: 0,
    delivery: 0,
    takeaway: 0
  });

  useEffect(() => {
    fetchReportData();

    // Subscribe to order changes for live stats
    const channel = supabase.channel('reports-sync')
      .on('postgres_changes', { event: '*', table: 'orders', schema: 'public' }, () => {
        fetchReportData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const start = startOfDay(new Date(dateRange.start)).toISOString();
      const end = endOfDay(new Date(dateRange.end)).toISOString();

      // 1. Revenue & Orders Summary
      const { data: currentOrders } = await supabase
        .from('orders')
        .select('total_amount, order_type, is_paid')
        .gte('created_at', start)
        .lte('created_at', end);

      const paidOrders = currentOrders?.filter(o => o.is_paid) || [];
      const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
      const totalOrders = currentOrders?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // 2. Growth Calculation (Today vs Yesterday)
      const yesterdayStart = startOfDay(subDays(new Date(), 1)).toISOString();
      const yesterdayEnd = endOfDay(subDays(new Date(), 1)).toISOString();
      
      const { data: yesterdayOrders } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('is_paid', true)
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd);
        
      const yesterdayRevenue = yesterdayOrders?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;
      const growth = yesterdayRevenue > 0 
        ? ((totalRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
        : 100;

      setStats({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        growth: Math.round(growth)
      });

      // 3. Best Sellers (Aggregate order_items from PAID orders)
      const { data: itemsData } = await supabase
        .from('order_items')
        .select(`
          name, 
          quantity, 
          price,
          orders!inner(is_paid, status)
        `)
        .eq('orders.is_paid', true)
        .gte('created_at', start)
        .lte('created_at', end);
  
      const itemAggregation: Record<string, { orders: number, revenue: number }> = {};
      itemsData?.forEach(item => {
        const itemName = item.name || 'Unknown Item';
        if (!itemAggregation[itemName]) {
          itemAggregation[itemName] = { orders: 0, revenue: 0 };
        }
        itemAggregation[itemName].orders += item.quantity;
        itemAggregation[itemName].revenue += (item.price * item.quantity);
      });
  
      const sortedItems = Object.entries(itemAggregation)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
  
      setBestSellers(sortedItems);

      // 4. Distribution
      const dist = {
        dine_in: currentOrders?.filter(o => o.order_type === 'dine_in').length || 0,
        delivery: currentOrders?.filter(o => o.order_type === 'delivery').length || 0,
        takeaway: currentOrders?.filter(o => o.order_type === 'takeaway').length || 0,
      };
      
      const total = dist.dine_in + dist.delivery + dist.takeaway || 1;
      setDistribution({
        dine_in: Math.round((dist.dine_in / total) * 100),
        delivery: Math.round((dist.delivery / total) * 100),
        takeaway: Math.round((dist.takeaway / total) * 100),
      });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const data = [
      ['Metric', 'Value'],
      ['Total Revenue', `INR ${stats.totalRevenue}`],
      ['Total Orders', stats.totalOrders],
      ['Average Order Value', `INR ${stats.avgOrderValue}`],
      ['Growth', `${stats.growth}%`],
      ['', ''],
      ['Top Selling Items', 'Revenue'],
      ...bestSellers.map(b => [b.name, `INR ${b.revenue}`]),
      ['', ''],
      ['Distribution', 'Percentage'],
      ['Dine-in', `${distribution.dine_in}%`],
      ['Delivery', `${distribution.delivery}%`],
      ['Takeaway', `${distribution.takeaway}%`]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `restaurant_report_${dateRange.start}_to_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV');
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="Intelligence Terminal" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 py-6 space-y-8 max-w-[1400px] mx-auto"
      >
        {/* Date Range Picker */}
        <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
          <CardBody className="p-6">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-brand-maroon" />
                Audit Period
              </label>
              <button 
                onClick={fetchReportData} 
                className="p-2 hover:bg-muted rounded-xl transition-all group"
                title="Synchronize Data"
              >
                <RefreshCw className={`w-4 h-4 text-brand-maroon ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-muted/50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-maroon/20 outline-none transition-all"
                  value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </div>
              <div className="relative">
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-muted/50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-brand-maroon/20 outline-none transition-all"
                  value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Revenue Summary */}
        <Card className="border-none shadow-2xl shadow-brand-maroon/10 rounded-[2.5rem] bg-gradient-to-br from-brand-maroon to-red-900 text-white overflow-hidden relative">
          <CardBody className="p-8 relative z-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Fiscal Performance</h3>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Total Verified Revenue</span>
                <p className="text-4xl font-black tracking-tighter mt-1">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Volume</p>
                  <p className="text-xl font-black">{stats.totalOrders} <span className="text-[10px] opacity-40 uppercase font-bold ml-1">TXNS</span></p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Efficiency</p>
                  <p className="text-xl font-black">₹{Math.round(stats.avgOrderValue)} <span className="text-[10px] opacity-40 uppercase font-bold ml-1">AOV</span></p>
                </div>
              </div>
            </div>
          </CardBody>
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Best Selling Items */}
          <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
            <CardBody className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">High Velocity Inventory</h3>
              </div>
              
              <div className="space-y-6">
                {bestSellers.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Awaiting data stream...</p>
                  </div>
                ) : (
                  bestSellers.map((item, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-black text-foreground tracking-tight group-hover:text-brand-maroon transition-colors">{item.name}</p>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mt-0.5">{item.orders} COMPLETED ORDERS</p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-brand-maroon">₹{item.revenue.toLocaleString()}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardBody>
          </Card>

          {/* Order Type Distribution */}
          <Card className="border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
            <CardBody className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <PieChart className="w-5 h-5" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Service Distribution</h3>
              </div>
              
              <div className="space-y-8">
                {[
                  { label: 'Dine-in Experience', key: 'dine_in' as const, color: 'bg-brand-maroon', icon: <Layers className="w-3 h-3" /> },
                  { label: 'Logistics / Delivery', key: 'delivery' as const, color: 'bg-blue-500', icon: <LogOut className="w-3 h-3" /> },
                  { label: 'Quick Takeaway', key: 'takeaway' as const, color: 'bg-amber-500', icon: <RefreshCw className="w-3 h-3" /> },
                ].map((type) => (
                  <div key={type.key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{type.label}</span>
                      </div>
                      <span className="text-[10px] font-black text-foreground">{distribution[type.key]}%</span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${distribution[type.key]}%` }}
                        className={`h-full ${type.color} rounded-full shadow-lg`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Export Options */}
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" className="h-16 rounded-2xl border-2 font-black text-[10px] tracking-[0.2em] transition-all hover:bg-muted active:scale-95" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-3" />
            GENERATE CSV
          </Button>
          <Button variant="outline" className="h-16 rounded-2xl border-2 font-black text-[10px] tracking-[0.2em] transition-all hover:bg-muted active:scale-95" onClick={() => toast.info('Advanced Audit PDF requires higher clearance')}>
            <Download className="w-4 h-4 mr-3" />
            AUDIT TRAIL
          </Button>
        </div>

        {/* Logout */}
        <div className="pt-8 flex justify-center">
          <button
            className="group flex items-center gap-4 px-8 py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-[2rem] transition-all active:scale-95"
            onClick={onLogout}
          >
            <div className="w-10 h-10 bg-white rounded-xl shadow-lg shadow-rose-200 flex items-center justify-center group-hover:rotate-12 transition-transform">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-black text-[10px] uppercase tracking-[0.3em]">Terminate Session</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
