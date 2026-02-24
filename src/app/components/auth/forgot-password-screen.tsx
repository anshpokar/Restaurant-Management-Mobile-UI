import React, { useState } from 'react';
import { Button } from '@/app/components/design-system/button';
import { Input } from '@/app/components/design-system/input';
import { AppHeader } from '@/app/components/design-system/app-header';
import { KeyRound, Mail, Phone, CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

type Step = 'input' | 'otp' | 'reset' | 'success';

export function ForgotPasswordScreen({ onBack, onSuccess }: ForgotPasswordScreenProps) {
  const [step, setStep] = useState<Step>('input');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // Changed to 6 digits for Supabase
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [method, setMethod] = useState<'email' | 'phone' | null>(null);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [resendTimer, setResendTimer] = useState(0);

  React.useEffect(() => {
    let timer: any;
    if (resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    
    try {
      const isEmail = identifier.includes('@');
      setMethod(isEmail ? 'email' : 'phone');

      if (isEmail) {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout: Sending password reset email took too long. Please check your internet connection.')), 15000); // 15 second timeout
        });
        
        // Create the API call promise
        const apiPromise = supabase.auth.resetPasswordForEmail(identifier);
        
        // Race the promises
        const result = await Promise.race([apiPromise, timeoutPromise]);
        
        if (result.error) throw result.error;
        alert('Password reset code sent to your email!');
      } else {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout: Sending SMS verification took too long. Please check your internet connection.')), 15000); // 15 second timeout
        });
        
        // Create the API call promise
        const apiPromise = supabase.auth.signInWithOtp({ phone: identifier });
        
        // Race the promises
        const result = await Promise.race([apiPromise, timeoutPromise]);
        
        if (result.error) throw result.error;
        alert('Verification code sent to your phone!');
      }
      
      setStep('otp');
      setResendTimer(60); // Start 60s cooldown
    } catch (error: any) {
      console.error('Send OTP Error:', error);
      alert(error.message || 'Failed to send OTP. Please check your credentials and internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    handleSendOtp();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const token = otp.join('');
    
    try {
      if (method === 'email') {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout: Verifying email OTP took too long. Please check your internet connection.')), 15000); // 15 second timeout
        });
        
        // Create the API call promise
        const apiPromise = supabase.auth.verifyOtp({
          email: identifier,
          token,
          type: 'recovery'
        });
        
        // Race the promises
        const result = await Promise.race([apiPromise, timeoutPromise]);
        
        if (result.error) throw result.error;
      } else {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout: Verifying phone OTP took too long. Please check your internet connection.')), 15000); // 15 second timeout
        });
        
        // Create the API call promise
        const apiPromise = supabase.auth.verifyOtp({
          phone: identifier,
          token,
          type: 'sms'
        });
        
        // Race the promises
        const result = await Promise.race([apiPromise, timeoutPromise]);
        
        if (result.error) throw result.error;
      }
      
      setStep('reset');
    } catch (error: any) {
      console.error('Verify OTP Error:', error);
      alert(error.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Password validation
    const hasNumber = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    } else if (!hasNumber || !hasSpecialChar) {
      setPasswordError('Password must contain at least one number and one special character');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    
    setPasswordError(undefined);
    setIsLoading(true);
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout: Updating password took too long. Please check your internet connection.')), 15000); // 15 second timeout
      });
      
      // Create the API call promise
      const apiPromise = supabase.auth.updateUser({
        password: newPassword
      });
      
      // Race the promises
      const result = await Promise.race([apiPromise, timeoutPromise]);

      if (result.error) throw result.error;
      
      setStep('success');
    } catch (error: any) {
      console.error('Reset Password Error:', error);
      alert(error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader 
        title="Forgot Password" 
        showBack 
        onBack={step === 'success' ? onSuccess : onBack} 
      />

      <div className="flex-1 px-8 py-8">
        {step === 'input' && (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-6">
              <KeyRound className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Reset Password</h2>
              <p className="text-muted-foreground">
                Enter your email or phone number and we'll send you an OTP to reset your password.
              </p>
            </div>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Input
                label="Email or Phone Number"
                placeholder="Enter email or phone"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Send OTP
              </Button>
            </form>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-6">
            <div className="flex items-center justify-center w-16 h-16 bg-accent/10 rounded-2xl mx-auto mb-6">
              {method === 'email' ? (
                <Mail className="w-8 h-8 text-accent" />
              ) : (
                <Phone className="w-8 h-8 text-accent" />
              )}
            </div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">Verify OTP</h2>
              <p className="text-muted-foreground">
                We've sent a 6-digit code to your {method === 'email' ? 'email' : 'phone'}
                <br />
                <span className="font-medium text-foreground">{identifier}</span>
              </p>
            </div>
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="number"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    className="w-12 h-14 text-center text-2xl font-bold bg-card border border-divider rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    required
                  />
                ))}
              </div>
              <div className="space-y-4">
                <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                  Verify & Continue
                </Button>
                <button 
                  type="button"
                  className={`w-full text-sm font-medium hover:underline ${resendTimer > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary'}`}
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0}
                >
                  {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>
            </form>
          </div>
        )}

        {step === 'reset' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">New Password</h2>
              <p className="text-muted-foreground">
                Please create a new password that you haven't used before.
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                type="password"
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError(undefined);
                }}
                error={passwordError}
                required
              />
              
              {/* Password requirements hint */}
              <div className="text-xs text-muted-foreground space-y-1 mb-4">
                <p className={newPassword.length >= 8 ? "text-green-600" : ""}>• At least 8 characters</p>
                <p className={/\d/.test(newPassword) && /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? "text-green-600" : ""}>• Contains number and special character</p>
              </div>

              <Input
                type="password"
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError) setPasswordError(undefined);
                }}
                required
              />
              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Reset Password
              </Button>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 pt-12">
            <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Password Reset!</h2>
              <p className="text-muted-foreground">
                Your password has been successfully reset. You can now login with your new password.
              </p>
            </div>
            <Button 
              onClick={onSuccess} 
              className="w-full" 
              size="lg"
            >
              Go to Login <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
