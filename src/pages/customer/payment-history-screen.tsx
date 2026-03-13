import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { Package, CheckCircle2, XCircle, Clock, CreditCard, IndianRupee, Calendar } from 'lucide-react';
import { supabase, type Profile, getStoredUser } from '@/lib/supabase';
import { useOutletContext } from 'react-router-dom';

export function PaymentHistoryScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'rejected' | 'pending'>('all');

  const userId = profile?.id || getStoredUser()?.id;

  useEffect(() => {
    if (userId) {
      fetchPaymentHistory();
    }

    const subscription = supabase
      .channel('payment-history')
      .on('postgres_changes' as any, { event: '*', table: 'upi_payments' }, () => {
        fetchPaymentHistory();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  async function fetchPaymentHistory() {
    try {
      if (!userId) return;

      console.log('📜 Fetching payment history for user:', userId);

      // Step 1: Fetch UPI payments
      const { data: upiPaymentsData, error: upiError } = await supabase
        .from('upi_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (upiError) {
        console.error('Error fetching UPI payments:', upiError);
      }

      // Step 2: Fetch COD orders (cash payments that don't have UPI records)
      const { data: codOrdersData, error: codOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          payment_status,
          is_paid,
          payment_method,
          created_at,
          paid_at
        `)
        .eq('user_id', userId)
        .eq('payment_method', 'cod')
        .order('created_at', { ascending: false });

      if (codOrdersError) {
        console.error('Error fetching COD orders:', codOrdersError);
      }

      // Step 3: Fetch COD sessions (cash dine-in sessions)
      const { data: codSessionsData, error: codSessionsError } = await supabase
        .from('dine_in_sessions')
        .select(`
          id,
          total_amount,
          session_status,
          payment_status,
          payment_method,
          created_at,
          payment_completed_at
        `)
        .eq('user_id', userId)
        .eq('payment_method', 'cod')
        .order('created_at', { ascending: false });

      if (codSessionsError) {
        console.error('Error fetching COD sessions:', codSessionsError);
      }

      // Combine all payments
      const allPayments = [];

      // Add UPI payments
      if (upiPaymentsData && upiPaymentsData.length > 0) {
        allPayments.push(...upiPaymentsData);
      }

      // Add COD orders as pseudo-payments
      if (codOrdersData && codOrdersData.length > 0) {
        const codOrderPayments = codOrdersData.map(order => ({
          id: `cod_order_${order.id}`,
          order_id: order.id,
          amount: order.total_amount,
          payment_method: 'cod',
          status: order.payment_status === 'paid' ? 'verified' : 'pending',
          created_at: order.created_at,
          paid_at: order.paid_at,
          is_cod: true,
          type: 'ORDER'
        }));
        allPayments.push(...codOrderPayments);
      }

      // Add COD sessions as pseudo-payments
      if (codSessionsData && codSessionsData.length > 0) {
        const codSessionPayments = codSessionsData.map(session => ({
          id: `cod_session_${session.id}`,
          order_id: session.id,
          amount: session.total_amount,
          payment_method: 'cod',
          status: session.payment_status === 'paid' ? 'verified' : 'pending',
          created_at: session.created_at,
          paid_at: session.payment_completed_at,
          is_cod: true,
          type: 'SESSION'
        }));
        allPayments.push(...codSessionPayments);
      }

      console.log('📊 Combined payments:', {
        upi: upiPaymentsData?.length || 0,
        cod_orders: codOrdersData?.length || 0,
        cod_sessions: codSessionsData?.length || 0,
        total: allPayments.length
      });

      // Step 4: Enrich with order/session details
      if (allPayments.length > 0) {
        const enrichedPayments = await Promise.all(
          allPayments.map(async (payment) => {
            try {
              // Skip enrichment for COD payments (we already have the data)
              if ((payment as any).is_cod) {
                console.log(`✅ COD Payment ${payment.id}:`, {
                  type: (payment as any).type,
                  amount: payment.amount,
                  status: payment.status
                });
                
                return {
                  ...payment,
                  order_type: (payment as any).type,
                  order_details: {},
                  display_amount: payment.amount,
                  display_status: payment.status,
                  payment_method: 'cod'
                };
              }

              // For UPI payments, enrich with order/session data
              // Try to find matching order first
              const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .select('id, total_amount, status, payment_status, is_paid, payment_method')
                .eq('id', payment.order_id)
                .single();

              // If no order found, try dine_in_sessions
              let sessionData = null;
              if (!orderData) {
                // Try with payment_method first (if column exists)
                const { data: session, error: sessionError } = await supabase
                  .from('dine_in_sessions')
                  .select('id, session_status, payment_status, total_amount, session_name, payment_method')
                  .eq('id', payment.order_id)
                  .single();
                
                // If 406 error (column doesn't exist), retry without payment_method
                if (sessionError?.code === 'PGRST200' || sessionError?.message?.includes('406')) {
                  console.warn('⚠️ payment_method column missing, retrying without it');
                  const { data: sessionFallback } = await supabase
                    .from('dine_in_sessions')
                    .select('id, session_status, payment_status, total_amount, session_name')
                    .eq('id', payment.order_id)
                    .single();
                  sessionData = sessionFallback;
                } else {
                  sessionData = session;
                }
              }

              console.log(`✅ UPI Payment ${payment.id}:`, {
                type: orderData ? 'ORDER' : sessionData ? 'SESSION' : 'UNKNOWN',
                amount: orderData?.total_amount || sessionData?.total_amount || payment.amount,
                paymentMethod: (orderData as any)?.payment_method || (sessionData as any)?.payment_method || 'unknown'
              });

              return {
                ...payment,
                order_type: orderData ? 'ORDER' : sessionData ? 'SESSION' : 'UNKNOWN',
                order_details: orderData || sessionData || {},
                display_amount: orderData?.total_amount || sessionData?.total_amount || payment.amount,
                display_status: orderData?.payment_status || sessionData?.payment_status || payment.status,
                payment_method: (orderData as any)?.payment_method || (sessionData as any)?.payment_method || payment.payment_method
              };
            } catch (err) {
              console.warn(`⚠️ Failed to fetch details for payment ${payment.id}:`, err);
              return {
                ...payment,
                order_type: 'UNKNOWN',
                order_details: {},
                display_amount: payment.amount,
                display_status: payment.status
              };
            }
          })
        );

        console.log('✅ Payment history loaded:', enrichedPayments.length, 'payments');
        setPayments(enrichedPayments);
      } else {
        console.log('ℹ️ No payment history found');
        setPayments([]);
      }
    } catch (error) {
      console.error('❌ Error fetching payment history:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredPayments = payments.filter(payment => {
    if (filter === 'all') return true;
    
    // Determine if payment is approved/completed
    const isApproved = 
      payment.display_status === 'paid' ||        // COD paid
      payment.status === 'verified' ||            // UPI verified
      payment.display_status === 'completed';     // Session completed
    
    // Determine if payment is rejected/failed
    const isRejected = 
      payment.display_status === 'failed' ||
      payment.display_status === 'refunded' ||
      payment.status === 'failed';
    
    // Determine if payment is pending
    const isPending = 
      ['pending', 'confirming_payment'].includes(payment.display_status) || 
      ['pending', 'verification_requested'].includes(payment.status);
    
    if (filter === 'approved') return isApproved;
    if (filter === 'rejected') return isRejected;
    if (filter === 'pending') return isPending;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'pending':
      case 'confirming_payment':
        return <Badge variant="pending"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'failed':
      case 'refunded':
        return <Badge variant="error"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-4">
      <AppHeader title="Payment History" />

      <div className="px-4 py-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-2xl overflow-x-auto">
          {['all', 'approved', 'pending', 'rejected'].map((tab) => (
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

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Approved</span>
              </div>
              <p className="text-lg font-bold text-green-600">
                {payments.filter(p => 
                  p.display_status === 'paid' ||        // COD paid
                  p.status === 'verified' ||            // UPI verified
                  p.display_status === 'completed'      // Session completed
                ).length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-600" />
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
              <p className="text-lg font-bold text-orange-600">
                {payments.filter(p => 
                  ['pending', 'confirming_payment'].includes(p.display_status) || 
                  ['pending', 'verification_requested'].includes(p.status)
                ).length}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Rejected</span>
              </div>
              <p className="text-lg font-bold text-red-600">
                {payments.filter(p => 
                  p.display_status === 'failed' ||
                  p.display_status === 'refunded' ||
                  p.status === 'failed'
                ).length}
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Payment History List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
            <p>Loading payment history...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No payment history found</p>
            <p className="text-xs mt-1">Your UPI payments will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <Card key={payment.id} className="border-none shadow-sm overflow-hidden">
                <CardBody className="p-4">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">
                          {payment.order_type === 'SESSION' ? 'Session' : 'Order'}: {payment.order_id?.slice(0, 8)}...
                        </span>
                      </div>
                      <h3 className="font-bold text-base">
                        ₹{payment.display_amount || payment.amount}
                      </h3>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(payment.display_status || payment.status)}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 py-3 border-t border-b">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Date</span>
                      </div>
                      <p className="text-sm font-medium">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Time</span>
                      </div>
                      <p className="text-sm font-medium">
                        {new Date(payment.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <IndianRupee className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Amount</span>
                      </div>
                      <p className="text-sm font-bold text-primary">
                        ₹{payment.display_amount || payment.amount}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <CreditCard className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Method</span>
                      </div>
                      <p className="text-sm font-medium">
                        {payment.order_type === 'SESSION' ? '🍽️ Dine-in' : '📦 Order'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {payment.order_details?.payment_method === 'cod' ? '💵 Cash' : 
                         payment.order_details?.payment_method === 'upi' ? '📱 UPI' : 
                         payment.payment_method === 'cod' ? '💵 Cash' : '📱 UPI'}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="mt-3 pt-3 border-t">
                    {payment.transaction_id && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Transaction ID:</span>
                        <span className="font-mono text-foreground">{payment.transaction_id}</span>
                      </div>
                    )}
                    {payment.paid_at && (
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-muted-foreground">Paid At:</span>
                        <span className="text-muted-foreground">
                          {new Date(payment.paid_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {payment.admin_verified_by && (
                      <div className="flex justify-between items-center text-xs mt-1">
                        <span className="text-muted-foreground">Verified By:</span>
                        <span className="text-green-600 font-medium">Admin</span>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
