import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadScript, GoogleMap, Marker } from '@react-google-maps/api';
import { supabase } from '../../lib/supabase';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Card } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { Package, MapPin, Phone, Navigation, Clock, DollarSign, CheckCircle, XCircle, AlertCircle, Crosshair } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const mapContainerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '8px'
};

const defaultCenter = {
  lat: 28.6139, // Connaught Place, New Delhi
  lng: 77.2090
};

interface DeliveryOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address: string;
  delivery_pincode: string;
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  delivery_status: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_instructions?: string;
  assigned_at: string;
}

export function DeliveryTasksScreen() {
  const navigate = useNavigate();
  const [activeOrders, setActiveOrders] = useState<DeliveryOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // GPS Tracking
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timeout | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    loadDeliveryProfile();
    loadAssignedOrders();
    
    // Start GPS tracking when component mounts
    startGPSTracking();
    
    // Real-time updates
    const channel = supabase.channel('delivery_tasks')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadAssignedOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopGPSTracking();
    };
  }, []);

  async function startGPSTracking() {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    // Clear any existing tracking
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    // Watch position and update every 10 seconds
    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        const speed = position.coords.speed;
        
        setCurrentLocation({ lat, lng });
        
        // Update location in database
        await updateLocationInDatabase(lat, lng, accuracy, speed);
      },
      (error) => {
        console.error('GPS Error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  function stopGPSTracking() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
  }

  async function updateLocationInDatabase(
    lat: number, 
    lng: number, 
    accuracy?: number, 
    speed?: number | null
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update current location in profiles
      await supabase.rpc('update_delivery_location', {
        p_delivery_person_id: user.id,
        p_latitude: lat,
        p_longitude: lng,
        p_accuracy: accuracy || null,
        p_speed: speed ? (speed * 3.6) : null // Convert m/s to km/h
      });
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  async function loadDeliveryProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load from delivery_personnel table
      const { data, error } = await supabase
        .from('delivery_personnel')
        .select('is_available, is_on_duty')
        .eq('profile_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      
      if (data) {
        setIsAvailable(data.is_available ?? true);
        setIsOnDuty(data.is_on_duty ?? false);
      } else {
        // Create initial record if doesn't exist
        await supabase.rpc('update_delivery_person_status', {
          p_is_available: true,
          p_is_on_duty: false
        });
        setIsAvailable(true);
        setIsOnDuty(false);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignedOrders() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get active orders
      const { data: activeData, error: activeError } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_person_id', user.id)
        .in('delivery_status', ['assigned', 'out_for_delivery'])
        .order('assigned_at', { ascending: false });

      if (activeError) throw activeError;

      // Get completed orders
      const { data: completedData, error: completedError } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_person_id', user.id)
        .eq('delivery_status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(10);

      if (completedError) throw completedError;

      setActiveOrders(activeData || []);
      setCompletedOrders(completedData || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newStatus = !isAvailable;
      
      // Use the RPC function to update delivery_personnel
      const { error } = await supabase.rpc('update_delivery_person_status', {
        p_is_available: newStatus,
        p_is_on_duty: isOnDuty
      });

      if (error) throw error;
      
      setIsAvailable(newStatus);
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Failed to update availability status');
    }
  }

  async function toggleDuty() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newStatus = !isOnDuty;
      
      // Use the RPC function to update delivery_personnel
      const { error } = await supabase.rpc('update_delivery_person_status', {
        p_is_available: isAvailable,
        p_is_on_duty: newStatus
      });

      if (error) throw error;
      
      setIsOnDuty(newStatus);
    } catch (error) {
      console.error('Error toggling duty:', error);
      alert('Failed to update duty status');
    }
  }

  async function handlePickup(orderId: string) {
    if (!confirm('Confirm that you have picked up this order?')) return;

    try {
      setUpdatingStatus(orderId);
      
      const { error } = await supabase.from('orders').update({
        delivery_status: 'out_for_delivery',
        picked_up_at: new Date().toISOString()
      }).eq('id', orderId);

      if (error) throw error;
      
      alert('Order picked up! Navigate to customer location.');
      await loadAssignedOrders();
    } catch (error) {
      console.error('Error updating pickup:', error);
      alert('Failed to update status.');
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleDeliver(orderId: string, paymentMethod: string, amount: number) {
    // Payment confirmation
    let paymentConfirmed = false;
    
    if (paymentMethod === 'cod' || paymentMethod === 'upi') {
      const confirmed = confirm(`Collect ₹${amount} from customer. Mark as paid after collection?`);
      paymentConfirmed = confirmed;
    } else {
      paymentConfirmed = true; // Prepaid
    }

    if (!paymentConfirmed) return;

    try {
      setUpdatingStatus(orderId);
      
      const { error } = await supabase.from('orders').update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        payment_status: 'paid',
        paid_at: new Date().toISOString()
      }).eq('id', orderId);

      if (error) throw error;
      
      alert('Delivery completed successfully!');
      await loadAssignedOrders();
    } catch (error) {
      console.error('Error marking delivery:', error);
      alert('Failed to mark as delivered.');
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function handleRejectOrder(orderId: string) {
    const reason = prompt('Please enter reason for rejection:');
    if (!reason) return;

    try {
      setUpdatingStatus(orderId);
      
      // Update order status
      const { error } = await supabase.from('orders').update({
        delivery_status: 'pending',
        delivery_person_id: null,
        assigned_at: null
      }).eq('id', orderId);

      if (error) throw error;

      // Record rejection
      const { error: rejectError } = await supabase.from('delivery_rejections').insert({
        order_id: orderId,
        reason: reason,
        delivery_person_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (rejectError) throw rejectError;
      
      alert('Order rejected. Admin will reassign.');
      await loadAssignedOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('Failed to reject order.');
    } finally {
      setUpdatingStatus(null);
    }
  }

  function openNavigation(latitude?: number, longitude?: number) {
    if (!latitude || !longitude) {
      alert('Coordinates not available for this address.');
      return;
    }
    
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  }

  function callCustomer(phone?: string) {
    if (!phone) {
      alert('Customer phone number not available.');
      return;
    }
    
    window.location.href = `tel:${phone}`;
  }

  if (loading) {
    return (
      <MobileContainer>
        <AppHeader title="My Deliveries" />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading your tasks...</p>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <AppHeader title="My Deliveries" />
      
      <div className="p-4 space-y-4 pb-24">
        {/* Status Toggle */}
        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90">Current Status</p>
              <p className="text-lg font-bold">
                {isAvailable && isOnDuty ? 'Available & On Duty' : 'Unavailable'}
              </p>
            </div>
            <Package className="w-8 h-8 opacity-75" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={isAvailable ? 'secondary' : 'outline'}
              size="sm"
              onClick={toggleAvailability}
              className={isAvailable ? 'bg-white text-orange-600' : 'border-white text-white hover:bg-white/10'}
            >
              {isAvailable ? '✓ Available' : '○ Unavailable'}
            </Button>
            <Button
              variant={isOnDuty ? 'secondary' : 'outline'}
              size="sm"
              onClick={toggleDuty}
              className={isOnDuty ? 'bg-white text-orange-600' : 'border-white text-white hover:bg-white/10'}
            >
              {isOnDuty ? '✓ On Duty' : '○ Off Duty'}
            </Button>
          </div>
        </Card>

        {/* Live GPS Tracking Map */}
        {activeOrders.length > 0 && (
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-4 pt-4">
              <h3 className="font-semibold text-gray-900">Your Location</h3>
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live Tracking
              </span>
            </div>
            
            <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={currentLocation || defaultCenter}
                zoom={15}
              >
                {currentLocation && (
                  <Marker
                    position={currentLocation}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      scaledSize: { width: 32, height: 32 } as any
                    }}
                  />
                )}
              </GoogleMap>
            </LoadScript>
            
            <div className="px-4 py-3 bg-gray-50">
              <p className="text-sm text-gray-600">
                {currentLocation 
                  ? `Last updated: ${new Date().toLocaleTimeString()}`
                  : 'Getting your location...'}
              </p>
            </div>
          </Card>
        )}

        {/* Active Orders */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Deliveries ({activeOrders.length})</h2>
          
          {activeOrders.length === 0 ? (
            <Card className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-gray-600">No active deliveries right now.</p>
              <p className="text-sm text-gray-500 mt-1">Stay available to receive new orders!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeOrders.map((order) => (
                <Card key={order.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">#{order.order_number}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          order.delivery_status === 'assigned' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {order.delivery_status === 'assigned' ? 'To Pickup' : 'Out for Delivery'}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{order.delivery_address}, {order.delivery_pincode}</span>
                        </div>
                        
                        {order.delivery_instructions && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{order.delivery_instructions}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-sm">
                      <p className="text-gray-600">Amount</p>
                      <p className="font-bold text-gray-900">₹{order.total_amount}</p>
                      <p className="text-xs text-gray-500">
                        {order.payment_method === 'cod' ? 'Cash' : order.payment_method === 'upi' ? 'UPI' : 'Prepaid'}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      {order.delivery_status === 'assigned' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handlePickup(order.id)}
                            disabled={updatingStatus === order.id}
                          >
                            Confirm Pickup
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectOrder(order.id)}
                            disabled={updatingStatus === order.id}
                            className="text-red-600"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {order.delivery_status === 'out_for_delivery' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDeliver(order.id, order.payment_method || 'cod', order.total_amount)}
                          disabled={updatingStatus === order.id}
                        >
                          Complete Delivery
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openNavigation(order.delivery_latitude, order.delivery_longitude)}
                      className="flex-1"
                    >
                      <Navigation className="w-4 h-4 mr-1" />
                      Navigate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => callCustomer(order.customer_phone)}
                      className="flex-1"
                    >
                      <Phone className="w-4 h-4 mr-1" />
                      Call
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Orders */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Completed</h2>
          
          {completedOrders.length === 0 ? (
            <Card className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No completed deliveries yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {completedOrders.map((order) => (
                <Card key={order.id} className="py-3 opacity-75">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">#{order.order_number}</p>
                      <p className="text-sm text-gray-500">{order.delivery_address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">₹{order.total_amount}</p>
                      <p className="text-xs text-gray-400">Delivered</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileContainer>
  );
}
