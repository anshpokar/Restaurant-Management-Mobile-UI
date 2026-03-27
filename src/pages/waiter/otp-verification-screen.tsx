import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Shield, Mail, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/cart-context';
import { generateOTP, sendOTPEmail } from '@/lib/send-otp-email';
import { toast } from 'sonner';

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
  const [testModeOtp, setTestModeOtp] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      toast.error('No email provided. Please go back and enter customer email.');
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
      const otpCode = generateOTP();
      
      // Store in DB and attempt to Send via Edge Function
      const result = await sendOTPEmail(email, otpCode, 'waiter_verification');

      if (!result.success) {
        throw new Error(result.error || 'Failed to send OTP');
      }

      setSent(true);
      setCountdown(60); 

      // If email service failed but DB storage worked, we show the code to the waiter
      if (result.error && result.otpCode) {
        setTestModeOtp(result.otpCode);
        toast.warning(`Email service issue: OTP is ${result.otpCode}`, { duration: 8000 });
      } else {
        toast.success(`OTP Sent to ${email}. Please check and enter the code.`);
      }

    } catch (error: any) {
      console.error('Error generating OTP:', error);
      toast.error('Failed to generate OTP: ' + error.message);
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
      toast.error('Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify against otp_verifications table
      const { data: otpRecord, error: fetchError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('email', email)
        .eq('otp_code', otpCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (fetchError || !otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      // 2. Mark as used
      await supabase
        .from('otp_verifications')
        .update({ used: true })
        .eq('id', otpRecord.id);

      // 3. Fetch profile info to update context
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('Customer profile not found for this email');
      }

      // ✅ Store in global context immediately upon verification
      setWaiterContext(tableId || null, null, profile);

      toast.success('Email verified successfully!');

      // Navigate to session creation with verified user ID
      navigate(`/waiter/session/start/${tableId}`, {
        state: {
          customerType: 'existing',
          userId: profile.id,
          email: email,
          verified: true
        }
      });

    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast.error(error.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-off-white pb-4">
      <AppHeader title="Identity Verification" showBack />

      <div className="px-4 py-8 space-y-8">
        {/* Step Indicator */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-maroon/5 border border-brand-maroon/10 text-[10px] font-black text-brand-maroon uppercase tracking-[0.2em]">
            Service Step 02
          </div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">
            Security Check
          </h2>
        </div>

        {/* Email Card */}
        <Card className="border-none shadow-premium rounded-[2rem] overflow-hidden bg-white">
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-maroon/10 rounded-2xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-brand-maroon" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-brand-maroon uppercase tracking-widest mb-0.5">Target Account</p>
                <p className="text-sm font-bold text-foreground truncate">{email}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* OTP Input Section */}
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground font-medium">
              Enter the 6-digit protocol code sent to the guest
            </p>
          </div>

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
                className="w-12 h-16 text-center text-3xl font-black bg-white border-2 border-divider rounded-2xl focus:border-brand-maroon focus:ring-4 focus:ring-brand-maroon/5 outline-none transition-all"
                disabled={loading}
              />
            ))}
          </div>

          <Button
            onClick={verifyOTP}
            className="w-full h-14 bg-brand-maroon hover:bg-[#5D1227] text-white rounded-[1.25rem] shadow-xl shadow-brand-maroon/20 font-black text-lg"
            isLoading={loading}
            disabled={otp.some(d => !d)}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            {loading ? 'Verifying...' : 'Confirm Identity'}
          </Button>

          {/* Test/Fallback Mode OTP Display */}
          {testModeOtp && (
            <div className="p-5 bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-[1.5rem] text-center shadow-lg animate-in zoom-in duration-300">
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Protocol Override</p>
              </div>
              <p className="text-4xl font-black text-orange-600 tracking-[0.2em] mb-2">{testModeOtp}</p>
              <p className="text-[11px] text-orange-700 font-medium leading-tight">
                System bypass code generated.<br/>Please enter this manually to proceed.
              </p>
            </div>
          )}
        </div>

        {/* Resend Logic */}
        <div className="text-center space-y-4">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-tight">
            Didn't receive the protocol?
          </p>
          <Button
            onClick={sendOTP}
            variant="outline"
            size="sm"
            disabled={sending || countdown > 0}
            className="h-10 px-6 border-brand-maroon/20 text-brand-maroon font-black rounded-full hover:bg-brand-maroon hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${countdown > 0 ? 'animate-spin' : ''}`} />
            {countdown > 0
              ? `Resend in ${countdown}s`
              : sent
                ? 'Request New Code'
                : 'Initialize Verification'}
          </Button>
        </div>

        {/* Security Info */}
        <div className="pt-4 opacity-40 grayscale flex items-center justify-center gap-2">
          <Shield className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure Session Link</span>
        </div>
      </div>
    </div>
  );
}
