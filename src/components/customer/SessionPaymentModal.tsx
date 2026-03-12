import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/design-system/button';
import { Card, CardBody } from '@/components/design-system/card';
import { IndianRupee, CreditCard, X } from 'lucide-react';
import { toast } from 'sonner';

interface SessionPaymentModalProps {
  sessionId: string;
  totalAmount: number;
  onClose: () => void;
}

export function SessionPaymentModal({ sessionId, totalAmount, onClose }: SessionPaymentModalProps) {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState<'cod' | 'upi'>('cod');
  const [processing, setProcessing] = useState(false);

  async function handleCompletePayment() {
    try {
      setProcessing(true);

      if (selectedMethod === 'upi') {
        // First update session - keep it active, just set payment method and status
        const { error: sessionError } = await supabase
          .from('dine_in_sessions')
          .update({
            payment_method: 'upi',
            payment_status: 'pending', // Valid value: pending, paid, or partial
            // Keep session_status as 'active' until payment is verified
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (sessionError) {
          console.error('Error updating session:', sessionError);
          toast.error('Failed to initiate payment');
          setProcessing(false);
          return;
        }

        // Navigate to UPI payment page immediately
        navigate(`/customer/payment/session/${sessionId}`);
      } else {
        // COD - Mark order as COD and notify admin
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Update session with PENDING payment status (waiting for admin confirmation)
        // Keep session as 'active' until admin confirms payment
        const { error: sessionError } = await supabase
          .from('dine_in_sessions')
          .update({
            payment_method: 'cod',
            payment_status: 'pending', // Pending admin confirmation
            // Keep session_status as 'active' until admin confirms
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (sessionError) throw sessionError;

        // Update all orders in session to COD
        const { error: ordersError } = await supabase.rpc('update_session_orders_cod', {
          p_session_id: sessionId
        });

        if (ordersError) {
          console.error('Error updating orders:', ordersError);
          // Continue anyway - admin can update manually
        }

        toast.success('Payment marked as pending. Please pay at the counter.');
        setProcessing(false); // Reset processing so button becomes clickable again
        onClose();
        navigate(`/customer/orders`);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error('Failed to process payment: ' + error.message);
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Complete Payment</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardBody className="p-6 space-y-4">
          {/* Amount Display */}
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
            <p className="text-4xl font-black text-primary">₹{totalAmount}</p>
          </div>

          {/* Payment Method Selection */}
          <div>
            <h3 className="font-bold text-lg mb-3">Select Payment Method</h3>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Cash Option */}
              <button
                onClick={() => setSelectedMethod('cod')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'cod' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-border hover:border-green-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedMethod === 'cod' ? 'bg-green-500 text-white' : 'bg-gray-200'
                  }`}>
                    <IndianRupee className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-sm">Cash</h4>
                    <p className="text-xs text-muted-foreground mt-1">Pay at counter</p>
                  </div>
                  {selectedMethod === 'cod' && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>

              {/* UPI Option */}
              <button
                onClick={() => setSelectedMethod('upi')}
                className={`w-full p-4 rounded-lg border-2 transition-all ${
                  selectedMethod === 'upi' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-border hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    selectedMethod === 'upi' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}>
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-bold text-sm">Online (UPI)</h4>
                    <p className="text-xs text-muted-foreground mt-1">Scan & Pay</p>
                  </div>
                  {selectedMethod === 'upi' && (
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Info Message */}
          {selectedMethod === 'cod' ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-800 font-medium">
                💵 You'll pay cash at the counter. Admin will mark as paid.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 font-medium">
                📱 You'll be redirected to scan UPI QR code.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-4">
            <Button
              onClick={handleCompletePayment}
              disabled={processing}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              {processing 
                ? 'Completing...' 
                : selectedMethod === 'cod'
                  ? 'Proceed to Cash Payment'
                  : 'Proceed to UPI Payment'
              }
            </Button>
            
            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
              disabled={processing}
            >
              Cancel
            </Button>
          </div>
        </CardBody>
      </div>
    </div>
  );
}
