import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { verifyUPIPayment } from '@/lib/upi-payment';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Search,
  IndianRupee,
  UtensilsCrossed
} from 'lucide-react';

import { Button } from '@/components/design-system/button';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { AppHeader } from '@/components/design-system/app-header';
import { toast } from 'sonner';

export function AdminPaymentVerificationScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upi' | 'cod' | 'all'>('all');
  const [showVerified, setShowVerified] = useState(false); // Toggle between pending and verified

  // Fetch current user
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Fetch all pending payments (both UPI and COD sessions)
  useEffect(() => {
    fetchAllPayments();
    
    // Set up real-time subscription
    const channel = supabase.channel('payments-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'upi_payments'
        },
        () => {
          fetchAllPayments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dine_in_sessions'
        },
        () => {
          fetchAllPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, showVerified]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return;
      }
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile?.role === 'admin') {
        setCurrentUser(profile);
      }
    } catch (error: any) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchAllPayments = async () => {
    try {
      setLoading(true);
      const allPayments: any[] = [];

      // Fetch UPI payments
      if (activeTab === 'all' || activeTab === 'upi') {
        let upiQuery = supabase
          .from('upi_payments')
          .select('*')
          .order('created_at', { ascending: false });

        if (!showVerified) {
          upiQuery = upiQuery.eq('status', 'verification_requested');
        } else {
          upiQuery = upiQuery.eq('status', 'verified');
        }

        const { data: upiData } = await upiQuery;
        
        if (upiData) {
          const enriched = await Promise.all(
            upiData.map(async (payment) => {
              const { data: order } = await supabase
                .from('orders')
                .select('id, user_id, total_amount, order_type')
                .eq('id', payment.order_id)
                .single();
              
              return { 
                ...payment, 
                orders: order,
                payment_type: 'upi'
              };
            })
          );
          allPayments.push(...enriched);
        }
      }

      // Fetch COD sessions
      if (activeTab === 'all' || activeTab === 'cod') {
        let sessionQuery = supabase
          .from('dine_in_sessions')
          .select(`
            *,
            restaurant_tables (id, table_number)
          `)
          .eq('payment_method', 'cod')
          .order('completed_at', { ascending: false });

        if (!showVerified) {
          sessionQuery = sessionQuery.eq('payment_status', 'pending');
        } else {
          sessionQuery = sessionQuery.in('payment_status', ['paid', 'partial']);
        }

        const { data: sessionsData } = await sessionQuery;
        
        if (sessionsData) {
          const enrichedSessions = sessionsData.map(session => ({
            ...session,
            payment_type: 'cod',
            status: session.payment_status === 'paid' ? 'verified' : session.payment_status,
            transaction_id: null,
            amount: session.total_amount
          }));
          
          allPayments.push(...enrichedSessions);
        }
      }

      allPayments.sort((a, b) => {
        const dateA = new Date(a.created_at || a.completed_at).getTime();
        const dateB = new Date(b.created_at || b.completed_at).getTime();
        return dateB - dateA;
      });

      setPayments(allPayments);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUPI = async (qrId: string) => {
    if (!currentUser) {
      toast.error('Admin authentication required');
      return;
    }

    if (!window.confirm('Are you sure you want to verify this UPI payment?')) return;


    setVerifyingId(qrId);

    try {
      const result = await verifyUPIPayment(qrId, currentUser.id, 'Verified via admin dashboard');

      if (result.success) {
        toast.success('UPI payment verified successfully!');
        
        if (result.type === 'SESSION' && result.sessionId) {
          const { data: sessionData } = await supabase
            .from('dine_in_sessions')
            .select('table_id')
            .eq('id', result.sessionId)
            .single();
            
          if (sessionData?.table_id) {
            await supabase
              .from('restaurant_tables')
              .update({ status: 'available', current_session_id: null })
              .eq('id', sessionData.table_id);
          }
        }
        fetchAllPayments();
      } else {
        toast.error(result.error || 'Failed to verify UPI payment');
      }
    } catch (error: any) {
      console.error('Error verifying UPI payment:', error);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleConfirmCash = async (sessionId: string) => {
    if (!currentUser) {
      toast.error('Admin authentication required');
      return;
    }

    if (!window.confirm('Confirm cash payment received?')) return;


    setVerifyingId(sessionId);

    try {
      const { error: sessionError } = await supabase
        .from('dine_in_sessions')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      try {
        await supabase.rpc('update_session_orders_paid', { p_session_id: sessionId });
      } catch (e) {}

      const { data: sessionData } = await supabase
        .from('dine_in_sessions')
        .select('table_id, session_status')
        .eq('id', sessionId)
        .single();
      
      if (sessionData) {
        if (sessionData.session_status !== 'completed') {
          await supabase
            .from('dine_in_sessions')
            .update({ session_status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', sessionId);
        }

        if (sessionData.table_id) {
          await supabase
            .from('restaurant_tables')
            .update({ status: 'available', current_session_id: null })
            .eq('id', sessionData.table_id);
        }
      }
      
      toast.success('Cash payment confirmed! Table is now vacant.');
      fetchAllPayments();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to confirm cash payment');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleReject = async (paymentId: string, isUPI: boolean) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;


    try {
      if (isUPI) {
        const { error } = await supabase
          .from('upi_payments')
          .update({ status: 'failed', verification_notes: reason, updated_at: new Date().toISOString() })
          .eq('id', paymentId);
        if (error) throw error;
      }
      toast.success('Payment rejected');
      fetchAllPayments();
    } catch (error: any) {
      toast.error('Failed to reject payment');
    }
  };

  const getStatusBadge = (payment: any) => {
    if (payment.payment_type === 'upi') {
      switch (payment.status) {
        case 'verified': return <Badge variant="success">✓ Verified</Badge>;
        case 'verification_requested': return <Badge variant="warning">⏳ Pending</Badge>;
        case 'failed': return <Badge variant="destructive">✗ Failed</Badge>;
        default: return <Badge variant="secondary">Pending</Badge>;
      }
    }
    return payment.payment_status === 'paid' ? <Badge variant="success">✓ Paid</Badge> : <Badge variant="warning">💵 Cash Pending</Badge>;
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchLower)) ||
      (payment.order_id && payment.order_id.toLowerCase().includes(searchLower)) ||
      (payment.session_name && payment.session_name.toLowerCase().includes(searchLower))
    );
  });

  const pendingCount = payments.filter(payment => !showVerified).length;
  const verifiedCount = payments.filter(payment => showVerified).length;


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold">LOADING...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="Payment Verifications" />
      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2 bg-background p-1 rounded-lg border">
          <button onClick={() => setShowVerified(false)} className={`flex-1 py-2 rounded-md ${!showVerified ? 'bg-primary text-white' : ''}`}>
            ⏳ Pending ({pendingCount})
          </button>
          <button onClick={() => setShowVerified(true)} className={`flex-1 py-2 rounded-md ${showVerified ? 'bg-green-600 text-white' : ''}`}>
            ✓ Verified ({verifiedCount})
          </button>
        </div>

        <div className="flex gap-2 pb-2">
          {['all', 'upi', 'cod'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-4 py-2 rounded-lg ${activeTab === tab ? 'bg-primary/10 text-primary' : ''}`}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-3 border rounded-lg outline-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPayments.map(payment => (
            <Card key={payment.id}>
              <CardBody className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold">
                      {payment.payment_type === 'upi' ? `Order #${payment.order_id?.slice(0, 8)}` : `Table ${payment.restaurant_tables?.table_number}`}
                    </h4>
                    <p className="text-sm text-muted-foreground">{payment.payment_type.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">₹{payment.amount || payment.total_amount}</p>
                    {getStatusBadge(payment)}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  {!showVerified && payment.payment_type === 'upi' && (
                    <Button onClick={() => handleVerifyUPI(payment.id)} disabled={verifyingId === payment.id} className="flex-1 bg-green-600">Verify</Button>
                  )}
                  {!showVerified && payment.payment_type === 'cod' && (
                    <Button onClick={() => handleConfirmCash(payment.id)} disabled={verifyingId === payment.id} className="flex-1 bg-green-600 text-white">Confirm Cash</Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
