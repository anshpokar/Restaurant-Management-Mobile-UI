import React, { useState } from 'react';
import { Button } from '@/app/components/design-system/button';
import { Input } from '@/app/components/design-system/input';
import { Sparkles, Eye, EyeOff } from 'lucide-react';
import { supabase, type UserRole } from '@/lib/supabase';

interface LoginScreenProps {
  onLogin: (role: UserRole) => void;
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
      console.log('Starting login process with email:', email);
      
      let loginEmail = email;

      // 1. Resolve email if user entered a username or phone number instead
      if (!email.includes('@')) {
        console.log('Resolving username/phone to email:', email);
        
        const resolvePromise = supabase
          .from('profiles')
          .select('email')
          .or(`username.eq.${email},phone_number.eq.${email}`)
          .single();
        
        // Create a timeout promise for email resolution
        const resolveTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Username/Phone resolution timeout: Could not resolve username or phone number. Please try again.')), 10000); // 10 second timeout
        });
        
        const resolveResult = await Promise.race([resolvePromise, resolveTimeoutPromise]);
        const { data: profile, error: resolveError } = resolveResult;

        if (resolveError) {
          console.error('Resolve error:', resolveError);
          throw new Error('User not found with that username or phone number');
        }
        
        if (!profile) {
          throw new Error('User not found with that username or phone number');
        }
        
        loginEmail = profile.email;
        console.log('Resolved to email:', loginEmail);
      }

      // 2. Sign in with Supabase Auth
      console.log('Attempting to sign in with Supabase...');
      
      // Set a timeout for the authentication request
      const authPromise = supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout: Connection to Supabase took too long. Please check your internet connection.')), 10000); // 10 second timeout
      });
      
      const { data: authData, error: authError } = await Promise.race([authPromise, timeoutPromise]) as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

      if (authError) {
        console.error('Auth error:', authError);
        throw authError;
      }

      if (authData.user) {
        console.log('Authentication successful, fetching profile...');
        
        // 3. Fetch the user's role from the profiles table
        const profileFetchPromise = supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();
        
        // Create a timeout promise for profile fetching
        const profileTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout: Could not retrieve user profile. Please try again.')), 10000); // 10 second timeout
        });
        
        const profileResult = await Promise.race([profileFetchPromise, profileTimeoutPromise]);
        const { data: profileData, error: profileError } = profileResult;

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          throw profileError;
        }
        
        if (profileData) {
          console.log('Login successful, role:', profileData.role);
          onLogin(profileData.role as UserRole);
        } else {
          console.warn('No profile found, defaulting to customer');
          onLogin('customer');
        }
      } else {
        throw new Error('Authentication failed: No user data returned');
      }
    } catch (error: any) {
      console.error('Login Error Full Object:', error);
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
        message = 'Connection Error: Could not reach Supabase. Please check your internet and restart the server.';
      }

      alert(message);
    } finally {
      setIsLoading(false);
      console.log('Login process completed, loading state set to false');
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

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-divider"></div>
          <span className="text-sm text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-divider"></div>
        </div>

        {/* Demo Access Buttons */}
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => onLogin('customer')}
          >
            Continue as Customer (Demo)
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => onLogin('admin')}
          >
            Continue as Admin (Demo)
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => onLogin('delivery')}
          >
            Continue as Delivery Person (Demo)
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => onLogin('waiter')}
          >
            Continue as Waiter (Demo)
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => onLogin('chef')}
          >
            Continue as Chef (Demo)
          </Button>
        </div>
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
