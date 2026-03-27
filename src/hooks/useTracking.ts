import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Location {
  lat: number;
  lng: number;
}

export function useTracking(orderId?: string) {
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [history, setHistory] = useState<Location[]>([]);
  const [routePolyline, setRoutePolyline] = useState<[number, number][] | undefined>(undefined);
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

  useEffect(() => {
    if (driverLocation && !loading) {
      fetchRoute();
    }
  }, [driverLocation, loading]);

  async function fetchRoute() {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('delivery_latitude, delivery_longitude')
        .eq('id', orderId)
        .single();

      if (order?.delivery_latitude && driverLocation) {
        const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQwNTkzNjEzY2JjNzRkZTRiMWYyZjBmNGM2OWQzOTFjIiwiaCI6Im11cm11cjY0In0=";
        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${driverLocation.lng},${driverLocation.lat}&end=${order.delivery_longitude},${order.delivery_latitude}`
        );
        const data = await response.json();
        if (data.features && data.features[0]) {
          const coords = data.features[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
          setRoutePolyline(coords);
        }
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  }

  return { driverLocation, history, routePolyline, loading };
}
