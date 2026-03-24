import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Shield, Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateOTP, sendOTPEmail } from '@/lib/send-otp-email';
import { useCart } from '@/contexts/cart-context';

export function WaiterOTPVerificationScreen() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  const location = useLocation();
  const { setWaiterContext } = useCart();
  const email = (location.state as any)?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      alert('No email provided. Please go back and enter customer email.');
      navigate(`/waiter/customer-info/${tableId}`);
      return;
    }

    // Auto-send OTP on mount
    sendOTP();
  }, [email]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendOTP = async () => {
    if (countdown > 0) return;

    setSending(true);
    try {
      // Call Edge Function to generate and send OTP
      const { data, error } = await supabase.functions.invoke('custom-otp', {
        body: {
          action: 'generate',
          email: email.toLowerCase()
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to send OTP');
      }

      setSent(true);
      setCountdown(300); // 5 minutes as per requirements
      
      alert(
        `📧 OTP Sent to ${email}\n\n` +
        `The customer should provide you with the 6-digit code.\n\n` +
        `Ask the customer: "What is your verification code?"\n\n` +
        `Then enter the code they provide.`
      );
      
    } catch (error: any) {
      console.error('Error generating OTP:', error);
      alert('Failed to generate OTP: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      alert('Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Call Edge Function to verify OTP
      const { data, error } = await supabase.functions.invoke('custom-otp', {
        body: {
          action: 'verify',
          email: email.toLowerCase(),
          otp: otpCode
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Invalid or expired OTP');
      }

      const verifiedUserId = data.user_id;
      setUserId(verifiedUserId);

      // Fetch profile info to update context
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', verifiedUserId)
        .single();

      if (profileError || !profile) {
        throw new Error('Customer profile not found');
      }

      // ✅ Store in global context immediately upon verification
      setWaiterContext(tableId || null, null, profile);

      alert('✅ Email verified successfully!');

      // Navigate to session creation with verified user ID
      navigate(`/waiter/session/start/${tableId}`, {
        state: {
          customerType: 'existing',
          userId: verifiedUserId,
          email: email,
          verified: true
        }
      });

    } catch (error: any) {
      console.error('OTP verification error:', error);
      alert('❌ ' + (error.message || 'Invalid OTP. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Email Verification" />

      <div className="px-4 py-6 space-y-6">
        {/* Email Display */}
        <Card>
          <CardBody className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-bold text-primary uppercase mb-1">
                  Verified Email
                </p>
                <p className="text-sm font-medium text-foreground">
                  {email}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* OTP Instructions */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-2">
            Enter Verification Code
          </h2>
          <p className="text-sm text-muted-foreground">
            We've sent a 6-digit code to<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        {/* OTP Input Fields */}
        <div className="flex gap-2 justify-center">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              disabled={loading}
            />
          ))}
        </div>

        {/* Verify Button */}
        <Button
          onClick={verifyOTP}
          className="w-full h-14 text-lg"
          isLoading={loading}
          disabled={otp.some(d => !d)}
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          {loading ? 'Verifying...' : 'Verify & Continue'}
        </Button>

        {/* Resend OTP */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive the code?
          </p>
          <Button
            onClick={sendOTP}
            variant="outline"
            size="sm"
            disabled={sending || countdown > 0}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${countdown > 0 ? 'animate-spin' : ''}`} />
            {countdown > 0 
              ? `Resend in ${countdown}s` 
              : sent 
                ? 'Resend OTP' 
                : 'Send OTP'}
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-1">Testing Mode:</p>
              <p className="text-xs text-blue-700">
                For development, OTP is shown in browser console and alert.
                <br /><br />
                <strong>Production:</strong> Integrate with email service (SendGrid, AWS SES, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Success Indicator */}
        {sent && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800 font-medium">
                OTP sent successfully to {email}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
