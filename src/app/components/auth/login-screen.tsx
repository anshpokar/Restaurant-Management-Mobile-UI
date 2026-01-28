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
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Fetch the user's role from the profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;
        
        if (profileData) {
          onLogin(profileData.role as UserRole);
        } else {
          // Fallback if profile not found
          onLogin('customer');
        }
      }
    } catch (error: any) {
      console.error('Login Error Full Object:', error);
      
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
