import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MobileContainer } from './components/mobile-container';
import { SplashScreen } from './components/auth/splash-screen';
import { OnboardingScreen } from './components/auth/onboarding-screen';
import { LoginScreen } from './components/auth/login-screen';
import { SignupScreen } from './components/auth/signup-screen';
import { ForgotPasswordScreen } from './components/auth/forgot-password-screen';
import { CustomerApp } from './components/customer/customer-app';
import { AdminApp } from './components/admin/admin-app';
import { DeliveryApp } from './components/delivery/delivery-app';
import { WaiterApp } from './components/waiter/waiter-app';
import { ChefApp } from './components/chef/chef-app';
import { supabase, type UserRole, type Profile } from '@/lib/supabase';

type AppScreen = 'splash' | 'onboarding' | 'login' | 'signup' | 'forgot-password' | 'customer' | 'admin' | 'delivery' | 'waiter' | 'chef';

export default function App() {
  console.log("App component rendered");
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<AppScreen[]>([]);
  const [isInitializing, setIsInitializing] = useState(false);

  // Auth Session Recovery & Persistence
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile && !error) {
            setUserRole(profile.role);
            setUserProfile(profile);
            setCurrentScreen(profile.role as AppScreen);
            setIsInitializing(false);
            return;
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      }
      setIsInitializing(false);
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUserRole(profile.role);
          setUserProfile(profile);
          navigateTo(profile.role as AppScreen);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setUserProfile(null);
        setCurrentScreen('login');
        setHistory([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Back button handler (browser back)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (history.length > 0) {
        const prevHistory = [...history];
        const lastScreen = prevHistory.pop();
        if (lastScreen) {
          setCurrentScreen(lastScreen);
          setHistory(prevHistory);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [history]);

  const navigateTo = (screen: AppScreen) => {
    if (screen === currentScreen) return;

    // Push current screen to history before changing
    setHistory(prev => [...prev, currentScreen]);
    setCurrentScreen(screen);

    // Update browser URL state for back button support
    window.history.pushState({ screen }, "", "");
  };

  const goBack = () => {
    if (history.length > 0) {
      const prevHistory = [...history];
      const lastScreen = prevHistory.pop();
      if (lastScreen) {
        setCurrentScreen(lastScreen);
        setHistory(prevHistory);
        window.history.back();
      }
    }
  };

  // Simulate splash screen timeout (only if not logged in)
  useEffect(() => {
    if (currentScreen === 'splash' && !isInitializing) {
      const timer = setTimeout(() => {
        if (!userRole) {
          setCurrentScreen('onboarding');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen, isInitializing, userRole]);

  const handleLogin = async (role: UserRole) => {
    setUserRole(role);

    // Set a mock profile for demo mode
    const mockProfiles: Record<UserRole, Profile> = {
      customer: { id: '00000000-0000-0000-0000-000000000001', full_name: 'Demo Customer', username: 'customer_demo', phone_number: '1234567890', role: 'customer', email: 'customer@demo.com' },
      admin: { id: '00000000-0000-0000-0000-000000000002', full_name: 'Demo Admin', username: 'admin_demo', phone_number: '1234567890', role: 'admin', email: 'admin@demo.com' },
      delivery: { id: '00000000-0000-0000-0000-000000000003', full_name: 'Demo Delivery', username: 'delivery_demo', phone_number: '1234567890', role: 'delivery', email: 'delivery@demo.com' },
      waiter: { id: '00000000-0000-0000-0000-000000000004', full_name: 'Demo Waiter', username: 'waiter_demo', phone_number: '1234567890', role: 'waiter', email: 'waiter@demo.com' },
      chef: { id: '00000000-0000-0000-0000-000000000005', full_name: 'Demo Chef', username: 'chef_demo', phone_number: '1234567890', role: 'chef', email: 'chef@demo.com' }
    };

    setUserProfile(mockProfiles[role]);
    navigateTo(role as AppScreen);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (isInitializing) {
    return <SplashScreen />;
  }

  const screenVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <MobileContainer>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={screenVariants}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full w-full"
        >
          {currentScreen === 'splash' && <SplashScreen />}

          {currentScreen === 'onboarding' && (
            <OnboardingScreen onComplete={() => navigateTo('login')} />
          )}

          {currentScreen === 'login' && (
            <LoginScreen
              onLogin={handleLogin}
              onSignup={() => navigateTo('signup')}
              onForgotPassword={() => navigateTo('forgot-password')}
            />
          )}

          {currentScreen === 'forgot-password' && (
            <ForgotPasswordScreen
              onBack={goBack}
              onSuccess={() => navigateTo('login')}
            />
          )}

          {currentScreen === 'signup' && (
            <SignupScreen
              onLogin={() => navigateTo('login')}
              onSignupSuccess={(role) => handleLogin(role)}
            />
          )}

          {currentScreen === 'customer' && userRole === 'customer' && (
            <CustomerApp onLogout={handleLogout} profile={userProfile} />
          )}

          {currentScreen === 'admin' && userRole === 'admin' && (
            <AdminApp onLogout={handleLogout} />
          )}

          {currentScreen === 'delivery' && userRole === 'delivery' && (
            <DeliveryApp onLogout={handleLogout} />
          )}

          {currentScreen === 'waiter' && userRole === 'waiter' && (
            <WaiterApp onLogout={handleLogout} profile={userProfile} />
          )}

          {currentScreen === 'chef' && userRole === 'chef' && (
            <ChefApp onLogout={handleLogout} profile={userProfile} />
          )}
        </motion.div>
      </AnimatePresence>
    </MobileContainer>
  );
}
