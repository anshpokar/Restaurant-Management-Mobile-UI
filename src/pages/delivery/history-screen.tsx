import { useState, useEffect } from 'react';
import { CheckCircle2, IndianRupee, Clock, Package } from 'lucide-react';
import { Card, CardBody } from '@/components/design-system/card';
import { supabase, type Order, type Profile } from '@/lib/supabase';
import { useOutletContext } from 'react-router-dom';

export function DeliveryHistory() {
    const { profile } = useOutletContext<{ profile: Profile | null }>();
    const [history, setHistory] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'today' | 'week' | 'month'>('today');

    useEffect(() => {
        if (profile?.id) {
            fetchHistory();
        }
    }, [profile, filter]);

    async function fetchHistory() {
        try {
            setLoading(true);
            let query = supabase
                .from('orders')
                .select('*')
                .eq('delivery_person_id', profile?.id)
                .eq('delivery_status', 'delivered')
                .order('created_at', { ascending: false });

            const now = new Date();
            if (filter === 'today') {
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                query = query.gte('created_at', today);
            } else if (filter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                query = query.gte('created_at', weekAgo);
            } else if (filter === 'month') {
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString();
                query = query.gte('created_at', monthAgo);
            }

            const { data, error } = await query;

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching delivery history:', error);
        } finally {
            setLoading(false);
        }
    }

    const earningsPerDelivery = 30; // Matches DB trigger
    const filteredEarnings = history.length * earningsPerDelivery;

    return (
        <div className="space-y-6 pb-24">
            {/* Earnings Card */}
            <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white border-0 shadow-lg overflow-hidden relative mx-1">
                <CardBody className="p-6 relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">
                                {filter === 'today' ? "Today's" : filter === 'week' ? "This Week's" : "This Month's"} Earnings
                            </p>
                            <p className="text-4xl font-black flex items-center">
                                <IndianRupee className="w-6 h-6 mr-1" />
                                {filteredEarnings.toFixed(2)}
                            </p>
                            <p className="text-[10px] font-bold mt-2 opacity-70">
                                Total Balance: ₹{profile?.total_earnings || 0}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <IndianRupee className="w-6 h-6" />
                        </div>
                    </div>
                </CardBody>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </Card>

            {/* Filter Tabs */}
            <div className="flex gap-2 px-2 overflow-x-auto no-scrollbar">
                {(['today', 'week', 'month'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="flex items-center justify-between px-2">
                <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Recent Deliveries</h3>
                <span className="text-[10px] font-bold text-muted-foreground">{history.length} Tasks</span>
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse text-xs font-bold uppercase tracking-widest">Updating...</div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-divider mx-1">
                    <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                    <p className="font-bold text-muted-foreground text-sm">No deliveries in this period</p>
                </div>
            ) : (
                <div className="space-y-3 px-1">
                    {history.map(order => (
                        <div key={order.id} className="group active:scale-[0.98] transition-all flex items-center justify-between p-4 bg-surface rounded-2xl border border-divider hover:border-primary/30 shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100 group-hover:bg-green-100 transition-colors">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-black text-sm text-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock className="w-3 h-3 text-muted-foreground" />
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">
                                            {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-green-600">+₹{earningsPerDelivery}</p>
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Success</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
