import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu as MenuIcon } from 'lucide-react';
import { Profile } from '@/lib/supabase';
import { AnimatePresence, motion } from 'motion/react';
import { ChefSidebar } from '@/components/chef/ChefSidebar';

interface ChefAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function ChefApp({ onLogout, profile }: ChefAppProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/chef/orders')) return 'orders';
    if (path.includes('/chef/inventory')) return 'inventory';
    if (path.includes('/chef/settings')) return 'settings';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <div className="flex min-h-screen bg-background overflow-hidden font-header">
      {/* Sidebar - Fixed on Desktop, Drawer on Mobile */}
      <ChefSidebar 
        activeTab={activeTab} 
        onLogout={onLogout} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        chefName={profile?.full_name}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen lg:ml-[280px] overflow-hidden">
        {/* Top Header - Visible on Mobile Only */}
        <header className="lg:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-divider sticky top-0 z-30">
            <h2 className="text-xl font-black tracking-tighter text-brand-maroon">
                RESTO<span className="text-foreground">FLOW</span> <span className="text-[10px] text-muted-foreground ml-1 font-bold">CHEF</span>
            </h2>
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 bg-muted/50 rounded-xl text-foreground hover:bg-muted transition-colors"
            >
                <MenuIcon className="w-6 h-6" />
            </button>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-muted/5">
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
                <Outlet context={{ onLogout, profile }} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
