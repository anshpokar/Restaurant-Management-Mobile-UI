import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { Button } from '@/components/design-system/button';
import { Package, CheckCircle2, XCircle, Clock, Calendar, IndianRupee, CreditCard, ChevronLeft, Filter } from 'lucide-react';
import { supabase, type Profile, getStoredUser } from '@/lib/supabase';
import { useOutletContext, useNavigate } from 'react-router-dom';

export function SessionHistoryScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const navigate = useNavigate();
  const [completedSessions, setCompletedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const userId = profile?.id || getStoredUser()?.id;

  useEffect(() => {
    if (userId) {
      fetchAllSessions(); // Changed to fetch all sessions including active
    }

    const subscription = supabase
      .channel('session-history')
      .on('postgres_changes' as any, { event: '*', table: 'dine_in_sessions' }, () => {
        fetchAllSessions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  async function fetchAllSessions() {
    try {
      if (!userId) return;

      console.log('Fetching all sessions for user:', userId);

      // First, fetch sessions without the orders join
      let query = supabase
        .from('dine_in_sessions')
        .select(`
          *,
          restaurant_tables (table_number)
        `)
        .eq('user_id', userId);

      // Apply date filter if set
      if (startDate) {
        query = query.gte('started_at', startDate);
      }
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        query = query.lt('started_at', endDateObj.toISOString());
      }

      // Filter by status based on selected filter
      if (filter !== 'all') {
        query = query.eq('session_status', filter);
      } else {
        // For 'all', include active, completed, and cancelled
        query = query.in('session_status', ['active', 'completed', 'cancelled']);
      }

      query = query.order('started_at', { ascending: false });

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) throw sessionsError;

      if (!sessionsData || sessionsData.length === 0) {
        setCompletedSessions([]);
        return;
      }

      // Then, fetch orders for each session separately
      const sessionsWithOrders = await Promise.all(
        sessionsData.map(async (session) => {
          try {
            // Fetch orders linked to this session via notes field
            // Using LIKE query to match "Dine-in Session: {session_id}"
            const { data: ordersData, error: ordersError } = await supabase
              .from('orders')
              .select(`
                id,
                order_items (
                  name,
                  quantity,
                  price,
                  image
                ),
                total_amount,
                status,
                payment_status,
                is_paid
              `)
              .eq('user_id', userId)
              .like('notes', `%Dine-in Session: ${session.id}%`);

            if (ordersError) {
              console.warn(`Error fetching orders for session ${session.id}:`, ordersError);
              return { ...session, orders: [] };
            }

            // If no orders found by notes, try by session_name
            let finalOrders = ordersData || [];
            if (finalOrders.length === 0 && session.session_name) {
              const { data: nameMatchedOrders, error: nameError } = await supabase
                .from('orders')
                .select(`
                  id,
                  order_items (
                    name,
                    quantity,
                    price,
                    image
                  ),
                  total_amount,
                  status,
                  payment_status,
                  is_paid
                `)
                .eq('user_id', userId)
                .eq('session_name', session.session_name);

              if (!nameError && nameMatchedOrders) {
                finalOrders = nameMatchedOrders;
              }
            }

            console.log(`Session ${session.id} has ${finalOrders.length} order(s)`);

            return { 
              ...session, 
              orders: finalOrders 
            };
          } catch (orderError) {
            console.warn(`Failed to fetch orders for session ${session.id}:`, orderError);
            return { ...session, orders: [] };
          }
        })
      );

      console.log('Fetched sessions with orders:', sessionsWithOrders);
      setCompletedSessions(sessionsWithOrders);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = completedSessions.filter(session => {
    if (filter === 'all') return true;
    
    // Sessions with completed status but pending payment should be treated as active
    const effectiveStatus = session.session_status === 'completed' && session.payment_status === 'pending' 
      ? 'active' 
      : session.session_status;
    
    return effectiveStatus === filter;
  });

  const getStatusBadge = (session: any) => {
    // If session is completed but payment is pending, show as Active
    if (session.session_status === 'completed' && session.payment_status === 'pending') {
      return <Badge variant="info"><Clock className="w-3 h-3 mr-1" /> Active</Badge>;
    }
    
    switch (session.session_status) {
      case 'completed':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      case 'active':
        return <Badge variant="info"><Clock className="w-3 h-3 mr-1" /> Active</Badge>;
      default:
        return <Badge variant="info">{session.session_status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-4">
      <AppHeader 
        title="Session History" 
        showBack
        onBack={() => navigate('/customer/orders')}
        actions={
          <button 
            onClick={() => setShowDateFilter(!showDateFilter)} 
            className={`p-2 hover:bg-muted rounded-full ${showDateFilter ? 'text-primary' : ''}`}
          >
            <Filter className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Date Range Filter */}
        {showDateFilter && (
          <Card>
            <CardBody className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={fetchAllSessions}
                  size="sm"
                  className="flex-1"
                >
                  Apply Filter
                </Button>
                <Button 
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setShowDateFilter(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-2xl overflow-x-auto">
          {['all', 'active', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === tab
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
              <p className="text-lg font-bold text-blue-600">
                {completedSessions.filter(s => 
                  s.session_status === 'active' || 
                  (s.session_status === 'completed' && s.payment_status === 'pending')
                ).length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Completed</span>
              </div>
              <p className="text-lg font-bold text-green-600">
                {completedSessions.filter(s => 
                  s.session_status === 'completed' && s.payment_status !== 'pending'
                ).length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Cancelled</span>
              </div>
              <p className="text-lg font-bold text-red-600">
                {completedSessions.filter(s => s.session_status === 'cancelled').length}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Session History List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Loading session history...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No session history found</p>
            <p className="text-xs mt-1">Your completed dine-in sessions will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => {
              const sessionItems = session.orders?.flatMap((order: any) => order.order_items || []) || [];
              const itemCount = sessionItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

              return (
                <Card key={session.id} className="border-gray-200 bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all">
                  <CardBody className="p-4">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">
                          {session.session_name || `Table ${session.restaurant_tables?.table_number}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Table {session.restaurant_tables?.table_number} • 
                          {session.completed_at ? new Date(session.completed_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(session)}
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div className="bg-white/70 p-3 rounded-lg mb-3 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-gray-600" />
                        <h4 className="font-bold text-sm text-gray-900">All Items ({itemCount})</h4>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto text-xs">
                        {sessionItems
                          .reduce((acc: any[], item: any) => {
                            const existing = acc.find(i => i.name === item.name);
                            if (existing) {
                              existing.quantity += item.quantity || 0;
                            } else {
                              acc.push({ ...item, totalQuantity: item.quantity || 0 });
                            }
                            return acc;
                          }, [])
                          .map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between py-1 border-b last:border-0">
                              <span className="text-muted-foreground">
                                <span className="font-bold text-purple-700">x{item.totalQuantity}</span> {item.name}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Footer Details */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                        <p className="text-xl font-black text-gray-900">₹{session.paid_amount || session.total_amount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                        <p className="text-sm font-bold">
                          {session.payment_method === 'cod' ? '💵 COD' : '📱 UPI'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Payment Status</p>
                          <div className="flex items-center gap-2">
                            {session.payment_status === 'paid' ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <span className="font-bold text-green-600 text-sm">Paid</span>
                              </>
                            ) : (
                              <span className="font-medium text-sm text-orange-600 capitalize">{session.payment_status}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
