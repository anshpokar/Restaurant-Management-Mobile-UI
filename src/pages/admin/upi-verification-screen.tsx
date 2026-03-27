import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { verifyUPIPayment } from '@/lib/upi-payment';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Search,
  Filter,
  IndianRupee,
  CreditCard,
  UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/design-system/button';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { AppHeader } from '@/components/design-system/app-header';
import { toast } from 'sonner';

export function AdminUPIVerificationScreen() {
  // State
  const [upiPayments, setUpiPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('verification_requested');
  const [searchTerm, setSearchTerm] = useState('');
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch current user
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Fetch UPI payments
  useEffect(() => {
    fetchUpiPayments();
    
    // Set up real-time subscription
    const channel = supabase.channel('upi-payments-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'upi_payments'
        },
        () => {
          fetchUpiPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }
      
      if (!user) {
        console.warn('No authenticated user');
        return;
      }
      
      console.log('Current user ID:', user.id);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }
      
      console.log('User profile:', profile);
      console.log('User role:', profile?.role);
      
      if (profile?.role !== 'admin') {
        console.warn('User is not an admin! Role:', profile?.role);
        toast.error('Admin access required');
        return;
      }
      
      setCurrentUser(profile);
    } catch (error: any) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUpiPayments = async () => {
    try {
      let query = supabase
        .from('upi_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data: paymentsData, error: paymentsError } = await query;

      if (paymentsError) {
        console.error('Error fetching UPI payments:', paymentsError);
        throw paymentsError;
      }

      if (paymentsData && paymentsData.length > 0) {
        const enrichedPayments = await Promise.all(
          paymentsData.map(async (payment) => {
            try {
              const { data: orderData } = await supabase
                .from('orders')
                .select('id, user_id, total_amount, order_type')
                .eq('id', payment.order_id)
                .maybeSingle();
              
              return { ...payment, orders: orderData };
            } catch (err) {
              console.warn(`Error fetching order for payment ${payment.id}:`, err);
              return { ...payment, orders: null };
            }
          })
        );
        setUpiPayments(enrichedPayments);
      } else {
        setUpiPayments([]);
      }
    } catch (error: any) {
      console.error('Error in fetchUpiPayments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (qrId: string) => {
    if (!currentUser) {
      toast.error('Admin authentication required');
      return;
    }

    if (!window.confirm('Are you sure you want to verify this UPI payment?')) return;

    setVerifyingId(qrId);

    try {
      const result = await verifyUPIPayment(
        qrId,
        currentUser.id,
        'Verified via admin dashboard'
      );

      if (result.success) {
        toast.success('Payment verified successfully!');
        fetchUpiPayments();
      } else {
        toast.error(result.error || 'Failed to verify payment');
      }
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleReject = async (qrId: string) => {
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;



    try {
      const { error } = await supabase
        .from('upi_payments')
        .update({
          status: 'failed',
          verification_notes: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', qrId);

      if (error) throw error;

      toast.success('Payment rejected');
      fetchUpiPayments();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    }
  };

  const filteredPayments = upiPayments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.transaction_id?.toLowerCase().includes(searchLower) ||
      payment.order_id.toLowerCase().includes(searchLower) ||
      payment.beneficiary_name?.toLowerCase().includes(searchLower) ||
      payment.orders?.customer_name?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: upiPayments.length,
    pending: upiPayments.filter(p => p.status === 'verification_requested').length,
    verified: upiPayments.filter(p => p.status === 'verified').length,
    failed: upiPayments.filter(p => p.status === 'failed').length
  };

  if (loading && upiPayments.length === 0) {
    return (
      <div className="min-h-screen bg-muted/5 pb-20">
        <AppHeader title="UPI Audit" />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <RefreshCw className="w-10 h-10 animate-spin text-brand-maroon/20 mb-4" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Verifying Signal Bridge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="UPI Intelligence" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 py-6 space-y-8 max-w-[1400px] mx-auto"
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Volume', value: stats.total, icon: <CreditCard className="w-5 h-5" />, color: 'from-slate-700 to-slate-900' },
            { label: 'Awaiting', value: stats.pending, icon: <Clock className="w-5 h-5" />, color: 'from-amber-500 to-orange-600' },
            { label: 'Verified', value: stats.verified, icon: <CheckCircle className="w-5 h-5" />, color: 'from-emerald-500 to-teal-600' },
            { label: 'Rejected', value: stats.failed, icon: <XCircle className="w-5 h-5" />, color: 'from-rose-500 to-red-600' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className={`border-none shadow-xl bg-gradient-to-br ${stat.color} text-white rounded-3xl overflow-hidden relative group`}>
                <CardBody className="p-5 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
                      {stat.icon}
                    </div>
                    <span className="text-2xl font-black tracking-tighter">{stat.value}</span>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{stat.label}</p>
                </CardBody>
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand-maroon transition-colors" />
            <input
              type="text"
              placeholder="Query by Transaction ID, Order # or Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border-2 border-transparent focus:border-brand-maroon/20 rounded-[2rem] shadow-xl shadow-black/5 outline-none transition-all placeholder:text-[10px] placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
            />
          </div>

          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-6 py-4 bg-white border-none rounded-[2rem] shadow-xl shadow-black/5 text-[10px] font-black uppercase tracking-widest appearance-none outline-none focus:ring-2 focus:ring-brand-maroon/20 transition-all cursor-pointer"
            >
              <option value="all">Full Protocol</option>
              <option value="verification_requested">Awaiting Auth</option>
              <option value="verified">Verified Clear</option>
              <option value="failed">Rejected Entry</option>
            </select>
            <Filter className="absolute right-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* UPI Payments List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPayments.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-muted shadow-inner"
              >
                <CreditCard className="w-16 h-16 text-muted/30 mx-auto mb-6" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                  No Signals Detected
                </h3>
              </motion.div>
            ) : (
              filteredPayments.map((payment, index) => (
                <motion.div
                  key={payment.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="shadow-xl shadow-black/5 border-none rounded-[2.5rem] group hover:shadow-2xl hover:shadow-brand-maroon/5 overflow-hidden transition-all duration-300">
                    <CardBody className="p-8">
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border transition-colors ${
                            payment.status === 'verified' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                            payment.status === 'failed' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                            'bg-brand-maroon/5 border-brand-maroon/10 text-brand-maroon'
                          }`}>
                            <IndianRupee className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="font-black text-foreground tracking-tight group-hover:text-brand-maroon transition-colors text-lg">
                              Order #{payment.order_id?.slice(0, 8)}
                            </h4>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mt-0.5">
                              {new Date(payment.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-foreground tracking-tighter leading-none mb-1">₹{payment.amount}</p>
                          <Badge 
                            variant={payment.status === 'verified' ? 'success' : payment.status === 'failed' ? 'error' : 'warning'}
                            className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0"
                          >
                            {payment.status === 'verification_requested' ? 'AWAITING' : payment.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {payment.transaction_id && (
                          <div className="bg-muted/30 p-4 rounded-3xl border border-dashed border-border/50">
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Transaction Anchor (UTR)</p>
                            <p className="font-mono text-sm font-bold text-brand-maroon break-all">{payment.transaction_id}</p>
                            {payment.beneficiary_name && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/50">
                                <UserCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-[10px] font-black uppercase text-muted-foreground">{payment.beneficiary_name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {payment.verification_notes && (
                          <div className="bg-rose-50/50 p-4 rounded-3xl border border-rose-100/50">
                            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Audit Feedback</p>
                            <p className="text-xs font-bold text-rose-800">{payment.verification_notes}</p>
                          </div>
                        )}
                      </div>

                      {payment.status === 'verification_requested' && (
                        <div className="pt-8 mt-4 border-t border-dashed border-border/50 flex gap-4">
                          <Button
                            onClick={() => handleVerify(payment.id)} 
                            disabled={verifyingId === payment.id}
                            className="flex-1 h-16 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100"
                          >
                            {verifyingId === payment.id ? (
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <CheckCircle className="w-5 h-5" />
                                <span>AUTHORIZE CLEARANCE</span>
                              </div>
                            )}
                          </Button>

                          <button
                            onClick={() => handleReject(payment.id)}
                            className="w-16 h-16 rounded-[2rem] bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100 transition-all active:scale-95"
                          >
                            <XCircle className="w-7 h-7" />
                          </button>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
