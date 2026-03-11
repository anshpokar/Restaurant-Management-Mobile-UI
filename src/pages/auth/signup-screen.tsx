import React, { useState } from 'react';
import { Button } from '@/components/design-system/button';
import { Input } from '@/components/design-system/input';
import { Sparkles, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase, type UserRole, type Profile } from '@/lib/supabase';

interface SignupScreenProps {
  onLogin: () => void;
  onSignupSuccess: (role: UserRole, profile: Profile) => void;
}

export function SignupScreen({ onLogin, onSignupSuccess }: SignupScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; username?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; username?: string } = {};
    let isValid = true;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    // Password validation
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
      isValid = false;
    } else if (!hasNumber || !hasSpecialChar) {
      newErrors.password = 'Password must contain at least one number and one special character';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // 0. Check if username is unique
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        setErrors({ ...errors, username: 'Username is already taken' });
        setIsLoading(false);
        return;
      }

      // 1. Sign up with Supabase Auth - Passing extra data in options.data
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            username: username,
            phone_number: phoneNumber,
            role: 'customer'
          }
        }
      });

      if (authError) throw authError;

      if (data.user) {
        // Note: Profile creation is now handled by a Database Trigger for security (RLS)

        // If email confirmation is ON, tell the user to check their mail
        if (!data.session) {
          alert('Signup successful! Please check your email for the verification link.');
          onLogin();
        } else {
          onSignupSuccess('customer', {
            id: data.user.id,
            full_name: name,
            username: username,
            phone_number: phoneNumber,
            role: 'customer',
            email: email
          });
        }
      }
    } catch (error: any) {
      console.error('Signup Error Full Object:', error);
      console.log('Error Properties:', Object.getOwnPropertyNames(error));

      let message = 'An error occurred during signup';

      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null) {
        message = error.message || error.error_description || JSON.stringify(error);
      } else if (typeof error === 'string') {
        message = error;
      }

      if (message === '{}' || !message) {
        message = 'Connection Error: Could not reach Supabase. Please check your internet and restart the server.';
      }

      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google Signup Error:', error);
      alert(error.message || 'Failed to sign up with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-8 pt-16 pb-8">
        <button
          type="button"
          onClick={onLogin}
          className="mb-6 p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-center w-16 h-16 mb-6 bg-primary rounded-2xl">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Create Account
        </h1>
        <p className="text-muted-foreground">
          Sign up to get started with NAVRATNA
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-8">
        <form onSubmit={handleSignup} className="space-y-4">
          <Input
            type="text"
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            required
          />

          <Input
            type="text"
            label="Username"
            placeholder="Create a username"
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setUsername(e.target.value);
              if (errors.username) setErrors({ ...errors, username: undefined });
            }}
            error={errors.username}
            required
          />

          <Input
            type="tel"
            label="Phone Number"
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
            required
          />

          <Input
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            error={errors.email}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Create a password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-11 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password requirements hint */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p className={password.length >= 8 ? "text-green-600" : ""}>• At least 8 characters</p>
            <p className={/\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password) ? "text-green-600" : ""}>• Contains number and special character</p>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Sign Up
            </Button>
          </div>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-center gap-3 h-12"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Terms */}
        <p className="mt-6 text-xs text-center text-muted-foreground">
          By signing up, you agree to our{' '}
          <button type="button" className="text-primary hover:underline">Terms of Service</button>
          {' '}and{' '}
          <button type="button" className="text-primary hover:underline">Privacy Policy</button>
        </p>
      </div>

      {/* Footer */}
      <div className="px-8 pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onLogin();
            }}
            className="text-primary font-medium hover:underline"
          >
            Sign In
          </button>
        </p>
      </div>
    </div>
  );
}
