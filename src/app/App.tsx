import React, { useState } from 'react';
import { MobileContainer } from './components/mobile-container';
import { SplashScreen } from './components/auth/splash-screen';
import { OnboardingScreen } from './components/auth/onboarding-screen';
import { LoginScreen } from './components/auth/login-screen';
import { SignupScreen } from './components/auth/signup-screen';
import { CustomerApp } from './components/customer/customer-app';
import { AdminApp } from './components/admin/admin-app';

type AppScreen = 'splash' | 'onboarding' | 'login' | 'signup' | 'customer' | 'admin';
type UserRole = 'customer' | 'admin' | null;

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('splash');
  const [userRole, setUserRole] = useState<UserRole>(null);

  // Simulate splash screen timeout
  React.useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('onboarding');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const handleLogin = (role: 'customer' | 'admin') => {
    setUserRole(role);
    setCurrentScreen(role);
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
    </MobileContainer>
  );
}
