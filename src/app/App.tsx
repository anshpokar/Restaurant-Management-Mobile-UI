import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import { ProtectedRoute } from './components/auth/ProtectedRoute';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

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
            // If on auth pages, redirect to dashboard
            if (['/login', '/signup', '/forgot-password', '/'].includes(location.pathname)) {
              navigate(`/${profile.role}`, { replace: true });
            }
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setUserRole(profileData.role);
          setUserProfile(profileData);
          navigate(`/${profileData.role}`, { replace: true });
        }
      } else if (event === 'SIGNED_OUT') {
        setUserRole(null);
        setUserProfile(null);
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const screenVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <MobileContainer>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={screenVariants}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="h-full w-full"
        >
          <Routes location={location}>
            {/* Public Routes */}
            <Route path="/" element={<SplashScreen onTimeout={() => navigate('/onboarding')} />} />
            <Route path="/onboarding" element={<OnboardingScreen onComplete={() => navigate('/login')} />} />
            <Route
              path="/login"
              element={
                userRole ?
                  <Navigate to={`/${userRole}`} replace /> :
                  <LoginScreen
                    onLogin={() => { }} // Handle via auth change listener
                    onSignup={() => navigate('/signup')}
                    onForgotPassword={() => navigate('/forgot-password')}
                  />
              }
            />
            <Route path="/signup" element={<SignupScreen onLogin={() => navigate('/login')} onSignupSuccess={() => { }} />} />
            <Route path="/forgot-password" element={<ForgotPasswordScreen onBack={() => navigate(-1)} onSuccess={() => navigate('/login')} />} />

            {/* Role Protected Routes */}
            <Route path="/customer/*" element={
              <ProtectedRoute userRole={userRole} allowedRoles={['customer']} isLoading={isLoadingAuth}>
                <CustomerApp onLogout={handleLogout} profile={userProfile} />
              </ProtectedRoute>
            } />

            <Route path="/admin/*" element={
              <ProtectedRoute userRole={userRole} allowedRoles={['admin']} isLoading={isLoadingAuth}>
                <AdminApp onLogout={handleLogout} />
              </ProtectedRoute>
            } />

            <Route path="/delivery/*" element={
              <ProtectedRoute userRole={userRole} allowedRoles={['delivery']} isLoading={isLoadingAuth}>
                <DeliveryApp onLogout={handleLogout} />
              </ProtectedRoute>
            } />

            <Route path="/waiter/*" element={
              <ProtectedRoute userRole={userRole} allowedRoles={['waiter']} isLoading={isLoadingAuth}>
                <WaiterApp onLogout={handleLogout} profile={userProfile} />
              </ProtectedRoute>
            } />

            <Route path="/chef/*" element={
              <ProtectedRoute userRole={userRole} allowedRoles={['chef']} isLoading={isLoadingAuth}>
                <ChefApp onLogout={handleLogout} profile={userProfile} />
              </ProtectedRoute>
            } />

            {/* 404 / Default */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </MobileContainer>
  );
}

