import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { LogOut } from 'lucide-react';
import { supabase, type RestaurantTable, type Profile } from '@/lib/supabase';

interface WaiterAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function WaiterApp({ onLogout, profile }: WaiterAppProps) {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);

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
          <button onClick={onLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-full transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col">
        <Outlet context={{ tables, loading, fetchTables, onLogout, profile }} />
      </div>
    </div>
  );
}
