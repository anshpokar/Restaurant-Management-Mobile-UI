import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { LogOut, Plus } from 'lucide-react';
import { supabase, type RestaurantTable, type Profile } from '@/lib/supabase';
import { CartSlider } from '@/components/waiter/cart-slider';
import { AnimatePresence, motion } from 'motion/react';

interface WaiterAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function WaiterApp({ onLogout, profile }: WaiterAppProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    fetchTables();
    const subscription = supabase
      .channel('table-updates')
      .on('postgres_changes' as any, { event: '*', table: 'restaurant_tables' }, () => {
        fetchTables();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-7xl mx-auto shadow-2xl border-x border-border">
      <AppHeader
        title={`Waiter: ${profile?.full_name?.split(' ')[0] || 'Staff'}`}
        actions={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-2 text-brand-maroon hover:bg-brand-maroon/10 rounded-full transition-colors"
              title="Open Ordering Slider"
            >
              <Plus className="w-6 h-6" />
            </button>
            <button onClick={onLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <CartSlider isOpen={isCartOpen} onOpenChange={setIsCartOpen} />

      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <Outlet context={{ tables, loading, fetchTables, onLogout, profile }} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
