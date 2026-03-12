import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { verifyUPIPayment } from '@/lib/upi-payment';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  CreditCard,
  IndianRupee,
  UtensilsCrossed
} from 'lucide-react';
import { Button } from '@/components/design-system/button';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { AppHeader } from '@/components/design-system/app-header';
import { toast } from 'sonner';

export function AdminPaymentVerificationScreen() {
  const navigate = useNavigate();
  
  // State
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'failed'>('all');
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
  }, [filter, activeTab]);

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
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profile?.role !== 'admin') {
        toast.error('Admin access required');
        return;
      }
      
      setCurrentUser(profile);
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

        // Filter by verification status based on showVerified toggle
        if (!showVerified) {
          // Show pending verifications
          upiQuery = upiQuery.eq('status', 'verification_requested');
        } else {
          // Show verified
          upiQuery = upiQuery.eq('status', 'verified');
        }

        const { data: upiData } = await upiQuery;
        
        if (upiData) {
          // Enrich with order data
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
            restaurant_tables (table_number)
          `)
          .eq('payment_method', 'cod')
          .order('completed_at', { ascending: false });

        // Filter by payment status based on showVerified toggle
        if (!showVerified) {
          // Show pending payments
          sessionQuery = sessionQuery.eq('payment_status', 'pending');
        } else {
          // Show paid/verified - use 'in' to catch both 'paid' and 'partial'
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

      // Sort by created_at/completed_at descending
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

    if (!confirm('Are you sure you want to verify this UPI payment?')) {
      return;
    }

    setVerifyingId(qrId);

    try {
      const result = await verifyUPIPayment(
        qrId,
        currentUser.id,
        'Verified via admin dashboard'
      );

      if (result.success) {
        toast.success('UPI payment verified successfully!');
        fetchAllPayments();
      } else {
        toast.error(result.error || 'Failed to verify UPI payment');
      }
    } catch (error: any) {
      console.error('Error verifying UPI payment:', error);
      toast.error('Failed to verify UPI payment');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleConfirmCash = async (sessionId: string) => {
    if (!currentUser) {
      toast.error('Admin authentication required');
      return;
    }

    if (!confirm('Confirm cash payment received? This will mark the session as paid.')) {
      return;
    }

    setVerifyingId(sessionId);

    try {
      // Update session payment status to paid
      const { error: sessionError } = await supabase
        .from('dine_in_sessions')
        .update({
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessionError) throw sessionError;

      // Also update all related orders
      try {
        const { error: ordersError } = await supabase.rpc('update_session_orders_paid', {
          p_session_id: sessionId
        });

        if (ordersError) {
          console.warn('Orders update error:', ordersError);
          toast.info('Session marked as paid. Note: Orders update function not found.');
          // Continue anyway - session is already marked as paid
        } else {
          toast.success('Cash payment confirmed! Session and orders marked as paid.');
        }
      } catch (rpcError: any) {
        console.warn('RPC call failed, but session updated:', rpcError.message);
        toast.info('Session marked as paid. Admin will need to update orders manually if needed.');
        // Continue - session is already marked as paid
      }
      
      fetchAllPayments();
    } catch (error: any) {
      console.error('Error confirming cash payment:', error);
      toast.error('Failed to confirm cash payment');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleReject = async (paymentId: string, isUPI: boolean) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    try {
      if (isUPI) {
        const { error } = await supabase
          .from('upi_payments')
          .update({
            status: 'failed',
            verification_notes: reason,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentId);

        if (error) throw error;
      } else {
        // For COD sessions, we typically don't reject - just don't confirm
        toast.info('For COD, simply don\'t confirm if payment not received');
        return;
      }

      toast.success('Payment rejected');
      fetchAllPayments();
    } catch (error: any) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    }
  };

  const getStatusBadge = (payment: any) => {
    if (payment.payment_type === 'upi') {
      switch (payment.status) {
        case 'verified':
          return <Badge variant="success">✓ Verified</Badge>;
        case 'verification_requested':
          return <Badge variant="warning">⏳ Pending</Badge>;
        case 'failed':
          return <Badge variant="destructive">✗ Failed</Badge>;
        case 'expired':
          return <Badge variant="secondary">Expired</Badge>;
        default:
          return <Badge variant="secondary">Pending</Badge>;
      }
    } else {
      // COD session
      return payment.payment_status === 'paid' || payment.status === 'verified'
        ? <Badge variant="success">✓ Paid</Badge>
        : payment.payment_status === 'partial'
          ? <Badge variant="info">💵 Partial</Badge>
          : <Badge variant="warning">💵 Cash Pending</Badge>;
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    return type === 'upi' 
      ? <Badge variant="info"><CreditCard className="w-3 h-3 mr-1" />UPI</Badge>
      : <Badge variant="info"><IndianRupee className="w-3 h-3 mr-1" />Cash</Badge>;
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (payment.transaction_id && payment.transaction_id.toLowerCase().includes(searchLower)) ||
      (payment.order_id && payment.order_id.toLowerCase().includes(searchLower)) ||
      (payment.beneficiary_name && payment.beneficiary_name.toLowerCase().includes(searchLower)) ||
      (payment.session_name && payment.session_name.toLowerCase().includes(searchLower)) ||
      (payment.orders?.customer_name && payment.orders.customer_name.toLowerCase().includes(searchLower))
    );
  });

  // Dynamic stats based on current filter
  const pendingCount = payments.filter(p => 
    (p.payment_type === 'upi' && p.status === 'verification_requested') ||
    (p.payment_type === 'cod' && (p.status === 'pending' || p.payment_status === 'pending'))
  ).length;
  
  const verifiedCount = payments.filter(p => 
    (p.payment_type === 'upi' && p.status === 'verified') ||
    (p.payment_type === 'cod' && (p.status === 'verified' || p.payment_status === 'paid' || p.payment_status === 'partial'))
  ).length;
  
  const stats = {
    pending: pendingCount,
    verified: verifiedCount,
    total: showVerified ? verifiedCount : pendingCount
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/5 pb-20">
      <AppHeader title="Payment Verifications" />

      <div className="px-4 py-4 space-y-4">
        {/* Toggle between Pending and Verified */}
        <div className="flex gap-2 bg-background p-1 rounded-lg border">
          <button
            onClick={() => setShowVerified(false)}
            className={`flex-1 px-4 py-2 font-semibold rounded-md transition-colors ${
              !showVerified
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ⏳ Pending Verifications ({pendingCount})
          </button>
          <button
            onClick={() => setShowVerified(true)}
            className={`flex-1 px-4 py-2 font-semibold rounded-md transition-colors ${
              showVerified
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ✓ Verified ({verifiedCount})
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 font-semibold rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('upi')}
            className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              activeTab === 'upi'
                ? 'bg-blue-100 text-blue-700'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📱 UPI
          </button>
          <button
            onClick={() => setActiveTab('cod')}
            className={`px-4 py-2 font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              activeTab === 'cod'
                ? 'bg-green-100 text-green-700'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            💵 Cash
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by transaction ID, order ID, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        {/* Payments Grid */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{showVerified ? 'No verified payments' : 'No pending verifications'}</p>
            <p className="text-xs mt-1">
              {showVerified 
                ? 'Verified payments will appear here' 
                : 'Pending verifications will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPayments.map((payment) => (
              <Card key={payment.id}>
                <CardBody className="p-4">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getPaymentTypeBadge(payment.payment_type)}
                        <h4 className="font-bold text-lg">
                          {payment.payment_type === 'upi' 
                            ? `Order #${payment.order_id?.slice(0, 8)}`
                            : payment.session_name || `Table ${payment.restaurant_tables?.table_number}`
                          }
                        </h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payment.payment_type === 'upi'
                          ? payment.beneficiary_name || 'UPI Payment'
                          : `Session • ${new Date(payment.completed_at).toLocaleString()}`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">₹{payment.amount || payment.total_amount}</p>
                      <div className="mt-1">
                        {getStatusBadge(payment)}
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  {payment.payment_type === 'upi' ? (
                    <div className="bg-surface p-3 rounded-lg mb-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Transaction ID:</span>
                        <span className="font-mono">{payment.transaction_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="capitalize">{payment.status}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface p-3 rounded-lg mb-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Table:</span>
                        <span className="font-semibold">Table {payment.restaurant_tables?.table_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Session Status:</span>
                        <span className="capitalize">{payment.session_status}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {payment.payment_type === 'upi' && payment.status === 'verification_requested' && (
                      <>
                        <Button
                          onClick={() => handleVerifyUPI(payment.id)}
                          disabled={verifyingId === payment.id}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          {verifyingId === payment.id ? 'Verifying...' : 'Verify Payment'}
                        </Button>
                        <Button
                          onClick={() => handleReject(payment.id, true)}
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}

                    {payment.payment_type === 'cod' && payment.payment_status === 'pending' && (
                      <>
                        <Button
                          onClick={() => handleConfirmCash(payment.id)}
                          disabled={verifyingId === payment.id}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <IndianRupee className="w-4 h-4 mr-2" />
                          {verifyingId === payment.id ? 'Confirming...' : 'Confirm Cash Received'}
                        </Button>
                        <Button
                          onClick={() => handleReject(payment.id, false)}
                          variant="outline"
                          className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        >
                          <UtensilsCrossed className="w-4 h-4" />
                        </Button>
                      </>
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
