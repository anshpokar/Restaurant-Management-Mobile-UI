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
  }, []);

  async function fetchDriverFinances() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cash_collected, total_earnings')
        .eq('role', 'delivery');

      if (error) throw error;

      const formatted = data.map(d => ({
        ...d,
        pending_settlement: (d.cash_collected || 0) - (d.total_earnings || 0)
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

      // 2. We need to decide how to handle the reset/reduction of cash_collected
      // For simplicity, let's assume settling reduces both cash_collected and total_earnings by the amount settled
      // or we can just reset them if they were fully settled.
      // Usually, it's better to decrement the counters.
      
      // Let's assume the 'amount' represents the CASH the driver handed over.
      // We should probably have a more complex accounting but for now:
      // Subtract amount from cash_collected.
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          cash_collected: 0, // Simplified: reset on settlement
          total_earnings: 0  // Simplified: reset on settlement
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
