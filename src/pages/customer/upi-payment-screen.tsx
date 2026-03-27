import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { 
  generateUPILink, 
  createUPIPayment, 
  submitUPITransaction,
  isQRExpired,
  subscribeToUpiPayments
} from '@/lib/upi-payment';
import QRCode from 'react-qr-code';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Smartphone,
  Shield,
  Timer
} from 'lucide-react';
import { Button } from '@/components/design-system/button';
import { Card } from '@/components/design-system/card';
import { toast } from 'sonner';

// ⚠️ IMPORTANT: UPDATE THESE WITH YOUR ACTUAL UPI DETAILS!
const UPI_PAYMENT_VPA = 'anshjpokar@oksbi'; 
const RESTAURANT_NAME = 'Navratna Restaurant'; 
const QR_EXPIRY_MINUTES = 5; // QR code expires after 5 minutes

export function PaymentScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId, sessionId } = useParams<{ orderId: string; sessionId: string }>();
  
  // State
  const [order, setOrder] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upiLink, setUpiLink] = useState<string>('');
  const [qrId, setQrId] = useState<string>('');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QR_EXPIRY_MINUTES * 60);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [expired, setExpired] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch order or session details
  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else if (sessionId) {
      fetchSession();
    }
  }, [orderId, sessionId]);

  // Generate QR code
  useEffect(() => {
    // Only generate QR if we have order/session AND paymentAmount is set
    if ((order || session) && paymentAmount > 0) {
      generateQR();
    }
  }, [order, session, paymentAmount]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && paymentStatus === 'pending') {
      const timer = setTimeout(() => setTimeRemaining(timeRemaining - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && paymentStatus === 'pending') {
      setExpired(true);
    }
  }, [timeRemaining, paymentStatus]);

  // Real-time subscription
  useEffect(() => {
    console.log('Setting up real-time subscription for qrId:', qrId, 'current status:', paymentStatus);
    
    if (qrId && (paymentStatus === 'pending' || paymentStatus === 'verification_requested')) {
      const unsubscribe = subscribeToUpiPayments(qrId, (updatedData) => {
        console.log('Real-time update received:', updatedData);
        
        setPaymentStatus(updatedData.status);
        
        if (updatedData.status === 'verified') {
          toast.success('Payment verified successfully!');
          const target = location.pathname.startsWith('/delivery') ? '/delivery/tasks' : '/customer/orders';
          setTimeout(() => navigate(target), 2000);
        } else if (updatedData.status === 'verification_requested') {
          toast.info('Payment submitted for verification');
        }
      });

      console.log('Real-time subscription active');
      
      // Fallback: Poll every 5 seconds in case real-time doesn't work
      const pollInterval = setInterval(() => {
        console.log('Polling for payment status...');
        checkPaymentStatus();
      }, 5000);
      
      return () => {
        console.log('Cleaning up real-time subscription and polling');
        unsubscribe();
        clearInterval(pollInterval);
      };
    }
  }, [qrId, paymentStatus, navigate, location.pathname]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Order not found');
      
      setOrder(data);
      setPaymentAmount(data.total_amount ?? 0);
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order');
      navigate('/customer/orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSession = async () => {
    try {
      const { data, error } = await supabase
        .from('dine_in_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Session not found');
      
      setSession(data);
      setPaymentAmount(data.total_amount ?? 0);
    } catch (error: any) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load session');
      navigate('/customer/orders');
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async () => {
    try {
      // Use orderId for orders, sessionId for sessions
      const paymentId = orderId || sessionId!;
      const isSession = !!sessionId && !orderId;
      
      if (!paymentId) {
        console.error('No payment ID available');
        toast.error('Cannot generate QR: Missing order or session ID');
        return;
      }

      console.log('Generating QR for payment:', { 
        paymentId, 
        paymentIdType: typeof paymentId,
        amount: paymentAmount,
        orderId, 
        sessionId,
        isSession,
        hasOrder: !!order,
        hasSession: !!session
      });
      
      // Validate paymentAmount
      if (!paymentAmount || paymentAmount <= 0) {
        console.error('Invalid payment amount:', paymentAmount);
        toast.error('Invalid payment amount. Please try again.');
        return;
      }

      const result = await createUPIPayment(
        paymentId,
        UPI_PAYMENT_VPA,
        RESTAURANT_NAME,
        QR_EXPIRY_MINUTES,
        isSession
      );

      console.log('QR generation result:', result);

      if (result.success && result.qrId) {
        // Generate the final UPI link with correct amount
        const link = generateUPILink(
          paymentId,
          paymentAmount,
          UPI_PAYMENT_VPA,
          RESTAURANT_NAME
        );
        
        // Update the database record with correct amount
        if (result.amount === 0) {
          const { error: updateError } = await supabase
            .from('upi_payments')
            .update({ 
              amount: paymentAmount,
              upi_link: link
            })
            .eq('id', result.qrId); // Use 'id' field instead of 'qr_id'
          
          if (updateError) {
            console.error('Failed to update amount:', updateError);
          } else {
            console.log('Successfully updated payment amount');
          }
        }
        
        setUpiLink(link);
        setQrId(result.qrId);
        setTimeRemaining(QR_EXPIRY_MINUTES * 60);
        setExpired(false);
        console.log('QR generated successfully:', { qrId: result.qrId, link });
      } else {
        console.error('QR generation failed:', result);
        toast.error(`Failed to generate QR code: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error generating QR:', error);
      toast.error(`Failed to generate QR code: ${error.message}`);
    }
  };

  const handleSubmitTransaction = async () => {
    if (!transactionId.trim()) {
      toast.error('Please enter UPI Transaction ID');
      return;
    }

    if (!qrId) {
      console.error('No QR ID available');
      toast.error('QR code not generated. Please refresh the page.');
      return;
    }

    console.log('Submitting transaction:', { qrId, transactionId });

    setSubmitting(true);
    
    try {
      const result = await submitUPITransaction(qrId, transactionId);
      
      if (result.success) {
        toast.success('Transaction ID submitted for verification!');
        setPaymentStatus('verification_requested');
      } else {
        console.error('Transaction submission failed:', result);
        toast.error('Failed to submit transaction ID');
      }
    } catch (error: any) {
      console.error('Error submitting transaction:', error);
      toast.error('Failed to submit transaction ID');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const checkPaymentStatus = async () => {
    if (!qrId) return;
    
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('upi_payments')
        .select('status')
        .eq('id', qrId)
        .single();
      
      if (error) throw error;
      
      console.log('Manual status check:', data);
      
      if (data.status !== paymentStatus) {
        setPaymentStatus(data.status);
        
        if (data.status === 'verified') {
          toast.success('Payment verified successfully!');
          const target = location.pathname.startsWith('/delivery') ? '/delivery/tasks' : '/customer/orders';
          setTimeout(() => navigate(target), 2000);
        }
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  // Safety check: ensure we have either order or session before rendering
  if ((!order && !session) || (orderId && !order) || (sessionId && !session)) {
    console.log('PaymentScreen: No data available', { orderId, sessionId, order, session });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-center mb-2">Payment Not Found</h2>
          <Button onClick={() => navigate('/customer/orders')} className="w-full">
            View Orders
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complete Your Payment
          </h1>
          <p className="text-gray-600">
            {sessionId ? 
              `Session ${session?.session_name || session?.id.slice(0, 8)}` :
              `Order #${order?.id.slice(0, 8)}`
            }
          </p>
          {/* Manual refresh button */}
          <Button 
            onClick={checkPaymentStatus} 
            variant="outline" 
            size="sm"
            disabled={isRefreshing || paymentStatus !== 'pending'}
            className="mt-4"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
        </div>

        {/* Payment Summary */}
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Payment Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Amount</span>
              <span className="font-semibold">₹{paymentAmount || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Type</span>
              <span className="font-medium">{sessionId ? 'Dine-in Session' : 'Order'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method</span>
              <span className="font-medium">UPI (QR Code)</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total to Pay</span>
                <span className="font-bold text-orange-600">
                  ₹{paymentAmount || 0}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Status */}
        {paymentStatus === 'verified' && (
          <Card className="mb-6 p-6 bg-green-50 border-green-200">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-center text-green-800 mb-2">
              Payment Successful!
            </h2>
            <p className="text-green-700 text-center">
              Your order has been confirmed. Redirecting to orders...
            </p>
          </Card>
        )}

        {paymentStatus === 'verification_requested' && (
          <Card className="mb-6 p-6 bg-blue-50 border-blue-200">
            <Clock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-center text-blue-800 mb-2">
              Verification in Progress
            </h2>
            <p className="text-blue-700 text-center">
              Admin is verifying your payment. This usually takes 1-2 minutes.
            </p>
          </Card>
        )}

        {expired && paymentStatus === 'pending' && (
          <Card className="mb-6 p-6 bg-yellow-50 border-yellow-200">
            <Timer className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-center text-yellow-800 mb-2">
              QR Code Expired
            </h2>
            <p className="text-yellow-700 text-center mb-4">
              For security, this QR code has expired. Please generate a new one.
            </p>
            <Button onClick={generateQR} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate New QR Code
            </Button>
          </Card>
        )}

        {/* Dynamic QR Code */}
        {paymentStatus === 'pending' && !expired && (
          <>
            <Card className="mb-6 p-6">
              <div className="text-center mb-6">
                <Smartphone className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Scan & Pay</h2>
                <p className="text-gray-600">
                  Scan this QR code with any UPI app
                </p>
              </div>

              {/* QR Code Container - Centered */}
              <div className="flex justify-center mb-6 px-4">
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-divider">
                  <QRCode 
                    value={upiLink} 
                    size={240}
                    level="H"
                  />
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center gap-2 text-orange-600 mb-4">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">
                  Expires in: {formatTime(timeRemaining)}
                </span>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-blue-900">How to Pay:</h3>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li className="flex gap-2">
                    <span className="font-bold">1.</span>
                    <span>Open any UPI app (Google Pay, PhonePe, Paytm, etc.)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">2.</span>
                    <span>Scan the QR code above</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">3.</span>
                    <span>Enter your UPI PIN to pay ₹{paymentAmount || 0}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">4.</span>
                    <span>Copy the UPI Transaction ID (UTR) shown after payment</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold">5.</span>
                    <span>Enter the UTR below for verification</span>
                  </li>
                </ol>
              </div>
            </Card>

            {/* Submit Transaction ID */}
            <Card className="mb-6 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-green-500" />
                <h2 className="text-lg font-semibold">Verify Payment</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI Transaction ID (UTR)
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g., 42153128123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the reference number you received after payment
                  </p>
                </div>

                <Button
                  onClick={handleSubmitTransaction}
                  disabled={submitting || !transactionId.trim()}
                  className="w-full"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit for Verification
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* Security Notice */}
        <Card className="p-4 bg-gray-50">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Secure Payment</h3>
              <p className="text-sm text-gray-600">
                Your payment is secured with bank-grade encryption. The QR code 
                expires in 5 minutes for your safety.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
