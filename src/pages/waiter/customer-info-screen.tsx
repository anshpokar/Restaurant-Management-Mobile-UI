import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Input } from '@/components/design-system/input';
import { User, Mail, Phone, SkipForward, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function WaiterCustomerInfoScreen() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [createAccount, setCreateAccount] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!customerEmail) {
      setError('Please enter email first');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Check if customer exists
      const { data: existingCustomer } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', customerEmail)
        .single();

      if (existingCustomer) {
        // Existing customer - send OTP via Supabase Auth
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: customerEmail
        });

        if (otpError) throw otpError;
        
        alert('OTP sent to your email! Please check and enter the code.');
        setOtpSent(true);
      } else {
        // New customer - generate OTP manually
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const { error: insertError } = await supabase
          .from('customer_otps')
          .insert({
            email: customerEmail,
            otp_code: generatedOtp,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
          });

        if (insertError) throw insertError;

        // In production, send via email service
        // For now, show OTP in alert for testing
        alert(`TEST MODE - OTP: ${generatedOtp}\n(In production, this will be sent via email)`);
        setOtpSent(true);
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode) {
      setError('Please enter OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if OTP exists and is valid
      const { data: otpData } = await supabase
        .from('customer_otps')
        .select('*')
        .eq('email', customerEmail)
        .eq('otp_code', otpCode)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (!otpData) {
        throw new Error('Invalid or expired OTP');
      }

      // Mark OTP as used
      await supabase
        .from('customer_otps')
        .update({ 
          used: true, 
          used_at: new Date().toISOString() 
        })
        .eq('id', otpData.id);

      setOtpVerified(true);
      alert('OTP verified successfully!');
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!customerName) {
      setError('Customer name is required');
      return;
    }

    if (customerEmail && !otpVerified) {
      setError('Please verify email with OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // If creating account for new customer
      if (createAccount && customerEmail) {
        // Create quick account
        const tempPassword = Math.random().toString(36).slice(-8);
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: customerEmail,
          password: tempPassword,
          options: {
            data: {
              full_name: customerName,
              phone: customerPhone
            }
          }
        });

        if (authError) throw authError;

        // Create profile
        if (authData?.user) {
          await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: customerEmail,
              full_name: customerName,
              username: `user_${customerName.replace(/\s+/g, '_').toLowerCase()}`,
              phone_number: customerPhone,
              role: 'customer'
            });
        }
      }

      // Navigate to order taking screen with customer info
      navigate(`/waiter/take-order/${tableId}`, {
        state: {
          customerName,
          customerEmail: otpVerified ? customerEmail : null,
          customerPhone,
          createAccount
        }
      });
    } catch (err: any) {
      console.error('Error saving customer info:', err);
      setError(err.message || 'Failed to save customer info');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Skip customer info - go directly to order taking
    navigate(`/waiter/take-order/${tableId}`, {
      state: {
        customerName: 'Walk-in Customer',
        customerEmail: null,
        customerPhone: null,
        createAccount: false
      }
    });
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Customer Information" />

      <div className="px-4 py-4 space-y-4">
        {/* Info Card */}
        <Card>
          <CardBody className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-900 font-medium">
              📝 Enter customer details to link orders to their profile. Optional - you can skip for walk-in customers.
            </p>
          </CardBody>
        </Card>

        {/* Customer Info Form */}
        <Card>
          <CardBody className="p-4 space-y-4">
            {/* Customer Name */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
            </div>

            {/* Customer Email */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Customer Email <span className="text-muted-foreground">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  disabled={otpVerified}
                  className="w-full pl-10 pr-20 py-2.5 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                />
                {!otpVerified && customerEmail && (
                  <button
                    onClick={handleSendOTP}
                    disabled={loading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    Send OTP
                  </button>
                )}
              </div>
              {otpVerified && (
                <div className="mt-1 flex items-center gap-1 text-green-600 text-xs">
                  <Send className="w-3 h-3" />
                  Email verified
                </div>
              )}
            </div>

            {/* OTP Verification */}
            {otpSent && !otpVerified && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-2">
                <label className="text-sm font-medium">Enter OTP</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="flex-1 px-3 py-2 bg-white border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || !otpCode}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:opacity-50"
                  >
                    Verify
                  </button>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
              </div>
            )}

            {/* Customer Phone */}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Customer Phone <span className="text-muted-foreground">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full pl-10 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>

            {/* Create Account Checkbox */}
            {customerEmail && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="createAccount"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="createAccount" className="text-sm text-foreground">
                  Create account for this customer
                </label>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={loading || (!customerName && !otpVerified)}
            className="w-full h-12 text-lg"
          >
            {loading ? 'Saving...' : 'Continue to Order'}
          </Button>

          <Button
            onClick={handleSkip}
            variant="outline"
            className="w-full h-12"
          >
            <SkipForward className="w-5 h-5 mr-2" />
            Skip (Walk-in Customer)
          </Button>
        </div>
      </div>
    </div>
  );
}
