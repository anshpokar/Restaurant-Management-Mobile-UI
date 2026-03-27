import React, { useState } from 'react';
import { Button } from '@/components/design-system/button';
import { Input } from '@/components/design-system/input';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import { supabase, type UserRole, type Profile } from '@/lib/supabase';
import { AUTH_TEXT } from '@/constants/text';
import { toast } from 'sonner';


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
              throw new Error('No account found with this username or phone number. Please sign up first.');
            }
          }
        } catch (resolveErr: any) {
          console.error('Resolution failed:', resolveErr);
          throw resolveErr;
        }
      } else {
        // Email format - check if user exists
        console.log('Step 1b: Checking if email exists:', cleanEmail);
        const { data: existingUser, error: emailCheckError } = await withTimeout(
          supabase
            .from('profiles')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle() as any
        );

        if (emailCheckError) {
          console.error('Email check database error:', emailCheckError);
        }

        if (!existingUser) {
          console.warn('Email not found in database:', cleanEmail);
          throw new Error('No account found with this email address. Please sign up first.');
        }
        
        loginEmail = cleanEmail;
        console.log('Email exists, proceeding with login:', loginEmail);
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
      toast.error(message);
    } finally {

      setIsLoading(false);
      console.groupEnd();
      console.log('Login process completed');
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
      // Note: redirectTo will handle the actual transition.
    } catch (error: any) {
      console.error('Google Login Error:', error);
      toast.error(error.message || 'Failed to sign in with Google');
      setIsLoading(false);
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
          {AUTH_TEXT.LOGIN_TITLE}
        </h1>
        <p className="text-center text-muted-foreground">
          {AUTH_TEXT.LOGIN_SUBTITLE}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-8">
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="text"
            label={`${AUTH_TEXT.USERNAME_LABEL} or ${AUTH_TEXT.EMAIL_LABEL} or ${AUTH_TEXT.PHONE_LABEL}`}
            placeholder={`Enter your ${AUTH_TEXT.EMAIL_LABEL.toLowerCase()}, ${AUTH_TEXT.PHONE_LABEL.toLowerCase()} or ${AUTH_TEXT.USERNAME_LABEL.toLowerCase()}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              label={AUTH_TEXT.PASSWORD_LABEL}
              placeholder={`Enter your ${AUTH_TEXT.PASSWORD_LABEL.toLowerCase()}`}
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
              {AUTH_TEXT.FORGOT_PASSWORD}
            </button>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
              {AUTH_TEXT.SIGN_IN}
            </Button>
          </div>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-muted"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">{AUTH_TEXT.OR_CONTINUE_WITH}</span>
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
          {AUTH_TEXT.CONTINUE_WITH_GOOGLE}
        </Button>
      </div>

      {/* Footer */}
      <div className="px-8 pb-8 text-center">
        <p className="text-sm text-muted-foreground">
          {AUTH_TEXT.DONT_HAVE_ACCOUNT}{' '}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onSignup();
            }}
            className="text-primary font-medium hover:underline"
          >
            {AUTH_TEXT.SIGN_UP}
          </button>
        </p>
      </div>
    </div>
  );
}
