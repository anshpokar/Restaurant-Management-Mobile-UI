import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Menu as MenuIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface AdminAppProps {
  onLogout: () => void;
}

export function AdminApp({ onLogout }: AdminAppProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/admin/orders')) return 'orders';
    if (path.includes('/admin/menu')) return 'menu';
    if (path.includes('/admin/tables')) return 'tables';
    if (path.includes('/admin/reports')) return 'reports';
    if (path.includes('/admin/users')) return 'users';
    if (path.includes('/admin/bookings')) return 'bookings';
    if (path.includes('/admin/payment-verification')) return 'payment';
    if (path.includes('/admin/table-reservations')) return 'reservations';
    if (path.includes('/admin/settlements')) return 'settlements';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Sidebar - Fixed on Desktop, Drawer on Mobile */}
      <AdminSidebar 
        activeTab={activeTab} 
        onLogout={onLogout} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen lg:ml-[280px] overflow-hidden">
        {/* Top Header - Visible on Mobile Only (or for sticky header) */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-divider sticky top-0 z-30">
            <h2 className="text-xl font-black tracking-tighter text-brand-maroon">
                RESTO<span className="text-foreground">FLOW</span>
            </h2>
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 bg-muted/50 rounded-xl text-foreground hover:bg-muted transition-colors"
            >
                <MenuIcon className="w-6 h-6" />
            </button>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-background">
          <div className="max-w-[1600px] mx-auto min-h-full p-4 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="h-full"
              >
                <Outlet context={{ onLogout }} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
