import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Input } from '@/components/design-system/input';
import { UserPlus, Shield, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { generateOTP, sendOTPEmail } from '@/lib/send-otp-email';

export function WaiterCustomerSignupScreen() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
      alert('Please enter full name');
      return false;
    }
    if (!formData.email.trim()) {
      alert('Please enter email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return false;
    }
    if (!formData.phone_number.trim()) {
      alert('Please enter phone number');
      return false;
    }
    if (!formData.username.trim()) {
      alert('Please enter username');
      return false;
    }
    return true;
  };

  const handleCreateAccount = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      // 1. Check if email already exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        alert('This email is already registered. Please use "Already a Customer" option instead.');
        setLoading(false);
        return;
      }

      // 2. Generate a random temporary password
      const tempPassword = Math.random().toString(36).slice(-10) + '!A1';
      
      // 3. Sign up with Supabase Auth
      // This sends the confirmation email automatically
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: tempPassword,
        options: {
          data: {
            full_name: formData.full_name,
            username: formData.username,
            phone_number: formData.phone_number,
            role: 'customer'
          }
        }
      });

      if (authError) throw authError;

      if (!data.user) {
        throw new Error('Failed to create account');
      }

      setCreatedUserId(data.user.id);
      setStep('otp');
      
      // We still use our internal OTP flow for immediate waiter verification if needed,
      // but the main account creation is now handled by Supabase Auth + Trigger.
      sendOTP();
      
      alert(
        '✅ Account created successfully!\n\n' +
        '📧 A confirmation email has been sent to ' + formData.email + '.\n\n' +
        'Now verifying with phone/internal OTP for immediate session start...'
      );

    } catch (error: any) {
      console.error('Error creating account:', error);
      alert('❌ Failed to create account: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const sendOTP = async () => {
    if (countdown > 0) return;

    setSending(true);
    try {
      const otpCode = generateOTP();
      
      // Send OTP (stores in DB, should email customer)
      const { error } = await sendOTPEmail(
        formData.email,
        otpCode,
        'customer_verification'
      );

      setOtpSent(true);
      setCountdown(60);
      
      // If email service failed, show OTP to waiter for manual verification
      if (error) {
        alert(
          `⚠️ Email Service Unavailable\n\n` +
          `📧 OTP Generated for ${formData.email}\n\n` +
          `Your OTP Code: ${otpCode}\n\n` +
          `Please share this code with the customer, then enter it below.\n\n` +
          `${error}`
        );
      } else {
        // Email sent successfully
        alert(
          `📧 OTP Sent to ${formData.email}\n\n` +
          `The customer should provide you with the 6-digit code.\n\n` +
          `Ask the customer: "What is your verification code?"\n\n` +
          `Then enter the code they provide.`
        );
      }
      
      console.log('🔐 OTP Code:', otpCode);

    } catch (error: any) {
      console.error('Error generating OTP:', error);
      alert('Failed to generate OTP: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const [sending, setSending] = useState(false);

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      alert('Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const { data: otpRecord, error: fetchError } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('email', formData.email)
        .eq('otp_code', otpCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .single();

      if (fetchError || !otpRecord) {
        throw new Error('Invalid or expired OTP');
      }

      await supabase
        .from('otp_verifications')
        .update({ used: true })
        .eq('id', otpRecord.id);

      alert('✅ Email verified successfully!');

      // Navigate to session creation with new user ID
      navigate(`/waiter/session/start/${tableId}`, {
        state: {
          customerType: 'new',
          userId: createdUserId,
          email: formData.email,
          fullName: formData.full_name,
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

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

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

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="New Customer Signup" />

      <div className="px-4 py-6 space-y-6">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-black text-foreground mb-2">
                Create New Account
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter customer details to create their account
              </p>
            </div>

            {/* Signup Form */}
            <Card>
              <CardBody className="p-4 space-y-3">
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  autoFocus
                />
                
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
                
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value)}
                />
                
                <Input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                />
              </CardBody>
            </Card>

            {/* Create Account Button */}
            <Button
              onClick={handleCreateAccount}
              className="w-full h-14 text-lg"
              isLoading={loading}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {loading ? 'Creating Account...' : 'Create & Verify Email'}
            </Button>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> After creating the account, we'll send an OTP to verify the email address.
              </p>
            </div>
          </>
        ) : (
          <>
            {/* OTP Verification */}
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-black text-foreground mb-2">
                Verify Email
              </h2>
              <p className="text-sm text-muted-foreground">
                We've sent a 6-digit code to<br />
                <span className="font-medium text-foreground">{formData.email}</span>
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
              {loading ? 'Verifying...' : 'Verify & Complete Signup'}
            </Button>

            {/* Resend OTP */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <Button
                onClick={() => sendOTP()}
                variant="outline"
                size="sm"
                disabled={sending || countdown > 0}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${countdown > 0 ? 'animate-spin' : ''}`} />
                {countdown > 0 
                  ? `Resend in ${countdown}s` 
                  : otpSent 
                    ? 'Resend OTP' 
                    : 'Send OTP'}
              </Button>
            </div>

            {/* Success Indicator */}
            {otpSent && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-sm text-green-800 font-medium">
                    OTP sent successfully to {formData.email}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
