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
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/design-system/button';
import { Card } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { toast } from 'sonner';

export function AdminUPIVerificationScreen() {
  const navigate = useNavigate();
  
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
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setCurrentUser(profile);
    }
  };

  const fetchUpiPayments = async () => {
    try {
      let query = supabase
        .from('upi_payments')
        .select(`
          *,
          orders (
            id,
            user_id,
            total_amount,
            order_type,
            customer_name,
            customer_email,
            status as order_status
          )
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUpiPayments(data || []);
    } catch (error: any) {
      console.error('Error fetching UPI payments:', error);
      toast.error('Failed to load UPI payments');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (qrId: string, orderId: string) => {
    if (!currentUser) {
      toast.error('Admin authentication required');
      return;
    }

    if (!confirm('Are you sure you want to verify this payment?')) {
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
    const reason = prompt('Enter rejection reason:');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success">Verified</Badge>;
      case 'verification_requested':
        return <Badge variant="warning">Pending Verification</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filteredPayments = upiPayments.filter(payment => {
    if (!searchTerm) return payment;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.transaction_id?.toLowerCase().includes(searchLower) ||
      payment.order_id.toLowerCase().includes(searchLower) ||
      payment.beneficiary_name?.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: upiPayments.length,
    pending: upiPayments.filter(p => p.status === 'verification_requested').length,
    verified: upiPayments.filter(p => p.status === 'verified').length,
    failed: upiPayments.filter(p => p.status === 'failed').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            UPI Payment Verification
          </h1>
          <p className="text-gray-600">
            Verify and manage customer UPI payments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Transaction ID, Order ID, or Name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="verification_requested">Pending Verification</option>
                <option value="verified">Verified</option>
                <option value="failed">Failed</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </Card>

        {/* UPI Payments List */}
        <div className="space-y-4">
          {filteredPayments.length === 0 ? (
            <Card className="p-8 text-center">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No UPI Payments Found
              </h3>
              <p className="text-gray-600">
                {filter === 'verification_requested' 
                  ? 'No pending verifications at the moment'
                  : `No ${filter} payments`
                }
              </p>
            </Card>
          ) : (
            filteredPayments.map((payment) => (
              <Card key={payment.id} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Payment Details */}
                  <div className="lg:col-span-2">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">
                          Order #{payment.orders.id.slice(0, 8)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(payment.created_at).toLocaleString()}
                        </p>
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Amount</p>
                        <p className="font-semibold text-lg">₹{payment.amount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Order Type</p>
                        <Badge variant="secondary">
                          {payment.orders.order_type}
                        </Badge>
                      </div>
                    </div>

                    {payment.transaction_id && (
                      <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          Transaction ID (UTR)
                        </p>
                        <p className="font-mono text-blue-700">
                          {payment.transaction_id}
                        </p>
                        {payment.beneficiary_name && (
                          <p className="text-sm text-blue-600 mt-2">
                            Paid by: {payment.beneficiary_name}
                          </p>
                        )}
                      </div>
                    )}

                    {payment.verification_notes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </p>
                        <p className="text-sm text-gray-600">
                          {payment.verification_notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
                    <div className="space-y-3">
                      {payment.status === 'verification_requested' && (
                        <>
                          <Button
                            onClick={() => handleVerify(payment.id, payment.order_id)}
                            disabled={verifyingId === payment.id}
                            className="w-full bg-green-600 hover:bg-green-700"
                          >
                            {verifyingId === payment.id ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Verify Payment
                              </>
                            )}
                          </Button>

                          <Button
                            onClick={() => handleReject(payment.id)}
                            variant="outline"
                            className="w-full border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Reject
                          </Button>
                        </>
                      )}

                      {payment.status === 'verified' && (
                        <div className="text-center py-3">
                          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          <p className="text-green-700 font-medium">Verified</p>
                          <p className="text-sm text-gray-600">
                            {payment.verified_at 
                              ? new Date(payment.verified_at).toLocaleString()
                              : ''
                            }
                          </p>
                        </div>
                      )}

                      {payment.status === 'failed' && (
                        <div className="text-center py-3">
                          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                          <p className="text-red-700 font-medium">Rejected</p>
                        </div>
                      )}

                      {payment.status === 'expired' && (
                        <div className="text-center py-3">
                          <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                          <p className="text-yellow-700 font-medium">Expired</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
