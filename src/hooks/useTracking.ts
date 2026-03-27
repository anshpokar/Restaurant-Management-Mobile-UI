import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Location {
  lat: number;
  lng: number;
}

export function useTracking(orderId?: string) {
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [history, setHistory] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // 1. Fetch initial location and history
    async function fetchInitialLocation() {
      try {
        const { data: order } = await supabase
          .from('orders')
          .select('delivery_person_id')
          .eq('id', orderId)
          .single();

        if (order?.delivery_person_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('current_latitude, current_longitude')
            .eq('id', order.delivery_person_id)
            .single();

          if (profile?.current_latitude && profile?.current_longitude) {
            setDriverLocation({
              lat: profile.current_latitude,
              lng: profile.current_longitude
            });
          }

          // Fetch recent history for polyline
          const { data: locations } = await supabase
            .from('delivery_locations')
            .select('latitude, longitude')
            .eq('order_id', orderId)
            .order('created_at', { ascending: true })
            .limit(100);

          if (locations) {
            setHistory(locations.map(l => ({ lat: l.latitude, lng: l.longitude })));
          }
        }
      } catch (err) {
        console.error('Error fetching initial location:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialLocation();

    // 2. Subscribe to real-time updates
    const channel = supabase
      .channel(`tracking:${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'delivery_locations',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        const newLoc = {
          lat: payload.new.latitude,
          lng: payload.new.longitude
        };
        setDriverLocation(newLoc);
        setHistory(prev => [...prev.slice(-99), newLoc]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return { driverLocation, history, loading };
}
