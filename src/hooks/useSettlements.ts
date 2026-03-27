import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DriverFinance {
  id: string;
  full_name: string;
  cash_collected: number;
  total_earnings: number;
  pending_settlement: number; // (cash - earnings) if positive
}

export interface Settlement {
  id: string;
  driver_id: string;
  admin_id: string;
  type: 'cash_collection' | 'earnings_payout';
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  notes: string;
  created_at: string;
  confirmed_at?: string;
}

export function useSettlements() {
  const [drivers, setDrivers] = useState<DriverFinance[]>([]);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriverFinances();
    fetchSettlementHistory();

    const profileChannel = supabase.channel('driver-finance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchDriverFinances();
      })
      .subscribe();

    const settlementChannel = supabase.channel('settlements-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, () => {
        fetchSettlementHistory();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(settlementChannel);
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

  async function fetchSettlementHistory() {
    try {
      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }

  // Admin initiates a settlement (Cash hand-over or Driver Payout)
  async function initiateSettlement(driverId: string, type: 'cash_collection' | 'earnings_payout', amount: number, notes: string = '') {
    try {
      const { data, error } = await supabase.rpc('initiate_settlement', {
        p_driver_id: driverId,
        p_type: type,
        p_amount: amount,
        p_notes: notes
      });

      if (error) throw error;
      
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result && result.success === false) throw new Error(result.error);

      await fetchSettlementHistory();
      return { success: true };
    } catch (err: any) {
      console.error('Initiate error:', err);
      return { success: false, error: err.message };
    }
  }

  // Driver confirms the settlement (This is when balances actually move)
  async function confirmSettlement(settlementId: string) {
    try {
      const { data, error } = await supabase.rpc('confirm_settlement', {
        p_settlement_id: settlementId
      });

      if (error) throw error;
      
      const result = typeof data === 'string' ? JSON.parse(data) : data;
      if (result && result.success === false) throw new Error(result.error);

      await Promise.all([fetchDriverFinances(), fetchSettlementHistory()]);
      return { success: true };
    } catch (err: any) {
      console.error('Confirm error:', err);
      return { success: false, error: err.message };
    }
  }

  return { 
    drivers, 
    history,
    loading, 
    initiateSettlement, 
    confirmSettlement, 
    refresh: fetchDriverFinances 
  };
}
