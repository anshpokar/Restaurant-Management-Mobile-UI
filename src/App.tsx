import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MobileContainer } from '@/components/MobileContainer';
import { AppRoutes } from '@/routes';
import { useAuth } from '@/hooks/use-auth';

export default function App() {
  const location = useLocation();
  const { userRole, userProfile, isLoadingAuth, handleLogout } = useAuth();

  const screenVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const isDesktopRole = userRole === 'admin' || userRole === 'chef';

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
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
  );
}
