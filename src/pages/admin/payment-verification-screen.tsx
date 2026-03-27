import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { verifyUPIPayment } from '@/lib/upi-payment';
import { 
  CheckCircle, 
  XCircle, 
  Search,
  IndianRupee,
  UtensilsCrossed,
  Loader2
} from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';
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
        .maybeSingle();
      
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
                .maybeSingle();
              
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
            .maybeSingle();
            
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
        .maybeSingle();
      
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
        case 'verified': return <Badge variant="success" className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0">VERIFIED</Badge>;
        case 'verification_requested': return <Badge variant="warning" className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0 animate-pulse">PENDING</Badge>;
        case 'failed': return <Badge variant="error" className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0">FAILED</Badge>;
        default: return <Badge variant="secondary" className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0">AWAITING</Badge>;
      }
    }
    return payment.payment_status === 'paid' 
      ? <Badge variant="success" className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0">PAID</Badge> 
      : <Badge variant="warning" className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0">CASH DUE</Badge>;
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

  const pendingCount = payments.filter(p => p.status === 'verification_requested' || p.payment_status === 'pending').length;
  const verifiedCount = payments.filter(p => p.status === 'verified' || p.payment_status === 'paid').length;


  if (loading && payments.length === 0) {
    return (
      <div className="min-h-screen bg-muted/5 pb-20">
        <AppHeader title="Finance Audit" />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-brand-maroon/20 mb-4" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Synchronizing Ledgers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="Finance Audit" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 py-6 space-y-8 max-w-[1400px] mx-auto"
      >
        {/* Status Switcher */}
        <div className="flex p-1.5 bg-muted/30 backdrop-blur-sm rounded-[1.5rem] border border-white/50 max-w-md mx-auto">
          <button 
            onClick={() => setShowVerified(false)} 
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${!showVerified ? 'bg-brand-maroon text-white shadow-xl shadow-brand-maroon/20 scale-105' : 'text-muted-foreground hover:bg-white/50'}`}
          >
            AWAITING ({pendingCount})
          </button>
          <button 
            onClick={() => setShowVerified(true)} 
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${showVerified ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 scale-105' : 'text-muted-foreground hover:bg-white/50'}`}
          >
            VERIFIED ({verifiedCount})
          </button>
        </div>

        {/* Filters & Search */}
        <div className="space-y-4">
          <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
            {['all', 'upi', 'cod'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab as any)} 
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-brand-maroon text-white shadow-lg shadow-brand-maroon/20' : 'bg-white text-muted-foreground hover:bg-muted'}`}
              >
                {tab === 'all' ? 'All Channels' : tab.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand-maroon transition-colors" />
            <input 
              type="text" 
              placeholder="Search by ID or Table..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-12 pr-6 py-4 bg-white border-2 border-transparent focus:border-brand-maroon/20 rounded-[2rem] shadow-xl shadow-black/5 outline-none transition-all placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPayments.map((payment, index) => (
              <motion.div
                key={payment.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="shadow-xl shadow-black/5 border-none rounded-[2.5rem] group hover:shadow-2xl hover:shadow-brand-maroon/5 overflow-hidden transition-all duration-300">
                  <CardBody className="p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border transition-colors ${
                          payment.payment_type === 'upi' ? 'bg-brand-maroon/5 border-brand-maroon/10 text-brand-maroon' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        }`}>
                          {payment.payment_type === 'upi' ? <IndianRupee className="w-7 h-7" /> : <UtensilsCrossed className="w-7 h-7" />}
                        </div>
                        <div>
                          <h4 className="font-black text-foreground tracking-tight group-hover:text-brand-maroon transition-colors text-base">
                            {payment.payment_type === 'upi' ? `Order #${payment.order_id?.slice(0, 8)}` : `Table ${payment.restaurant_tables?.table_number}`}
                          </h4>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mt-0.5">
                            {payment.transaction_id ? `TXN: ${payment.transaction_id.slice(0, 12)}` : `${payment.payment_type.toUpperCase()} DISBURSEMENT`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-foreground tracking-tighter leading-none mb-1">₹{payment.amount || payment.total_amount}</p>
                        {getStatusBadge(payment)}
                      </div>
                    </div>

                    {!showVerified && (
                      <div className="pt-6 border-t border-dashed border-border/50 flex gap-3">
                        {payment.payment_type === 'upi' && (
                          <>
                            <Button 
                              onClick={() => handleVerifyUPI(payment.id)} 
                              disabled={verifyingId === payment.id} 
                              className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
                            >
                              {verifyingId === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'VERIFY EXEC'}
                            </Button>
                            <button 
                              onClick={() => handleReject(payment.id, true)}
                              className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            >
                              <XCircle className="w-6 h-6" />
                            </button>
                          </>
                        )}
                        {payment.payment_type === 'cod' && (
                          <Button 
                            onClick={() => handleConfirmCash(payment.id)} 
                            disabled={verifyingId === payment.id} 
                            className="flex-1 h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100"
                          >
                            {verifyingId === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'CONFIRM CASH RECEIPT'}
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {showVerified && (
                      <div className="pt-4 flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                        <span>Audit Complete • {new Date(payment.updated_at || payment.completed_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
