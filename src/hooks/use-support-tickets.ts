import { useState, useEffect } from 'react';
import { supabase, type SupportTicket, getStoredUser } from '@/lib/supabase';

export function useSupportTickets(userId: string | null) {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(false);

    // Get userId from stored data if not provided
    const effectiveUserId = userId || getStoredUser()?.id || null;

    useEffect(() => {
        if (effectiveUserId) {
            fetchTickets();
        }
    }, [effectiveUserId]);

    const fetchTickets = async () => {
        if (!effectiveUserId) return;
        
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('user_id', effectiveUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTickets(data || []);
        } catch (error) {
            console.error('Error fetching support tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const createTicket = async (ticket: Omit<SupportTicket, 'id' | 'created_at' | 'updated_at'>) => {
        if (!effectiveUserId) return;

        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .insert([{ ...ticket, user_id: effectiveUserId }])
                .select()
                .single();

            if (error) throw error;
            setTickets(prev => [data!, ...prev]);
            return data;
        } catch (error) {
            console.error('Error creating support ticket:', error);
            throw error;
        }
    };

    const updateTicket = async (ticketId: string, updates: Partial<SupportTicket>) => {
        try {
            const { data, error } = await supabase
                .from('support_tickets')
                .update(updates)
                .eq('id', ticketId)
                .select()
                .single();

            if (error) throw error;
            setTickets(prev => prev.map(t => t.id === ticketId ? data! : t));
            return data;
        } catch (error) {
            console.error('Error updating ticket:', error);
            throw error;
        }
    };

    return {
        tickets,
        loading,
        fetchTickets,
        createTicket,
        updateTicket
    };
}
