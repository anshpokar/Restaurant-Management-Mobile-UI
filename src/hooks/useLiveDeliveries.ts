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
        // Update both active orders and available drivers in state
        setActiveOrders(prev => prev.map(order => 
          order.delivery_person_id === payload.new.id 
            ? { ...order, driver_lat: payload.new.current_latitude, driver_lng: payload.new.current_longitude }
            : order
        ));
      })
      .subscribe();

    const trackingChannel = supabase.channel('admin_tracking_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_locations' }, (payload) => {
        // High frequency updates for active deliveries
        setActiveOrders(prev => prev.map(order => 
          order.delivery_person_id === payload.new.delivery_person_id 
            ? { ...order, driver_lat: payload.new.latitude, driver_lng: payload.new.longitude }
            : order
        ));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(trackingChannel);
    };
  }, []);

  async function fetchActiveOrders() {
    try {
      // 1. Fetch Active Orders
      const { data: orders, error: ordersError } = await supabase
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
        .in('delivery_status', ['assigned', 'accepted', 'picked', 'out_for_delivery']);

      if (ordersError) throw ordersError;

      // 2. Fetch ALL Online Delivery Partners (Live Radar)
      const { data: drivers, error: driversError } = await supabase
        .from('profiles')
        .select('id, full_name, current_latitude, current_longitude, last_location_update')
        .eq('role', 'delivery')
        .not('current_latitude', 'is', null);

      if (driversError) throw driversError;

      const formatted = orders.map((o: any) => ({
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

      // Find drivers who are online but NOT in active orders to show as 'Available'
      const activeDriverIds = new Set(formatted.map(o => o.delivery_person_id));
      const availableDrivers = drivers
        .filter(d => !activeDriverIds.has(d.id))
        .map(d => ({
          id: `available-${d.id}`,
          order_number: 'AVAILABLE',
          delivery_status: 'available',
          customer_name: 'Waiting for Order',
          delivery_latitude: 0,
          delivery_longitude: 0,
          delivery_person_id: d.id,
          driver_name: d.full_name,
          driver_lat: d.current_latitude,
          driver_lng: d.current_longitude
        } as LiveOrder));

      setActiveOrders([...formatted, ...availableDrivers]);
    } catch (err) {
      console.error('Error fetching live deliveries:', err);
    } finally {
      setLoading(false);
    }
  }

  return { activeOrders, loading, refresh: fetchActiveOrders };
}
