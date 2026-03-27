import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Download, LogOut, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
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
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Reports & Settings" />

      <div className="px-4 py-4 space-y-6">
        {/* Date Range Picker */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Range
              </label>
              <button onClick={fetchReportData} className="p-1 hover:bg-muted rounded text-xs flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="px-3 py-2 bg-muted border-none rounded-xl text-sm"
                value={dateRange.start}
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <input
                type="date"
                className="px-3 py-2 bg-muted border-none rounded-xl text-sm"
                value={dateRange.end}
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
          </CardBody>
        </Card>

        {/* Revenue Summary */}
        <Card>
          <CardBody className="p-4">
            <h3 className="text-sm font-black uppercase text-muted-foreground mb-4 tracking-tighter">Revenue Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-bold">Total Revenue</span>
                <span className="font-black text-2xl text-foreground">₹{stats.totalRevenue.toLocaleString()}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3 bg-muted rounded-2xl">
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Total Orders</p>
                  <p className="text-lg font-black">{stats.totalOrders}</p>
                </div>
                <div className="p-3 bg-muted rounded-2xl">
                  <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">Avg. Value</p>
                  <p className="text-lg font-black">₹{Math.round(stats.avgOrderValue)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-divider">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs font-black text-green-600 uppercase tracking-tighter">Performance Optimized</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Best Selling Items */}
        <Card>
          <CardBody className="p-4">
            <h3 className="text-sm font-black uppercase text-muted-foreground mb-4 tracking-tighter">Best Selling Items</h3>
            <div className="space-y-4">
              {bestSellers.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No sales data for this period</p>
              ) : (
                bestSellers.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{item.name}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60">{item.orders} unit{item.orders !== 1 ? 's' : ''} sold</p>
                    </div>
                    <span className="font-black text-foreground">₹{item.revenue.toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        {/* Order Type Distribution */}
        <Card>
          <CardBody className="p-4">
            <h3 className="text-sm font-black uppercase text-muted-foreground mb-4 tracking-tighter">Order Type Distribution</h3>
            <div className="space-y-4">
              {[
                { label: 'Dine-in', key: 'dine_in' as const, color: 'bg-primary' },
                { label: 'Delivery', key: 'delivery' as const, color: 'bg-blue-500' },
                { label: 'Takeaway', key: 'takeaway' as const, color: 'bg-orange-500' },
              ].map((type) => (
                <div key={type.key} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">{type.label}</span>
                  <div className="flex items-center gap-3 flex-1 justify-end ml-4">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${type.color} rounded-full transition-all duration-500`} 
                        style={{ width: `${distribution[type.key]}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-black text-foreground w-8 text-right">{distribution[type.key]}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Export Options */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-xl" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            CSV REPORT
          </Button>
          <Button variant="outline" className="h-12 rounded-xl" onClick={() => toast.info('Advanced PDF Export coming in next update')}>
            <Download className="w-4 h-4 mr-2" />
            PDF PREVIEW
          </Button>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full h-14 !text-destructive !border-destructive hover:!bg-destructive/10 rounded-2xl font-black uppercase tracking-widest mt-4"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout Terminal
        </Button>
      </div>
    </div>
  );
}
