import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { LogOut, ShoppingCart } from 'lucide-react';
import { supabase, type RestaurantTable, type Profile } from '@/lib/supabase';
import { CartSlider } from '@/components/waiter/cart-slider';
import { useCart } from '@/contexts/cart-context';
import { Badge } from '@/components/design-system/badge';

interface WaiterAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function WaiterApp({ onLogout, profile }: WaiterAppProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { getTotalSessionItems } = useCart();

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
              className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {getTotalSessionItems() > 0 && (
                <div className="absolute -top-1 -right-1">
                  <Badge variant="paid" className="h-4 min-w-[16px] px-1 flex items-center justify-center text-[10px] font-black">
                    {getTotalSessionItems()}
                  </Badge>
                </div>
              )}
            </button>
            <button onClick={onLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <CartSlider isOpen={isCartOpen} onOpenChange={setIsCartOpen} />

      <div className="flex-1 overflow-hidden flex flex-col">
        <Outlet context={{ tables, loading, fetchTables, onLogout, profile }} />
      </div>
    </div>
  );
}
