import React, { useState } from 'react';
import { Button } from '@/app/components/design-system/button';
import { Input } from '@/app/components/design-system/input';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import { supabase, type UserRole, type Profile } from '@/lib/supabase';

interface LoginScreenProps {
  onLogin: (role: UserRole, profile?: Profile | null) => void;
  onSignup: () => void;
  onForgotPassword: () => void;
}

export function LoginScreen({ onLogin, onSignup, onForgotPassword }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.group('Login Process');
      const cleanEmail = email.trim();
      console.log('Target:', cleanEmail);

      let loginEmail = cleanEmail;

      // Helper for timeout
      const withTimeout = (promise: Promise<any>, ms: number = 30000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out. Please check your internet connection.')), ms))
        ]);
      };

      // 1. Resolve email if user entered a username or phone number
      if (!cleanEmail.includes('@')) {
        console.log('Step 1: Resolving username/phone:', cleanEmail);

        try {
          // Try username first
          const { data: userByUsername, error: usernameError } = await withTimeout(
            supabase
              .from('profiles')
              .select('email')
              .eq('username', cleanEmail)
              .maybeSingle() as any
          );

          if (usernameError) {
            console.error('Username check database error:', usernameError);
          }

          if (userByUsername) {
            loginEmail = userByUsername.email;
            console.log('Resolved via username to:', loginEmail);
          } else {
            // Try phone number
            console.log('Not found by username, trying phone...');
            const { data: userByPhone, error: phoneError } = await withTimeout(
              supabase
                .from('profiles')
                .select('email')
                .eq('phone_number', cleanEmail)
                .maybeSingle() as any
            );

            if (phoneError) {
              console.error('Phone check database error:', phoneError);
            }

            if (userByPhone) {
              loginEmail = userByPhone.email;
              console.log('Resolved via phone to:', loginEmail);
            } else {
              console.warn('Resolution failed: No profile found for', cleanEmail);
              throw new Error('User not found with that username or phone number');
            }
          }
        } catch (resolveErr: any) {
          console.error('Resolution failed:', resolveErr);
          throw resolveErr;
        }
      }

      // 2. Sign in with Supabase Auth
      console.log('Step 2: Authenticating with:', loginEmail);

      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        }) as any
      );

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (authData.user) {
        console.log('Step 3: Auth success, ID:', authData.user.id);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          throw profileError;
        }

        if (profileData) {
          console.log('Step 4: Profile found, role:', profileData.role);
          onLogin(profileData.role as UserRole, profileData as Profile);
        } else {
          console.warn('No profile found, defaulting to customer');
          onLogin('customer', null);
        }
      } else {
        throw new Error('Authentication failed: No user data returned');
      }
    } catch (error: any) {
      console.error('Critical Login Error:', error);
      console.log('Error Properties:', Object.getOwnPropertyNames(error));

      let message = 'Invalid login credentials';

      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'object' && error !== null) {
        message = error.message || error.error_description || JSON.stringify(error);
      } else if (typeof error === 'string') {
        message = error;
      }

      if (message === '{}' || !message) {
        message = 'Connection Error: Could not reach Supabase. Please check your internet.';
      }

      setIsLoading(false);
      alert(message);
    } finally {
      setIsLoading(false);
      console.groupEnd();
      console.log('Login process completed');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="px-8 pt-16 pb-8">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-primary rounded-2xl">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground text-center mb-2">
          Welcome Back
        </h1>
        <p className="text-center text-muted-foreground">
          Sign in to continue to NAVRATNA
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-8">
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="text"
            label="Username or Email or Phone"
            placeholder="Enter your email, phone or username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <div className="text-right">
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-primary hover:underline"
            >
              Forgot Password?
            </button>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              Sign In
            </Button>
          </div>
        </form>

      </div>

      {/* Footer */}
      <div className="px-8 pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSignup();
            }}
            className="text-primary font-medium hover:underline"
          >
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
}
