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
        const dest: [number, number] = [order.delivery_latitude!, order.delivery_longitude!];
        fetchRoute(currentLocation, dest);
      } else {
        setRoutePolyline(undefined);
      }
    }
  }, [activeOrders, currentLocation]);

  async function fetchRoute(start: [number, number], end: [number, number]) {
    try {
      const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjQwNTkzNjEzY2JjNzRkZTRiMWYyZjBmNGM2OWQzOTFjIiwiaCI6Im11cm11cjY0In0=";
      const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`
      );
      const data = await response.json();
      if (data.features && data.features[0]) {
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
    setUpdatingStatus(orderId);
    const { error } = await supabase.from('orders').update({
      delivery_status: 'out_for_delivery'
    }).eq('id', orderId);
    
    if (!error) {
      toast.success('Order is now out for delivery!');
      loadAssignedOrders();
    }
    setUpdatingStatus(null);
  }

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
        payment_method: paymentMethodUsed || activeOrders.find(o => o.id === orderId)?.payment_method
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
      
      <div className="p-4 space-y-4 pb-32">
        {/* Status Dashboard */}
        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-5 border-0 shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Rider Dashboard</p>
              <h2 className="text-2xl font-black">
                {isOnDuty ? (isAvailable ? 'Available' : 'On Order') : 'Off Duty'}
              </h2>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <div className="mt-6 flex gap-3 relative z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleDuty}
              className={`flex-1 ${isOnDuty ? 'bg-white text-red-600' : 'bg-white/20 text-white border-0'}`}
            >
              {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
            </Button>
            {isOnDuty && (
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleAvailability}
                className={`flex-1 ${isAvailable ? 'bg-white text-green-600' : 'bg-white/20 text-white border-0'}`}
              >
                {isAvailable ? 'Active' : 'Busy'}
              </Button>
            )}
          </div>
          {/* Decorative background circle */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </Card>

        {/* Live Tracking Map */}
        {activeOrders.length > 0 && currentLocation && (
          <Card className="p-0 overflow-hidden border-2 border-divider shadow-md">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-muted-foreground uppercase">Live Tracking</span>
              </div>
              {activeOrders[0].delivery_status === 'out_for_delivery' && (
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Route Active</span>
              )}
            </div>
            <MapView 
              center={currentLocation}
              zoom={15}
              driverLocation={currentLocation}
              customerLocation={activeOrders[0].delivery_latitude && activeOrders[0].delivery_longitude ? [activeOrders[0].delivery_latitude, activeOrders[0].delivery_longitude] : undefined}
              routePolyline={routePolyline}
              className="h-[220px] w-full"
            />
          </Card>
        )}

        {/* Active Orders Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg flex items-center gap-2">
              Active Tasks
              <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full">
                {activeOrders.length}
              </span>
            </h3>
          </div>
          
          {activeOrders.length === 0 ? (
            <Card className="text-center py-10 bg-muted/20 border-dashed border-2">
              <CheckCircle className="w-12 h-12 text-muted/40 mx-auto mb-3" />
              <p className="text-sm font-bold text-muted-foreground">No active orders</p>
              <p className="text-xs text-muted-foreground mt-1">Waiting for assignments...</p>
            </Card>
          ) : (
            activeOrders.map((order) => (
              <Card key={order.id} className="p-0 overflow-hidden border-divider shadow-sm">
                <div className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-tighter">Order #{order.order_number}</p>
                      <h4 className="font-bold text-base mt-0.5">{order.customer_name}</h4>
                    </div>
                    <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      order.delivery_status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                      order.delivery_status === 'picked' ? 'bg-orange-100 text-orange-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.delivery_status.replace(/_/g, ' ')}
                    </div>
                  </div>

                  <div className="space-y-2 bg-muted/30 p-3 rounded-xl">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                      <span className="font-medium text-muted-foreground leading-tight">{order.delivery_address}</span>
                    </div>
                    {order.delivery_instructions && (
                      <div className="flex items-start gap-2 text-xs bg-white p-2 rounded-lg border border-divider">
                        <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        <span className="text-muted-foreground italic">"{order.delivery_instructions}"</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Amount</p>
                        <p className="font-black text-lg">₹{order.total_amount}</p>
                      </div>
                      <div className="w-px h-8 bg-divider" />
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Payment</p>
                        <p className="text-xs font-bold uppercase text-primary">{order.payment_method}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(`tel:${order.customer_phone}`)}>
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`)}>
                        <Navigation className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-1.5 bg-muted/30 border-t flex gap-2">
                  {order.delivery_status === 'assigned' && (
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 font-bold" 
                      onClick={() => pickUpOrder(order.id)}
                      disabled={updatingStatus === order.id}
                    >
                      Pick Up from Restaurant
                    </Button>
                  )}
                  {order.delivery_status === 'picked' && (
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 font-bold" 
                      onClick={() => handleOutForDelivery(order.id)}
                      disabled={updatingStatus === order.id}
                    >
                      Start Delivery Run
                    </Button>
                  )}
                  {order.delivery_status === 'out_for_delivery' && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 font-bold text-white shadow-lg"
                      onClick={() => {
                        setVerifyingOrder(order.id);
                        setOtpInput('');
                      }}
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Reached Location (Enter OTP)
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* History Snippet */}
        <div className="space-y-3">
          <h3 className="font-bold text-base text-muted-foreground">Recently Delivered</h3>
          <div className="space-y-2">
            {completedOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-muted/20 border border-divider rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">#{order.order_number}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(order.assigned_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="font-black text-sm">₹{order.total_amount}</p>
              </div>
            ))}
          </div>
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
