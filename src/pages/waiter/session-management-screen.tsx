import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Clock, Plus, Utensils, User, Mail, Phone } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/contexts/cart-context';
import { SessionPaymentModal } from '@/components/customer/SessionPaymentModal';
import { toast } from 'sonner';

export function WaiterSessionManagementScreen() {

  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { setWaiterContext, previousOrders: orders, fetchOrderHistory } = useCart();
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (sessionId) {
      setLoading(true);
      fetchSessionDetails();
      fetchOrderHistory();

      // Real-time subscription for session metadata
      const channel = supabase.channel(`session-mgmt-${sessionId}`)
        .on('postgres_changes', {
          event: '*',
          table: 'dine_in_sessions',
          schema: 'public',
          filter: `id=eq.${sessionId}`
        }, () => {
          console.log('Real-time: Session metadata update triggered');
          fetchSessionDetails();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      console.log('🔍 Fetching session with ID:', sessionId);
      console.log('Supabase client status:', supabase ? 'initialized' : 'NOT initialized');

      // Try direct RPC call first (bypasses RLS)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'get_session_by_id',
        { session_id: sessionId }
      );

      if (rpcError) {
        console.log('⚠️ RPC failed, trying REST API:', rpcError);
        
        // Fallback to REST API
        const { data: sessionData, error: sessionError } = await supabase
          .from('dine_in_sessions')
          .select('*')
          .eq('id', sessionId);

        if (sessionError) {
          console.error('❌ Supabase REST error:', sessionError);
          throw sessionError;
        }

        console.log('✅ Session data returned:', sessionData);

        if (!sessionData || sessionData.length === 0) {
          console.error('❌ No data returned - checking database...');
          
          // Debug: Check if session exists in DB
          const { data: allSessions } = await supabase
            .from('dine_in_sessions')
            .select('id, session_name, session_status')
            .eq('session_status', 'active');
          
          console.log('📋 All active sessions:', allSessions);
          throw new Error('Session not found. Please check if the session exists in the database.');
        }

        const sessionSingle = sessionData[0];

        // Get table info
        const { data: tableData, error: tableError } = await supabase
          .from('restaurant_tables')
          .select('id, table_number, capacity')
          .eq('id', sessionSingle.table_id);

        if (tableError) {
          console.error('❌ Table error:', tableError);
          throw tableError;
        }

        console.log('✅ Table data returned:', tableData);

        const tableSingle = tableData && tableData.length > 0 ? tableData[0] : null;

        setSession({
          ...sessionSingle,
          restaurant_tables: tableSingle
        });

        // Sync with global cart context
        if (tableSingle) {
          setWaiterContext(tableSingle.id, sessionSingle.id, sessionSingle);
        }
      } else {
        console.log('✅ RPC success:', rpcData);
        const sessionSingle = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        
        const { data: tableData } = await supabase
          .from('restaurant_tables')
          .select('id, table_number, capacity')
          .eq('id', sessionSingle.table_id);

        setSession({
          ...sessionSingle,
          restaurant_tables: tableData?.[0] || null
        });

        // Sync with global cart context
        if (tableData?.[0]) {
          setWaiterContext(tableData[0].id, sessionSingle.id, sessionSingle);
        }
      }
    } catch (error: any) {
      console.error('❌ Error fetching session:', error);
      toast.error('Failed to load session details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoreItems = () => {
    // Navigate to ordering screen with session info
    navigate(`/waiter/ordering/${session.restaurant_tables.id}`, {
      state: {
        sessionId: session.id,
        sessionName: session.session_name,
        existingSession: true
      }
    });
  };

  const handleCloseSession = () => {
    setShowPaymentModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background pb-4">
        <AppHeader title="Session Not Found" />
        <div className="px-4 py-20 text-center">
          <p className="text-muted-foreground mb-4">Session not found or has been removed.</p>
          <Button onClick={() => navigate('/waiter/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const totalAmount = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const totalItems = orders.reduce((sum, order) => {
    const items = order.order_items || [];
    return sum + items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0);
  }, 0);

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title={`Session: ${session.session_name}`} />

      <div className="px-4 py-4 space-y-4">
        {/* Session Info Card */}
        <Card>
          <CardBody className="p-4 bg-primary/5 border-primary/20">
            <div className="space-y-3">
              {/* Table Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Utensils className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary uppercase">Table</p>
                  <p className="text-lg font-black text-foreground">
                    Table {session.restaurant_tables?.table_number}
                  </p>
                </div>
              </div>

              {/* Session Status */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-green-600 uppercase">Status</p>
                  <div className="mt-1">
                    <Badge 
                      variant={session.session_status === 'active' ? 'success' : 'secondary'}
                    >
                      {session.session_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              {session.user_id && (
                <>
                  <div className="flex items-center gap-3 pt-3 border-t border-divider">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-blue-600 uppercase">Customer</p>
                      <p className="text-sm font-medium text-foreground">
                        {session.customer_name || 'Registered Customer'}
                      </p>
                    </div>
                  </div>

                  {session.customer_email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                        <Mail className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-purple-600 uppercase">Email</p>
                        <p className="text-sm font-medium text-foreground">
                          {session.customer_email}
                        </p>
                      </div>
                    </div>
                  )}

                  {session.customer_phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                        <Phone className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-orange-600 uppercase">Phone</p>
                        <p className="text-sm font-medium text-foreground">
                          {session.customer_phone}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <ShoppingBag className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-foreground mb-1">Order Summary</h3>
                <p className="text-sm text-muted-foreground">
                  Total orders: {orders.length} | Items: {totalItems}
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-xl font-black text-foreground">₹{totalAmount.toFixed(2)}</p>
              </div>
              <div className="bg-surface p-3 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-1">Payment</p>
                <div className="mt-1">
                  <Badge 
                    variant={session.payment_status === 'paid' ? 'paid' : 'pending'}
                  >
                    {session.payment_status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <Card>
            <CardBody className="p-4">
              <h4 className="font-bold text-foreground mb-3">Recent Orders</h4>
              <div className="space-y-2">
                {orders.slice(0, 5).map((order, index) => (
                  <div key={order.id} className="flex items-center justify-between p-2 bg-surface rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">Order #{index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">₹{order.total_amount}</p>
                      <div className="mt-1">
                        <Badge 
                          variant={order.status === 'completed' ? 'success' : order.status === 'placed' ? 'info' : 'secondary'}
                          size="sm"
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={handleAddMoreItems}
            className="w-full h-12"
            size="lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add More Items
          </Button>

          <Button
            onClick={handleCloseSession}
            variant="secondary"
            className="w-full h-12"
            size="lg"
            disabled={session.session_status !== 'active' || orders.length === 0}
          >
            Close & Pay Session
          </Button>

          <Button
            onClick={() => navigate('/waiter/dashboard')}
            variant="outline"
            className="w-full h-12"
          >
            Back to Dashboard
          </Button>
        </div>

        {/* Admin Actions */}
        {userProfile?.role === 'admin' && (
          <div className="pt-4 border-t border-divider">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Admin Controls
            </h3>
            <Button 
              variant="outline" 
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm('ADMIN: Force vacate this table? This will not mark payment as completed.')) return;
                try {
                  // 1. Mark the session as completed/cancelled
                  const { error: sessionError } = await supabase
                    .from('dine_in_sessions')
                    .update({ 
                      session_status: 'completed',
                      completed_at: new Date().toISOString()
                    })
                    .eq('id', session.id);

                  if (sessionError) throw sessionError;

                  // 2. Clear the table
                  const { error: tableError } = await supabase
                    .from('restaurant_tables')
                    .update({ 
                      status: 'available', 
                      current_session_id: null 
                    })
                    .eq('id', session.restaurant_tables.id);
                  
                  if (tableError) throw tableError;

                  toast.success('Table vacated successfully');
                  navigate('/admin/tables');
                } catch (e: any) {
                  console.error('Force vacate error:', e);
                  toast.error(`Error: ${e.message || 'Failed to vacate table'}`);
                }
              }}
            >
              Force Vacate Table
            </Button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Closing this session will initiate the payment process. The table will be marked as vacant once the payment is verified by the admin.
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <SessionPaymentModal
          sessionId={sessionId!}
          totalAmount={totalAmount}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
