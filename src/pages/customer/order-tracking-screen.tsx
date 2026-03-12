import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadScript, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { supabase } from '../../lib/supabase';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Card } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { 
  MapPin, Navigation, Phone, MessageCircle, Clock, 
  Package, CheckCircle, Truck, AlertCircle 
} from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};

interface Order {
  id: string;
  order_number: string;
  status: string;
  delivery_status: string;
  delivery_address: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_pincode?: string;
  estimated_delivery_time?: string;
  total_amount: number;
  created_at: string;
}

interface DeliveryPerson {
  id: string;
  full_name: string;
  phone?: string;
  current_latitude?: number;
  current_longitude?: number;
  rating?: number;
}

export function OrderTrackingScreen() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPerson | null>(null);
  const [riderLocation, setRiderLocation] = useState<{lat: number, lng: number} | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<string>('');

  useEffect(() => {
    fetchOrderDetails();
    
    // Real-time updates for rider location
    const channel = supabase.channel(`order-tracking-${orderId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.new.id === deliveryPerson?.id) {
            updateRiderLocation(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, deliveryPerson]);

  async function fetchOrderDetails() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_person:profiles!inner (
            id,
            full_name,
            phone,
            current_latitude,
            current_longitude,
            rating
          )
        `)
        .eq('id', orderId)
        .eq('user_id', user.id)
        .single();

      if (orderError) throw orderError;

      setOrder(orderData);
      
      if (orderData.delivery_person) {
        const deliveryPersonData = orderData.delivery_person as unknown as DeliveryPerson;
        setDeliveryPerson(deliveryPersonData);
        
        if (deliveryPersonData.current_latitude && deliveryPersonData.current_longitude) {
          updateRiderLocation(deliveryPersonData);
        }
      }

      // Calculate ETA and route
      if (orderData.delivery_latitude && orderData.delivery_longitude && deliveryPerson?.current_latitude && deliveryPerson?.current_longitude) {
        calculateRouteAndETA(
          deliveryPerson.current_latitude,
          deliveryPerson.current_longitude,
          orderData.delivery_latitude,
          orderData.delivery_longitude
        );
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  }

  function updateRiderLocation(profile: any) {
    if (profile.current_latitude && profile.current_longitude) {
      const newLocation = {
        lat: profile.current_latitude,
        lng: profile.current_longitude
      };
      setRiderLocation(newLocation);
      
      // Update route if we have destination
      if (order?.delivery_latitude && order?.delivery_longitude) {
        calculateRouteAndETA(
          newLocation.lat,
          newLocation.lng,
          order.delivery_latitude,
          order.delivery_longitude
        );
      }
    }
  }

  async function calculateRouteAndETA(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number
  ) {
    try {
      const directionsService = new google.maps.DirectionsService();
      
      const result = await directionsService.route({
        origin: { lat: fromLat, lng: fromLng },
        destination: { lat: toLat, lng: toLng },
        travelMode: google.maps.TravelMode.DRIVING
      });

      setDirections(result);
      
      // Calculate ETA
      const duration = result.routes[0].legs[0].duration?.value || 0;
      const arrivalTime = new Date(Date.now() + duration * 1000);
      setEta(arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }

  function callRider() {
    if (deliveryPerson?.phone) {
      window.location.href = `tel:${deliveryPerson.phone}`;
    }
  }

  function messageRider() {
    // Could implement chat feature
    alert('Chat feature coming soon!');
  }

  function getStatusDisplay() {
    if (!order) return null;
    
    const statusMap: Record<string, { icon: any, label: string, color: string }> = {
      'pending': { icon: Clock, label: 'Preparing', color: 'text-yellow-600' },
      'assigned': { icon: Truck, label: 'Rider Assigned', color: 'text-blue-600' },
      'out_for_delivery': { icon: Navigation, label: 'On the Way', color: 'text-purple-600' },
      'delivered': { icon: CheckCircle, label: 'Delivered', color: 'text-green-600' }
    };

    const status = statusMap[order.delivery_status] || statusMap['pending'];
    const Icon = status.icon;

    return (
      <div className={`flex items-center gap-2 ${status.color}`}>
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{status.label}</span>
      </div>
    );
  }

  if (loading) {
    return (
      <MobileContainer>
        <AppHeader title="Track Order" showBack />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading tracking info...</p>
        </div>
      </MobileContainer>
    );
  }

  if (!order) {
    return (
      <MobileContainer>
        <AppHeader title="Track Order" showBack />
        <Card className="m-4 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-600">Order not found</p>
        </Card>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <AppHeader title="Track Order" showBack />
      
      <div className="p-4 space-y-4 pb-24">
        {/* Status Banner */}
        <Card className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">Order #{order.order_number}</h2>
            <Package className="w-6 h-6 opacity-75" />
          </div>
          <p className="text-sm opacity-90 mb-2">{getStatusDisplay()}</p>
          {eta && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>Estimated arrival: {eta}</span>
            </div>
          )}
        </Card>

        {/* Live Map */}
        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={riderLocation || defaultCenter}
            zoom={13}
          >
            {/* Rider Location */}
            {riderLocation && (
              <Marker
                position={riderLocation}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  scaledSize: { width: 40, height: 40 } as any
                }}
                label="🛵"
              />
            )}

            {/* Delivery Destination */}
            {order.delivery_latitude && order.delivery_longitude && (
              <Marker
                position={{ lat: order.delivery_latitude, lng: order.delivery_longitude }}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                  scaledSize: { width: 40, height: 40 } as any
                }}
                label="🏠"
              />
            )}

            {/* Route polyline */}
            {directions && <DirectionsRenderer directions={directions} />}
          </GoogleMap>
        </LoadScript>

        {/* Rider Info */}
        {deliveryPerson && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{deliveryPerson.full_name}</h3>
                  <p className="text-sm text-gray-500">Your Delivery Partner</p>
                  {deliveryPerson.rating && (
                    <p className="text-xs text-yellow-600">⭐ {deliveryPerson.rating}/5.0</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={callRider}
                className="flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Call
              </Button>
              <Button
                variant="outline"
                onClick={messageRider}
                className="flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </Button>
            </div>
          </Card>
        )}

        {/* Delivery Address */}
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">Delivery Address</h3>
              <p className="text-sm text-gray-600">{order.delivery_address}</p>
              {order.delivery_pincode && (
                <p className="text-sm text-gray-600">PIN: {order.delivery_pincode}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Order Summary */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number</span>
              <span className="font-medium">#{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Time</span>
              <span className="font-medium">
                {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-gray-600 font-medium">Total Amount</span>
              <span className="font-bold text-green-600">₹{order.total_amount}</span>
            </div>
          </div>
        </Card>

        {/* Help Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/customer/help-support')}
        >
          Need Help?
        </Button>
      </div>
    </MobileContainer>
  );
}
