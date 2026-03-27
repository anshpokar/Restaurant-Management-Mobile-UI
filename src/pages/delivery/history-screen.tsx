import { useState, useEffect } from 'react';
import { CheckCircle2, IndianRupee, Clock, Package } from 'lucide-react';
import { Card, CardBody } from '@/components/design-system/card';
import { supabase, type Order, type Profile } from '@/lib/supabase';
import { useOutletContext } from 'react-router-dom';

export function DeliveryHistory() {
    const { profile } = useOutletContext<{ profile: Profile | null }>();
    const [history, setHistory] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.id) {
            fetchHistory();
        }
    }, [profile]);

    async function fetchHistory() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('delivery_person_id', profile?.id)
                .eq('delivery_status', 'delivered')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching delivery history:', error);
        } finally {
            setLoading(false);
        }
    }

    const todayOrders = history.filter(order => {
        const orderDate = new Date(order.created_at).toDateString();
        const today = new Date().toDateString();
        return orderDate === today;
    });

    const earningsPerDelivery = 70; // Hardcoded business logic for now
    const todayEarnings = todayOrders.length * earningsPerDelivery;

    return (
        <div className="space-y-6 pb-20">
            <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white border-0 shadow-lg overflow-hidden relative">
                <CardBody className="p-6 relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Today's Earnings</p>
                            <p className="text-4xl font-black flex items-center">
                                <IndianRupee className="w-6 h-6 mr-1" />
                                {todayEarnings.toFixed(2)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                            <IndianRupee className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold">Completed {todayOrders.length} deliveries today</span>
                    </div>
                </CardBody>
                {/* Decorative background circle */}
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
            </Card>

            <div className="flex items-center justify-between px-2">
                <h3 className="font-black text-lg text-foreground">Recent Deliveries</h3>
                <span className="text-xs font-bold text-muted-foreground">{history.length} Total</span>
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse">Loading history...</div>
            ) : history.length === 0 ? (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-divider">
                    <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
                    <p className="font-bold text-muted-foreground">No completed deliveries yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Accept tasks to start earning!</p>
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
