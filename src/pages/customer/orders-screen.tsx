import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { Button } from '@/components/design-system/button';
import { Package, Clock, CheckCircle2, Truck, Phone, UtensilsCrossed, IndianRupee, ChevronRight } from 'lucide-react';
import { supabase, type Order, type Profile, getStoredUser } from '@/lib/supabase';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { SessionPaymentModal } from '@/components/customer/SessionPaymentModal';

export function OrdersScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{id: string; amount: number} | null>(null);
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);

  // Get userId from profile or stored data
  const userId = profile?.id || getStoredUser()?.id;

  useEffect(() => {
    if (userId) {
      fetchMyOrders();
      fetchActiveSessions();
      fetchCompletedSessions();
    }

    const subscription = supabase
      .channel('my-orders')
      .on('postgres_changes' as any, { event: '*', table: 'orders' }, () => {
        fetchMyOrders();
        fetchCompletedSessions();
      })
      .subscribe();

    const sessionSubscription = supabase
      .channel('dine-in-sessions')
      .on('postgres_changes' as any, { event: '*', table: 'dine_in_sessions' }, () => {
        fetchActiveSessions();
        fetchCompletedSessions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      sessionSubscription.unsubscribe();
    };
  }, [userId]);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      if (!userId) {
        console.log('No userId available for fetching orders');
        return;
      }

      console.log('Fetching orders for userId:', userId);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      
      console.log('Fetched orders:', data);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      if (!userId) return;

      console.log('Fetching active sessions for user:', userId);

      // First, fetch active sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('dine_in_sessions')
        .select(`
          *,
          restaurant_tables (table_number)
        `)
        .eq('user_id', userId)
        .eq('session_status', 'active')
        .order('started_at', { ascending: false });

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
        throw sessionsError;
      }

      if (!sessionsData || sessionsData.length === 0) {
        setActiveSessions([]);
        return;
      }

      // Then, fetch orders for each session separately
      const sessionsWithOrders = await Promise.all(
        sessionsData.map(async (session) => {
          try {
            const { data: ordersData, error: ordersError } = await supabase
              .from('orders')
              .select(`
                id,
                order_items (
                  name,
                  quantity,
                  price
                )
              `)
              .eq('user_id', userId)
              .eq('order_type', 'dine_in')
              .ilike('notes', `%Dine-in Session: ${session.id}%`);

            if (ordersError) {
              console.warn(`Error fetching orders for session ${session.id}:`, ordersError);
              return { ...session, orders: [] };
            }

            return { ...session, orders: ordersData || [] };
          } catch (err) {
            console.warn(`Failed to fetch orders for session ${session.id}:`, err);
            return { ...session, orders: [] };
          }
        })
      );

      console.log('Active sessions with orders:', sessionsWithOrders);
      setActiveSessions(sessionsWithOrders);
    } catch (error) {
      console.error('Error fetching active sessions:', error);
    }
  };

  const fetchCompletedSessions = async () => {
    try {
      if (!userId) return;

      console.log('Fetching completed sessions for user:', userId);

      const { data, error } = await supabase
        .from('dine_in_sessions')
        .select(`
          *,
          restaurant_tables (table_number)
        `)
        .eq('user_id', userId)
        .in('session_status', ['completed', 'cancelled'])
        .order('completed_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      console.log('Completed sessions found:', data);
      setCompletedSessions(data || []);
    } catch (error) {
      console.error('Error fetching completed sessions:', error);
    }
  };

  const handlePayAndCloseSession = async (sessionId: string, totalAmount: number) => {
    // Show payment method selection modal
    setSelectedSession({ id: sessionId, amount: totalAmount });
    setShowPaymentModal(true);
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="My Orders" />

      <div className="px-4 py-4 space-y-4">
        {/* Active Dine-In Sessions Section */}
        {activeSessions.length > 0 && (
          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-black flex items-center gap-2 text-purple-900">
              <UtensilsCrossed className="w-5 h-5 text-purple-600" />
              Active Dining Sessions
            </h2>

            {activeSessions.map((session) => {
              const sessionItems = session.orders?.flatMap((order: any) => order.order_items || []) || [];
              const itemCount = sessionItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

              return (
                <Card key={session.id} className="border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-md">
                  <CardBody className="p-4">
                    {/* Header with Session Name */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <h3 className="font-bold text-lg text-purple-900">
                            {session.session_name || `Table ${session.restaurant_tables?.table_number}`}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Table {session.restaurant_tables?.table_number} • Started {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant="warning">
                        <Clock className="w-3 h-3 mr-1" />
                        {session.payment_status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Items Ordered Summary - Show ALL Items */}
                    <div className="bg-white/70 backdrop-blur-sm p-3 rounded-lg mb-3 border border-purple-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-purple-600" />
                        <h4 className="font-bold text-sm text-purple-900">All Items Ordered ({itemCount})</h4>
                      </div>
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {sessionItems
                          .reduce((acc: any[], item: any) => {
                            // Group items by name
                            const existing = acc.find(i => i.name === item.name);
                            if (existing) {
                              existing.quantity += item.quantity || 0;
                              existing.totalPrice += (item.price * (item.quantity || 0));
                            } else {
                              acc.push({
                                ...item,
                                totalQuantity: item.quantity || 0,
                                totalPrice: item.price * (item.quantity || 0)
                              });
                            }
                            return acc;
                          }, [])
                          .map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs py-1 border-b last:border-0">
                              <span className="text-muted-foreground">
                                <span className="font-bold text-purple-700">x{item.totalQuantity}</span> {item.name}
                              </span>
                              <span className="font-medium">₹{item.totalPrice}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Total & Payment Button */}
                    <div className="flex justify-between items-center pt-3 border-t border-purple-200">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Total Amount</p>
                        <p className="text-2xl font-black text-purple-600">₹{session.total_amount}</p>
                      </div>
                      
                      {session.payment_status === 'pending' ? (
                        <Button
                          onClick={() => handlePayAndCloseSession(session.id, session.total_amount)}
                          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-200"
                          size="lg"
                        >
                          <IndianRupee className="w-4 h-4 mr-2" />
                          Pay & Close Session
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-lg">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-bold">Paid</span>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

        {/* Payment Method Selection Modal */}
        {showPaymentModal && selectedSession && (
          <SessionPaymentModal
            sessionId={selectedSession.id}
            totalAmount={selectedSession.amount}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedSession(null);
            }}
          />
        )}

        {/* View Previous Sessions Link */}
        {completedSessions.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => navigate('/customer/session-history')}
              className="w-full py-3 px-4 bg-gradient-to-r from-gray-100 to-gray-50 hover:from-gray-200 hover:to-gray-100 rounded-xl border border-gray-200 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-600" />
                <span className="font-bold text-gray-900">View Previous Session History</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <p className="text-xs text-muted-foreground mt-2 ml-1">
              {completedSessions.length} completed session{completedSessions.length !== 1 ? 's' : ''} available
            </p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-2xl">
          {['all', 'ongoing', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${filter === tab
                ? 'bg-card text-primary shadow-sm'
                : 'text-muted-foreground'
                }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders
            .filter((order) => {
              if (filter === 'all') return true;
              if (filter === 'ongoing') return order.status !== 'delivered' && order.status !== 'cancelled';
              return order.status === 'delivered' || order.status === 'cancelled';
            })
            .map((order) => (
              <Card key={order.id} className="border-none shadow-sm overflow-hidden">
                <div className={`h-1.5 ${order.status === 'delivered' ? 'bg-green-500' :
                  order.status === 'cancelled' ? 'bg-red-500' :
                    order.status === 'out_for_delivery' ? 'bg-secondary' : 'bg-primary'
                  }`} />
                <CardBody className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-black text-muted-foreground uppercase">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()} • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant={
                      order.status === 'delivered' ? 'success' :
                        order.status === 'cancelled' ? 'error' :
                          order.status === 'out_for_delivery' ? 'paid' : 'pending'
                    }>
                      {order.status.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="space-y-2 py-3 border-y border-divider">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm text-foreground">
                        <span className="flex items-center gap-2">
                          <span className="font-bold">x{item.quantity}</span>
                          {item.name}
                        </span>
                        <span className="font-medium text-muted-foreground">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2">
                      <span className="font-bold">Total Amount</span>
                      <span className="font-black text-primary">₹{order.total_amount}</span>
                    </div>
                  </div>

                  {/* Delivery Tracking Section */}
                  {(order.status === 'out_for_delivery' || order.status === 'delivered') && order.delivery_person && (
                    <div className="bg-primary/5 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">
                          <Truck className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-primary uppercase">
                            {order.status === 'out_for_delivery' ? 'Out for Delivery' : 'Delivered By'}
                          </p>
                          <p className="font-bold text-foreground">{(order.delivery_person as any).full_name}</p>
                        </div>
                        <a
                          href={`tel:${(order.delivery_person as any).phone_number}`}
                          className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                        >
                          <Phone className="w-5 h-5" />
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {order.status === 'placed' && <Clock className="w-3 h-3" />}
                      {order.status === 'delivered' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      <span>
                        {order.status === 'placed' ? 'Waiting for kitchen' :
                          order.status === 'preparing' ? 'Chef is preparing' :
                            order.status === 'cooking' ? 'Dish is being cooked' :
                              order.status === 'prepared' ? 'Ready for pickup' :
                                order.status === 'out_for_delivery' ? 'On its way!' : 'Completed'}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>

        {/* Empty State */}
        {orders.length === 0 && !loading && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground font-bold">No orders found yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
