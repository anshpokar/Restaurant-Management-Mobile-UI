import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface PendingOrder {
  id: string;
  order_number: string;
  delivery_address: string;
  total_amount: number;
}

export function useDriver() {
  const [pendingAssignment, setPendingAssignment] = useState<PendingOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Listen for new assignments
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase.channel(`driver_assignments_${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `delivery_person_id=eq.${user.id}`
        }, (payload) => {
          const newOrder = payload.new;
          if (newOrder.assignment_status === 'pending' && newOrder.delivery_status === 'assigned') {
            setPendingAssignment({
              id: newOrder.id,
              order_number: newOrder.order_number || newOrder.id.slice(0, 8),
              delivery_address: newOrder.delivery_address,
              total_amount: newOrder.total_amount
            });
          } else if (newOrder.assignment_status !== 'pending') {
            setPendingAssignment(null);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, []);

  const acceptOrder = useCallback(async (orderId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('orders').update({
        assignment_status: 'accepted',
        delivery_status: 'picked', // Move to picked immediately on acceptance for this flow
        picked_up_at: new Date().toISOString()
      }).eq('id', orderId);

      if (error) throw error;

      // Update driver availability
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').update({ is_available: false }).eq('id', user.id);
      }

      setPendingAssignment(null);
      toast.success('Order accepted! Head to the restaurant.');
    } catch (err: any) {
      toast.error('Failed to accept order: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rejectOrder = useCallback(async (orderId: string, reason: string = 'Driver rejected') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('orders').update({
        assignment_status: 'rejected',
        delivery_status: 'pending',
        delivery_person_id: null,
        assigned_at: null
      }).eq('id', orderId);

      if (error) throw error;

      setPendingAssignment(null);
      toast.info('Order rejected.');
    } catch (err: any) {
      toast.error('Failed to reject order: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const timeoutOrder = useCallback(async (orderId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.from('orders').update({
        assignment_status: 'timeout',
        delivery_status: 'pending',
        delivery_person_id: null,
        assigned_at: null
      }).eq('id', orderId);

      if (error) throw error;

      setPendingAssignment(null);
      toast.info('Assignment timed out.');
    } catch (err: any) {
      toast.error('Failed to update timeout: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    pendingAssignment,
    isLoading,
    acceptOrder,
    rejectOrder,
    timeoutOrder
  };
}
