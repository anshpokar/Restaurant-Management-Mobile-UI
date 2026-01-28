import React, { useState } from 'react';
import { MobileContainer } from './components/mobile-container';
import { SplashScreen } from './components/auth/splash-screen';
import { OnboardingScreen } from './components/auth/onboarding-screen';
import { LoginScreen } from './components/auth/login-screen';
import { SignupScreen } from './components/auth/signup-screen';
import { ForgotPasswordScreen } from './components/auth/forgot-password-screen';
import { CustomerApp } from './components/customer/customer-app';
import { AdminApp } from './components/admin/admin-app';
import { DeliveryApp } from './components/delivery/delivery-app';
import { type UserRole } from '@/lib/supabase';

type AppScreen = 'splash' | 'onboarding' | 'login' | 'signup' | 'forgot-password' | 'customer' | 'admin' | 'delivery';

export default function App() {
  console.log("App component rendered, currentScreen:", 'splash');
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Simulate splash screen timeout
  React.useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('onboarding');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const handleLogin = (role: UserRole) => {
    setUserRole(role);
    setCurrentScreen(role as AppScreen);
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentScreen('login');
  };

  return (
    <MobileContainer>
      {currentScreen === 'splash' && <SplashScreen />}
      
      {currentScreen === 'onboarding' && (
        <OnboardingScreen onComplete={() => setCurrentScreen('login')} />
      )}
      
      {currentScreen === 'login' && (
        <LoginScreen 
          onLogin={handleLogin}
          onSignup={() => setCurrentScreen('signup')}
          onForgotPassword={() => setCurrentScreen('forgot-password')}
        />
      )}

      {currentScreen === 'forgot-password' && (
        <ForgotPasswordScreen
          onBack={() => setCurrentScreen('login')}
          onSuccess={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'signup' && (
        <SignupScreen
          onLogin={() => setCurrentScreen('login')}
          onSignupSuccess={(role) => handleLogin(role)}
        />
      )}
      
      {currentScreen === 'customer' && userRole === 'customer' && (
        <CustomerApp onLogout={handleLogout} />
      )}
      
      {currentScreen === 'admin' && userRole === 'admin' && (
        <AdminApp onLogout={handleLogout} />
      )}

      {currentScreen === 'delivery' && userRole === 'delivery' && (
        <DeliveryApp onLogout={handleLogout} />
      )}
    </MobileContainer>
  );
}
