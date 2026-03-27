import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DriverFinance {
  id: string;
  full_name: string;
  cash_collected: number;
  total_earnings: number;
  pending_settlement: number;
}

export function useSettlements() {
  const [drivers, setDrivers] = useState<DriverFinance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverFinances();

    const channel = supabase.channel('driver-finance-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'role=eq.delivery' }, () => {
        fetchDriverFinances();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDriverFinances() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cash_collected, total_earnings')
        .eq('role', 'delivery');

      if (error) throw error;

      const formatted = data.map(d => ({
        ...d,
        pending_settlement: Math.max(0, (d.cash_collected || 0) - (d.total_earnings || 0))
      }));

      setDrivers(formatted);
    } catch (err) {
      console.error('Error fetching driver finances:', err);
    } finally {
      setLoading(false);
    }
  }

  async function settleAmount(driverId: string, amount: number, notes: string = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const driver = drivers.find(d => d.id === driverId);
      if (!driver) throw new Error('Driver not found');

      // 1. Create settlement record
      const { error: settlementError } = await supabase
        .from('cash_settlements')
        .insert({
          delivery_person_id: driverId,
          amount,
          settled_by: user.id,
          notes
        });

      if (settlementError) throw settlementError;

      // 2. Intelligent adjustment:
      // When a driver hands over 'amount', it effectively pays off their collected cash.
      // If they were 'paying themselves' from the cash (offsetting earnings), 
      // then we should also decrement their earnings by that same offset amount.
      
      const earningsOffset = Math.min(driver.total_earnings || 0, driver.cash_collected || 0);
      const newCashCollected = Math.max(0, (driver.cash_collected || 0) - amount - earningsOffset);
      const newTotalEarnings = Math.max(0, (driver.total_earnings || 0) - earningsOffset);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          cash_collected: newCashCollected,
          total_earnings: newTotalEarnings
        })
        .eq('id', driverId);

      if (updateError) throw updateError;

      await fetchDriverFinances();
      return { success: true };
    } catch (err: any) {
      console.error('Settlement error:', err);
      return { success: false, error: err.message };
    }
  }

  return { drivers, loading, settleAmount, refresh: fetchDriverFinances };
}
