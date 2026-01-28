import React, { useState } from 'react';
import { Button } from '../design-system/button';
import { Input } from '../design-system/input';
import { Sparkles, Eye, EyeOff, ArrowLeft, UserCircle } from 'lucide-react';
import { supabase, type UserRole } from '@/lib/supabase';

interface SignupScreenProps {
  onLogin: () => void;
  onSignupSuccess: (role: UserRole) => void;
}

export function SignupScreen({ onLogin, onSignupSuccess }: SignupScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
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
        // If email confirmation is ON, tell the user to check their mail
        if (!data.session) {
          alert('Signup successful! Please check your email for the verification link.');
          onLogin();
        } else {
          onSignupSuccess('customer');
        }
      }
    } catch (error: any) {
      console.error('Signup Error Full Object:', error);
      
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
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
