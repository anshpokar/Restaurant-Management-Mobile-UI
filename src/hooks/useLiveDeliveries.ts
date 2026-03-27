import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface LiveOrder {
  id: string;
  order_number: string;
  delivery_status: string;
  customer_name: string;
  delivery_latitude: number;
  delivery_longitude: number;
  delivery_person_id: string;
  driver_name?: string;
  driver_lat?: number;
  driver_lng?: number;
}

export function useLiveDeliveries() {
  const [activeOrders, setActiveOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveOrders();

    // Subscribe to both orders and profiles (for driver location updates)
    const ordersChannel = supabase.channel('admin_live_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchActiveOrders)
      .subscribe();

    const locationChannel = supabase.channel('admin_driver_locations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        setActiveOrders(prev => prev.map(order => 
          order.delivery_person_id === payload.new.id 
            ? { ...order, driver_lat: payload.new.current_latitude, driver_lng: payload.new.current_longitude }
            : order
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(locationChannel);
    };
  }, []);

  async function fetchActiveOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, delivery_status, customer_name,
          delivery_latitude, delivery_longitude, delivery_person_id,
          delivery_person:profiles (
            full_name,
            current_latitude,
            current_longitude
          )
        `)
        .in('delivery_status', ['assigned', 'picked', 'out_for_delivery']);

      if (error) throw error;

      const formatted = data.map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        delivery_status: o.delivery_status,
        customer_name: o.customer_name,
        delivery_latitude: o.delivery_latitude,
        delivery_longitude: o.delivery_longitude,
        delivery_person_id: o.delivery_person_id,
        driver_name: o.delivery_person?.full_name,
        driver_lat: o.delivery_person?.current_latitude,
        driver_lng: o.delivery_person?.current_longitude
      }));

      setActiveOrders(formatted);
    } catch (err) {
      console.error('Error fetching live deliveries:', err);
    } finally {
      setLoading(false);
    }
  }

  return { activeOrders, loading, refresh: fetchActiveOrders };
}
