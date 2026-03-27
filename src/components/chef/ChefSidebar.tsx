import { ShoppingBag, LogOut, ChefHat, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SidebarItem({ icon, label, active, onClick }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${active
        ? 'bg-brand-gold text-brand-maroon shadow-lg shadow-brand-gold/20 scale-[1.02]'
        : 'text-white/60 hover:bg-white/10 hover:text-white'
        }`}
    >
      <span className={active ? 'text-brand-maroon' : 'text-inherit'}>{icon}</span>
      {label}
    </button>
  );
}

interface ChefSidebarProps {
  activeTab: string;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  chefName?: string;
}

export function ChefSidebar({ activeTab, onLogout, isOpen = true, onClose, chefName = 'Chef Staff' }: ChefSidebarProps) {
  const navigate = useNavigate();

  const navItems = [
    { id: 'dashboard', label: 'Kitchen Dashboard', icon: <ShoppingBag className="w-5 h-5" />, path: '/chef' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-brand-maroon text-white border-r border-white/10 shadow-2xl relative overflow-hidden font-header">
        {/* Brand Header */}
        <div className="p-8 pb-10 flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tighter text-brand-gold">
                RESTO<span className="text-white">FLOW</span> <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/50 ml-1">CHEF</span>
            </h2>
            {onClose && (
                <button onClick={onClose} className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 overflow-y-auto no-scrollbar space-y-1.5 pb-20 mt-4">
            {navItems.map(item => (
                <SidebarItem
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeTab === item.id}
                    onClick={() => {
                        navigate(item.path);
                        onClose?.();
                    }}
                />
            ))}
        </div>

        {/* Footer profile/Logout */}
        <div className="p-6 bg-black/20 backdrop-blur-md border-t border-white/5 space-y-4">
            <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-2xl bg-brand-gold flex items-center justify-center font-black text-brand-maroon shadow-lg shadow-brand-gold/10">
                    <ChefHat className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="text-sm font-black tracking-tight">{chefName}</h4>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Head Chef</p>
                </div>
            </div>
            <button
                onClick={onLogout}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-red-400 hover:bg-red-400/10 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.15em] border border-red-400/20"
            >
                <LogOut className="w-4 h-4" />
                Logout Account
            </button>
        </div>

        {/* Background Design Elements */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:block w-[280px] h-screen fixed left-0 top-0 z-[40]">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-[100]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px]"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
