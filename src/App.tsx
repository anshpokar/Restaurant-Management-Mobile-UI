import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MobileContainer } from '@/components/MobileContainer';
import { AppRoutes } from '@/routes';
import { useAuth } from '@/hooks/use-auth';
import { CartProvider } from '@/contexts/cart-context';
import { useEffect } from 'react';

export default function App() {
  const location = useLocation();
  const { userRole, userProfile, isLoadingAuth, handleLogout } = useAuth();

  // Auto-clear stale cache on app mount (internal, no UI)
  useEffect(() => {
    // Clear any potentially stale session storage
    const staleKeys = ['cart', 'activeSession', 'checkoutData'];
    staleKeys.forEach(key => {
      const data = sessionStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          // Clear if older than 1 hour
          if (parsed.timestamp && Date.now() - parsed.timestamp > 3600000) {
            sessionStorage.removeItem(key);
            console.log(`Cleared stale ${key} from session storage`);
          }
        } catch {
          // Invalid JSON, clear it
          sessionStorage.removeItem(key);
        }
      }
    });
  }, []);

  const screenVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const isDesktopRole = userRole === 'admin' || userRole === 'chef';

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <CartProvider>
      <MobileContainer fullWidth={isDesktopRole}>
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
            <AppRoutes
              userRole={userRole}
              userProfile={userProfile}
              isLoadingAuth={isLoadingAuth}
              handleLogout={handleLogout}
            />
          </motion.div>
        </AnimatePresence>
      </MobileContainer>
      {/* No visible cache clear button - automatic only */}
    </CartProvider>
  );
}
