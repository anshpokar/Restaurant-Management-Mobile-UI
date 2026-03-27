import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Card } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { Package, MapPin, Phone, Navigation, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { MapView } from '../../components/map/MapView';
import { OrderAssignmentPopup } from '../../components/delivery/OrderAssignmentPopup';
import { useDriver } from '../../hooks/useDriver';
import { toast } from 'sonner';

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
  restaurant_latitude?: number;
  restaurant_longitude?: number;
  delivery_instructions?: string;
  assigned_at: string;
  otp?: string;
}

export function DeliveryTasksScreen() {
  const [activeOrders, setActiveOrders] = useState<DeliveryOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  
  // OTP Verification State
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // GPS Tracking
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const watchId = useRef<number | null>(null);

  const { 
    pendingAssignment, 
    acceptOrder, 
    pickUpOrder,
    rejectOrder, 
    timeoutOrder 
  } = useDriver();

  const [routePolyline, setRoutePolyline] = useState<[number, number][] | undefined>(undefined);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'cash' | 'upi' | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadDeliveryProfile();
    loadAssignedOrders();
    startGPSTracking();
    
    const channel = supabase.channel('delivery_tasks_updates')
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
    if (!navigator.geolocation) return;
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);

    watchId.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation([lat, lng]);
        await updateLocationInDatabase(lat, lng);
      },
      (error) => console.error('GPS Error:', error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  function stopGPSTracking() {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }

  async function updateLocationInDatabase(lat: number, lng: number) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update location and history
      await Promise.all([
        supabase.from('profiles').update({
          current_latitude: lat,
          current_longitude: lng,
          last_location_update: new Date().toISOString()
        }).eq('id', user.id),
        
        // Only insert to history if there are active orders
        activeOrders.length > 0 ? supabase.from('delivery_locations').insert({
          delivery_person_id: user.id,
          order_id: activeOrders[0].id,
          latitude: lat,
          longitude: lng
        }) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }

  useEffect(() => {
    if (activeOrders.length > 0 && currentLocation) {
      const order = activeOrders[0];
      if (order.delivery_status === 'picked' || order.delivery_status === 'out_for_delivery') {
        const destLat = order.delivery_latitude;
        const destLng = order.delivery_longitude;
        
        if (destLat && destLng && (destLat !== 0 || destLng !== 0)) {
          fetchRoute(currentLocation, [destLat, destLng]);
        }
      } else {
        setRoutePolyline(undefined);
      }
    }
  }, [activeOrders, currentLocation]);

  async function fetchRoute(start: [number, number], end: [number, number]) {
    try {
      const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQwNTkzNjEzY2JjNzRkZTRiMWYyZjBmNGM2OWQzOTFjIiwiaCI6Im11cm11cjY0In0=";
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`,
        {
          headers: {
            'Authorization': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`ORS API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const coords = data.features[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        setRoutePolyline(coords);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  }

  async function loadDeliveryProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('is_available, is_on_duty')
        .eq('id', user.id)
        .single();

      if (data) {
        setIsAvailable(data.is_available ?? true);
        setIsOnDuty(data.is_on_duty ?? false);
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

      const { data: activeData } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_person_id', user.id)
        .in('delivery_status', ['assigned', 'picked', 'out_for_delivery'])
        .eq('assignment_status', 'accepted')
        .order('assigned_at', { ascending: false });

      const { data: completedData } = await supabase
        .from('orders')
        .select('*')
        .eq('delivery_person_id', user.id)
        .eq('delivery_status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(5);

      setActiveOrders(activeData || []);
      setCompletedOrders(completedData || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAvailability() {
    const newStatus = !isAvailable;
    const { error } = await supabase.from('profiles').update({ is_available: newStatus }).eq('id', (await supabase.auth.getUser()).data.user?.id);
    if (!error) setIsAvailable(newStatus);
  }

  async function toggleDuty() {
    const newStatus = !isOnDuty;
    const { error } = await supabase.from('profiles').update({ is_on_duty: newStatus }).eq('id', (await supabase.auth.getUser()).data.user?.id);
    if (!error) setIsOnDuty(newStatus);
  }

  async function handleOutForDelivery(orderId: string) {
    // Optimistic Update
    const previousOrders = [...activeOrders];
    setActiveOrders(current => 
      current.map(o => o.id === orderId ? { ...o, delivery_status: 'out_for_delivery' } : o)
    );
    
    setUpdatingStatus(orderId);
    try {
      const { error } = await supabase.from('orders').update({
        delivery_status: 'out_for_delivery'
      }).eq('id', orderId);
      
      if (error) throw error;
      toast.success('Order is now out for delivery!');
      // Note: No need to loadAssignedOrders here as the optimistic update already handled it,
      // and the real-time subscription will confirm it eventually.
    } catch (error) {
      console.error('Error updating status:', error);
      setActiveOrders(previousOrders); // Revert on error
      toast.error('Failed to update status');
    }
    setUpdatingStatus(null);
  }

  const handlePickUp = async (orderId: string) => {
    // Optimistic Update
    const previousOrders = [...activeOrders];
    setActiveOrders(current => 
      current.map(o => o.id === orderId ? { ...o, delivery_status: 'picked' } : o)
    );

    setUpdatingStatus(orderId);
    try {
      await pickUpOrder(orderId); // Call the hook function
    } catch {
      setActiveOrders(previousOrders); // Revert on error
    }
    setUpdatingStatus(null);
  };

  async function handleVerifyAndDeliver(orderId: string, correctOtp: string) {
    if (otpInput !== correctOtp) {
      toast.error('Invalid OTP. Please check with the customer.');
      return;
    }

    const order = activeOrders.find(o => o.id === orderId);
    if (!order) return;

    if (order.payment_method === 'cod' && order.payment_status !== 'paid') {
      setShowPaymentModal(true);
      return;
    }

    await completeDelivery(orderId);
  }

  async function completeDelivery(orderId: string, paymentMethodUsed?: string) {
    setUpdatingStatus(orderId);
    try {
      const { error } = await supabase.from('orders').update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        payment_status: 'paid',
        payment_method: paymentMethodUsed || activeOrders.find(o => o.id === orderId)?.payment_method,
        otp: null
      }).eq('id', orderId);

      if (error) throw error;
      
      toast.success('Delivery completed! ₹30 added to your earnings.');
      setVerifyingOrder(null);
      setShowPaymentModal(false);
      setOtpInput('');
      loadAssignedOrders();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(null);
    }
  }

  if (loading) {
    return (
      <MobileContainer>
        <AppHeader title="My Deliveries" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <AppHeader title="My Deliveries" />
      
      <div className="relative h-[calc(100vh-64px)] w-full overflow-hidden">
        {/* Full Screen Map Background */}
        <div className="absolute inset-0 z-0">
          <MapView 
            center={currentLocation || [28.6139, 77.2090]}
            zoom={15}
            driverLocation={currentLocation || undefined}
            customerLocation={activeOrders[0]?.delivery_latitude && activeOrders[0]?.delivery_longitude ? [activeOrders[0].delivery_latitude, activeOrders[0].delivery_longitude] : undefined}
            restaurantLocation={activeOrders[0]?.restaurant_latitude && activeOrders[0]?.restaurant_longitude ? [activeOrders[0].restaurant_latitude, activeOrders[0].restaurant_longitude] : undefined}
            routePolyline={routePolyline}
            className="h-full w-full"
          />
        </div>

        {/* Top Overlay: Rider Dashboard Mini */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <Card className="bg-white/90 backdrop-blur-md shadow-xl border-0 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isOnDuty ? (isAvailable ? 'bg-green-500 animate-pulse' : 'bg-blue-500') : 'bg-gray-400'}`} />
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Rider Status</p>
                <p className="font-bold text-sm">
                  {isOnDuty ? (isAvailable ? 'Available' : 'On Order') : 'Off Duty'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={isOnDuty ? "primary" : "outline"} onClick={toggleDuty} className="h-8 text-[10px] font-bold px-3">
                {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
              </Button>
            </div>
          </Card>
        </div>

        {/* Bottom Overlay: Active Task Card */}
        <div className="absolute bottom-6 left-4 right-4 z-10">
          {activeOrders.length === 0 ? (
            <Card className="bg-white/95 backdrop-blur-md p-6 text-center shadow-2xl border-0">
              <Package className="w-10 h-10 text-muted/30 mx-auto mb-2" />
              <h3 className="font-black text-lg">Waiting for Orders</h3>
              <p className="text-xs text-muted-foreground">Stay in this area for faster assignments</p>
              {!isOnDuty && (
                <Button className="mt-4 w-full" onClick={toggleDuty}>Go On Duty</Button>
              )}
            </Card>
          ) : (
            activeOrders.map((order) => (
              <motion.div 
                key={order.id}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="space-y-3"
              >
                <Card className="bg-white/95 backdrop-blur-md shadow-2xl border-0 overflow-hidden">
                  <div className={`h-1.5 w-full ${
                    order.delivery_status === 'assigned' ? 'bg-blue-500' :
                    order.delivery_status === 'picked' ? 'bg-orange-500' : 'bg-green-500'
                  }`} />
                  
                  <div className="p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Active</span>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">#{order.order_number}</p>
                        </div>
                        <h4 className="font-black text-xl mt-1">{order.customer_name}</h4>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="rounded-full w-10 h-10 p-0" onClick={() => window.open(`tel:${order.customer_phone}`)}>
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full w-10 h-10 p-0" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`)}>
                          <Navigation className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-muted/20 p-3 rounded-2xl">
                      <MapPin className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Delivery Address</p>
                        <p className="text-sm font-bold leading-tight mt-0.5">{order.delivery_address}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Collection</p>
                          <p className="font-black text-lg">₹{order.total_amount}</p>
                        </div>
                        <div className="w-px h-8 bg-divider" />
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Method</p>
                          <p className="text-xs font-bold uppercase text-primary">{order.payment_method}</p>
                        </div>
                      </div>
                      
                      {order.delivery_status === 'assigned' && (
                        <Button className="bg-blue-600 hover:bg-blue-700 font-black text-xs px-6" onClick={() => handlePickUp(order.id)} disabled={updatingStatus === order.id}>
                          PICK UP
                        </Button>
                      )}
                      {order.delivery_status === 'picked' && (
                        <Button className="bg-orange-600 hover:bg-orange-700 font-black text-xs px-6" onClick={() => handleOutForDelivery(order.id)} disabled={updatingStatus === order.id}>
                          START RUN
                        </Button>
                      )}
                      {order.delivery_status === 'out_for_delivery' && (
                        <Button className="bg-green-600 hover:bg-green-700 font-black text-xs px-6" 
                          onClick={() => {
                            setVerifyingOrder(order.id);
                            setOtpInput('');
                          }}>
                          REACHED
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Assignment Popup */}
      {pendingAssignment && (
        <OrderAssignmentPopup
          order={pendingAssignment}
          onAccept={acceptOrder}
          onReject={rejectOrder}
          onTimeout={timeoutOrder}
        />
      )}

      {/* OTP Verification Modal */}
      {verifyingOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Card className="w-full max-w-sm p-6 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-black">Verify Delivery</h3>
                <p className="text-sm text-muted-foreground">Ask the customer for the 4-digit OTP sent to their phone.</p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full h-16 text-center text-4xl font-black tracking-[1em] border-2 border-divider rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                  placeholder="0000"
                  autoFocus
                />

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setVerifyingOrder(null)}>Cancel</Button>
                  <Button 
                    className="flex-2" 
                    onClick={() => handleVerifyAndDeliver(verifyingOrder, activeOrders.find(o => o.id === verifyingOrder)?.otp || '1111')} // Fallback to 1111 for testing if OTP not set
                    disabled={otpInput.length < 4 || updatingStatus === verifyingOrder}
                  >
                    Complete Delivery
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Payment Selection Modal (for COD) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <Card className="w-full max-w-sm p-6 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-orange-600">Payment Collection</h3>
                <p className="text-sm text-muted-foreground">Select how the customer paid the amount of <b>₹{activeOrders.find(o => o.id === verifyingOrder)?.total_amount}</b></p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant={selectedPaymentMethod === 'cash' ? 'primary' : 'outline'}
                  className="h-24 flex-col gap-2"
                  onClick={() => setSelectedPaymentMethod('cash')}
                >
                  <span className="text-2xl">💵</span>
                  <span className="font-bold">Cash</span>
                </Button>
                <Button 
                  variant={selectedPaymentMethod === 'upi' ? 'primary' : 'outline'}
                  className="h-24 flex-col gap-2"
                  onClick={() => setSelectedPaymentMethod('upi')}
                >
                  <span className="text-2xl">💳</span>
                  <span className="font-bold">UPI / Cards</span>
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                <Button 
                  className="flex-2 bg-green-600 hover:bg-green-700" 
                  disabled={!selectedPaymentMethod || updatingStatus !== null}
                  onClick={() => completeDelivery(verifyingOrder!, selectedPaymentMethod === 'cash' ? 'cash' : 'upi')}
                >
                  Confirm & Deliver
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </MobileContainer>
  );
}
