import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, Plus, Utensils, User, Receipt, Shield, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useCart } from '@/contexts/cart-context';
import { SessionPaymentModal } from '@/components/customer/SessionPaymentModal';
import { SessionBillModal } from '@/components/admin/SessionBillModal';
import { toast } from 'sonner';
import { SpiceLevel } from '@/components/design-system/spice-level';

export function WaiterSessionManagementScreen() {

  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { setWaiterContext, previousOrders: orders, fetchOrderHistory } = useCart();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);

  useEffect(() => {
    if (sessionId) {
      setLoading(true);
      fetchSessionDetails();
      fetchOrderHistory();
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

  const handleToggleItemServed = async (orderId: string, itemId: string, currentStatus: boolean, allOrderItems: any[]) => {
    try {
      const newStatus = !currentStatus;
      
      // 1. Update the item status
      const { error: itemError } = await supabase
        .from('order_items')
        .update({ is_served: newStatus })
        .eq('id', itemId);

      if (itemError) throw itemError;

      // 2. Refresh local state via fetchOrderHistory (from context)
      await fetchOrderHistory();

      // 3. Check if ALL items in THIS order are now served
      const updatedItems = allOrderItems.map(item => 
        item.id === itemId ? { ...item, is_served: newStatus } : item
      );
      
      const allServed = updatedItems.every(item => item.is_served);
      
      if (allServed) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'served' })
          .eq('id', orderId);
          
        if (orderError) throw orderError;
        toast.success('All items served! Order marked as SERVED.');
      }
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-warm-off-white pb-4">
      <AppHeader title={session.session_name} showBack onBack={() => navigate('/waiter')} />

      <div className="px-4 py-8 space-y-8">
        {/* Session Identity Card */}
        {/* ... (keep existing card) */}
        <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden bg-white">
          <CardBody className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-brand-maroon/10 rounded-2xl flex items-center justify-center">
                  <Utensils className="w-7 h-7 text-brand-maroon" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-brand-maroon uppercase tracking-widest mb-0.5">Active Station</p>
                  <h2 className="text-2xl font-black text-foreground">
                    Table {session.restaurant_tables?.table_number}
                  </h2>
                </div>
              </div>
              <Badge className="bg-brand-gold text-white border-none font-black text-[10px] px-3 shadow-sm shadow-brand-gold/20">
                {session.session_status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-divider">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Protocol</p>
                <p className="text-sm font-bold text-foreground truncate">
                  {session.user_id ? 'Authenticated' : 'Direct Instance'}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Start Time</p>
                <p className="text-sm font-bold text-foreground">
                  {new Date(session.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {session.user_id && (
              <div className="mt-6 p-4 bg-warm-beige rounded-2xl border border-divider flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                  <User className="w-5 h-5 text-brand-maroon" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-black text-foreground truncate">{session.customer_name || 'Protocol Guest'}</p>
                  <p className="text-[10px] font-medium text-muted-foreground truncate">{session.customer_email || 'No identity hash'}</p>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Financial Matrix */}
        {/* ... (keep financial matrix) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-brand-maroon uppercase tracking-[0.2em]">Financial Matrix</h3>
            <div className="h-[1px] flex-1 mx-4 bg-brand-maroon/10" />
            <Receipt className="w-4 h-4 text-brand-maroon opacity-40" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none bg-white shadow-premium rounded-[1.5rem] p-5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Liability</p>
              <p className="text-3xl font-black text-foreground">₹{totalAmount.toFixed(0)}</p>
              <div className="mt-2 h-1 w-8 bg-brand-maroon rounded-full" />
            </Card>
            <Card className="border-none bg-white shadow-premium rounded-[1.5rem] p-5">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Payload</p>
              <p className="text-3xl font-black text-foreground">{totalItems}</p>
              <p className="text-[10px] font-bold text-muted-foreground mt-1">TOTAL ITEMS</p>
            </Card>
          </div>
        </div>

        {/* Order Registry - SHOW DETAILED ITEMS */}
        {orders.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-brand-maroon uppercase tracking-[0.2em]">Order Registry</h3>
              <div className="h-[1px] flex-1 mx-4 bg-brand-maroon/10" />
              <ShoppingBag className="w-4 h-4 text-brand-maroon opacity-40" />
            </div>

            <div className="space-y-6">
              {orders.map((order, orderIdx) => (
                <div key={order.id} className="bg-white rounded-3xl border border-divider shadow-sm overflow-hidden">
                  {/* Order Header */}
                  <div className="bg-muted/30 px-6 py-4 flex justify-between items-center border-b border-divider">
                    <div>
                      <p className="text-[10px] font-black text-brand-maroon uppercase tracking-widest">Order Group #{orders.length - orderIdx}</p>
                      <p className="text-[10px] font-bold text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                    <Badge
                      variant={order.status === 'served' ? 'success' : 'pending'}
                      className="text-[9px] font-black"
                    >
                      {order.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Order Items with Ticking Support */}
                  <div className="divide-y divide-divider">
                    {order.order_items?.map((item: any) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center gap-4 p-4 transition-all ${item.is_served ? 'bg-green-50/30' : 'bg-white'}`}
                      >
                          <button
                            onClick={() => handleToggleItemServed(order.id, item.id, item.is_served, order.order_items)}
                            className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${
                              item.is_served 
                                ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-100' 
                                : 'bg-white border-brand-maroon/30 text-brand-maroon/20 hover:border-brand-maroon hover:text-brand-maroon/40'
                            }`}
                          >
                            <CheckCircle2 className={`w-4 h-4 ${!item.is_served ? 'opacity-40' : ''}`} />
                          </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm leading-tight transition-all ${item.is_served ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black text-brand-maroon bg-brand-maroon/5 px-2 py-0.5 rounded-full">x{item.quantity}</span>
                            <SpiceLevel level={item.spice_level} className="opacity-90" />
                          </div>
                        </div>
                        <p className="text-sm font-black text-foreground">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer */}
                  <div className="px-6 py-3 bg-muted/10 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Subtotal</span>
                    <span className="text-sm font-black text-brand-maroon">₹{order.total_amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Operational Commands */}
        <div className="grid gap-3 pt-4">
          <Button
            onClick={handleAddMoreItems}
            className="w-full h-16 bg-brand-maroon hover:bg-[#5D1227] text-white rounded-[1.25rem] shadow-xl shadow-brand-maroon/20 font-black text-lg"
          >
            <Plus className="w-6 h-6 mr-2" />
            APPEND ORDER
          </Button>

          <Button
            onClick={handleCloseSession}
            className="w-full h-16 bg-brand-gold hover:bg-[#B8962F] text-white rounded-[1.25rem] shadow-xl shadow-brand-gold/20 font-black text-lg"
            disabled={session.session_status !== 'active' || (orders?.length || 0) === 0}
          >
            <Receipt className="w-6 h-6 mr-2" />
            TERMINATE & PAY
          </Button>

          <Button
            onClick={() => setShowBillModal(true)}
            variant="outline"
            className="w-full h-14 border-2 border-brand-maroon/20 text-brand-maroon font-black rounded-2xl hover:bg-brand-maroon/5 mt-2"
            disabled={(orders?.length || 0) === 0}
          >
            <Receipt className="w-5 h-5 mr-2" />
            INVOICE PREVIEW
          </Button>
        </div>

        {/* Security / Admin Controls */}
        {userProfile?.role === 'admin' && (
          <div className="pt-8 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Shield className="w-4 h-4 text-destructive" />
              <h3 className="text-xs font-black text-destructive uppercase tracking-widest">Command Override</h3>
            </div>
            <Button
              variant="outline"
              className="w-full h-14 border-2 border-destructive/20 text-destructive hover:bg-destructive/5 rounded-2xl font-black"
              onClick={async () => {
                if (!confirm('PROTOCOL OVERRIDE: Force vacate this station? Registry data may be compromised.')) return;
                try {
                  const { error: sessionError } = await supabase
                    .from('dine_in_sessions')
                    .update({
                      session_status: 'completed',
                      completed_at: new Date().toISOString()
                    })
                    .eq('id', session.id);

                  if (sessionError) throw sessionError;

                  const { error: tableError } = await supabase
                    .from('restaurant_tables')
                    .update({
                      status: 'available',
                      current_session_id: null
                    })
                    .eq('id', session.restaurant_tables.id);

                  if (tableError) throw tableError;

                  toast.success('Station Vacated');
                  navigate('/waiter/dashboard');
                } catch (e: any) {
                  toast.error(`Override Failed: ${e.message}`);
                }
              }}
            >
              FORCE VACATE STATION
            </Button>
          </div>
        )}

        {/* Procedural Note */}
        <div className="bg-brand-maroon/5 rounded-2xl p-5 border border-brand-maroon/10">
          <p className="text-xs text-brand-maroon/70 font-medium leading-relaxed italic">
            Note: Session termination initiates the financial reconciliation process. Station availability is restored post-verification.
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
      {/* Bill Modal */}
      {showBillModal && (
        <SessionBillModal
          sessionId={sessionId!}
          tableNumber={session.restaurant_tables?.table_number}
          sessionName={session.session_name}
          onClose={() => setShowBillModal(false)}
        />
      )}
    </div>
  );
}
