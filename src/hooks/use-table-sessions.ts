import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface TableSession {
  id: string;
  table_id: string;
  user_id?: string;
  session_name?: string;
  started_at: string;
  completed_at?: string;
  total_amount: number;
  paid_amount: number;
  payment_status: 'pending' | 'paid' | 'partial';
  session_status: 'active' | 'pending' | 'completed';
  created_at: string;
  updated_at: string;
  // Joined data
  table_number?: number;
  table_capacity?: number;
}

export function useTableSessions(tableId?: string) {
  const [sessions, setSessions] = useState<TableSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    
    // Set up real-time subscription for dine_in_sessions
    const channel = supabase
      .channel('dine-in-sessions')
      .on('postgres_changes' as any, 
        { event: '*', table: 'dine_in_sessions' },
        () => {
          fetchSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableId]);

  async function fetchSessions() {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('dine_in_sessions')
        .select(`
          *,
          restaurant_tables (
            table_number,
            capacity
          )
        `)
        .order('started_at', { ascending: false });

      if (tableId) {
        query = query.eq('table_id', tableId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data
      const transformed = (data || []).map(session => ({
        ...session,
        table_number: (session.restaurant_tables as any)?.table_number,
        table_capacity: (session.restaurant_tables as any)?.capacity
      })) as TableSession[];

      setSessions(transformed);
    } catch (err: any) {
      console.error('Error fetching table sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createSession(data: {
    table_id: string;
    user_id?: string;
    session_name: string;
  }) {
    try {
      const { data: newSession, error } = await supabase
        .from('dine_in_sessions')
        .insert({
          table_id: data.table_id,
          user_id: data.user_id || null,
          session_name: data.session_name,
          session_status: 'active',
          payment_status: 'pending',
          total_amount: 0,
          paid_amount: 0,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      await fetchSessions();
      return newSession;
    } catch (err: any) {
      console.error('Error creating session:', err);
      throw err;
    }
  }

  async function updateSession(sessionId: string, updates: Partial<TableSession>) {
    try {
      const { error } = await supabase
        .from('dine_in_sessions')
        .update(updates)
        .eq('id', sessionId);

      if (error) throw error;
      await fetchSessions();
    } catch (err: any) {
      console.error('Error updating session:', err);
      throw err;
    }
  }

  async function endSession(sessionId: string) {
    try {
      const { error } = await supabase
        .from('dine_in_sessions')
        .update({
          session_status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
      await fetchSessions();
    } catch (err: any) {
      console.error('Error ending session:', err);
      throw err;
    }
  }

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    endSession,
    refetch: fetchSessions,
  };
}

// Helper function to get active session for a specific table
export async function getActiveSessionForTable(tableId: string): Promise<TableSession | null> {
  try {
    const { data, error } = await supabase
      .from('dine_in_sessions')
      .select('*')
      .eq('table_id', tableId)
      .eq('session_status', 'active')
      .maybeSingle();

    if (error) return null;
    return data as TableSession;
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
}

// Helper function to get all active sessions
export async function getAllActiveSessions(): Promise<TableSession[]> {
  try {
    const { data, error } = await supabase
      .from('dine_in_sessions')
      .select(`
        *,
        restaurant_tables (
          table_number,
          capacity
        )
      `)
      .eq('session_status', 'active')
      .order('started_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(session => ({
      ...session,
      table_number: (session.restaurant_tables as any)?.table_number,
      table_capacity: (session.restaurant_tables as any)?.capacity
    })) as TableSession[];
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return [];
  }
}
