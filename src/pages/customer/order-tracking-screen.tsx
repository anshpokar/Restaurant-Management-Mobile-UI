import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Card } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { MapView } from '../../components/map/MapView';
import { useTracking } from '../../hooks/useTracking';
import { 
  MapPin, Navigation, Phone, MessageCircle, Clock, 
  Package, Truck, AlertCircle, Star, ShieldCheck
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  delivery_status: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  restaurant_latitude?: number;
  restaurant_longitude?: number;
  total_amount: number;
  created_at: string;
  otp?: string;
  delivery_person_id?: string;
}

interface DeliveryPerson {
  id: string;
  full_name: string;
  phone_number?: string;
  rating?: number;
}

export function OrderTrackingScreen() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPerson | null>(null);
  const [loading, setLoading] = useState(true);

  const { driverLocation, history, routePolyline, etaMinutes } = useTracking(orderId, order?.delivery_person_id);

  useEffect(() => {
    fetchOrderDetails();

    const channel = supabase
      .channel(`order_status_${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        setOrder(payload.new as Order);
        if (payload.new.delivery_person_id && !deliveryPerson) {
          fetchOrderDetails(); // Re-fetch to get rider profile if newly assigned
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  async function fetchOrderDetails() {
    try {
      const { data: orderData, error } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_person:profiles!delivery_person_id (
            id,
            full_name,
            phone_number,
            rating
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      console.log('DEBUG: Order data fetched:', {
        id: orderData.id,
        status: orderData.status,
        delivery_status: orderData.delivery_status,
        otp: orderData.otp
      });
      setOrder(orderData);
      if (orderData.delivery_person) {
        setDeliveryPerson(orderData.delivery_person as any);
      }
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusInfo = () => {
    if (!order) return { label: 'Unknown', color: 'bg-gray-500', icon: AlertCircle };
    
    // Priority Logic: Show delivery status if order is prepared or beyond
    const isPrepared = order.status === 'prepared' || ['picked', 'out_for_delivery', 'delivered'].includes(order.delivery_status as string);
    
    if (isPrepared && order.delivery_status) {
      switch (order.delivery_status) {
        case 'assigned': return { label: 'Rider at Restaurant', color: 'bg-blue-500', icon: Truck };
        case 'picked': return { label: 'Order Picked Up', color: 'bg-orange-500', icon: Package };
        case 'out_for_delivery': return { label: 'On the Way', color: 'bg-primary', icon: Navigation };
        case 'delivered': return { label: 'Delivered', color: 'bg-green-500', icon: Package };
      }
    }

    // Default to Kitchen Status
    switch (order.status) {
      case 'placed': return { label: 'Order Placed', color: 'bg-muted', icon: Clock };
      case 'preparing': return { label: 'Chef Preparing', color: 'bg-yellow-500', icon: Clock };
      case 'cooking': return { label: 'Cooking', color: 'bg-orange-400', icon: Clock };
      case 'prepared': return { label: 'Ready for Pickup', color: 'bg-green-400', icon: Package };
      default: return { label: 'Processing', color: 'bg-gray-500', icon: Clock };
    }
  };

  if (loading) {
    return (
      <MobileContainer>
        <AppHeader title="Track Order" showBack />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MobileContainer>
    );
  }

  if (!order) {
    return (
      <MobileContainer>
        <AppHeader title="Track Order" showBack />
        <div className="p-4">
          <Card className="p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h3 className="text-lg font-bold">Order Not Found</h3>
            <Button onClick={() => navigate('/customer/orders')}>Back to Orders</Button>
          </Card>
        </div>
      </MobileContainer>
    );
  }

  const status = getStatusInfo();

  return (
    <MobileContainer>
      <AppHeader title="Tracking" showBack />
      
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {/* Map Header Overlay */}
        <div className="relative h-[45%] w-full">
          <MapView 
            center={driverLocation ? [driverLocation.lat, driverLocation.lng] : (order.delivery_latitude && order.delivery_longitude ? [order.delivery_latitude, order.delivery_longitude] : [28.6139, 77.2090])}
            zoom={15}
            driverLocation={driverLocation ? [driverLocation.lat, driverLocation.lng] : undefined}
            customerLocation={order.delivery_latitude && order.delivery_longitude ? [order.delivery_latitude, order.delivery_longitude] : undefined}
            restaurantLocation={order.restaurant_latitude && order.restaurant_longitude ? [order.restaurant_latitude, order.restaurant_longitude] : undefined}
            history={history.map(h => [h.lat, h.lng])}
            routePolyline={routePolyline}
            className="h-full w-full"
          />
          
          <div className="absolute top-4 left-4 right-4 z-[1001]">
            <Card className="p-4 bg-white/90 backdrop-blur-md border-0 shadow-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Order Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`} />
                  <span className="font-bold text-sm">{status.label}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Arriving In</p>
                <p className="font-black text-lg text-primary">{etaMinutes ? `~${etaMinutes} Mins` : 'Calculating...'}</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-background rounded-t-[32px] -mt-8 relative z-[1002] shadow-[0_-8px_30px_rgb(0,0,0,0.12)] p-6 overflow-y-auto no-scrollbar">
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
          
          <div className="space-y-6">
            {/* Delivery Partner */}
            {deliveryPerson ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Truck className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg leading-none">{deliveryPerson.full_name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      {deliveryPerson.rating || '4.8'} • Delivery Partner
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="rounded-xl w-10 h-10 p-0" onClick={() => window.open(`tel:${deliveryPerson.phone_number}`)}>
                    <Phone className="w-5 h-5" />
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl w-10 h-10 p-0" onClick={() => alert('Chat coming soon!')}>
                    <MessageCircle className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-muted/30 p-4 rounded-2xl flex items-center gap-3 border border-dashed border-divider">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Assigning a delivery partner...</p>
              </div>
            )}

            {/* Delivery OTP - Swiggy Style */}
            {['picked', 'out_for_delivery'].includes(order.delivery_status) && (
              order.otp ? (
                <Card className="p-5 bg-primary text-white border-0 shadow-xl overflow-hidden relative">
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-80">Delivery Verification Code</p>
                      <h3 className="text-3xl font-black">{order.otp}</h3>
                      <p className="text-xs font-medium opacity-70">Share this with the rider only after you receive your order</p>
                    </div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                </Card>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-yellow-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  OTP not generated. Please check if SQL fix was run.
                </div>
              )
            )}

            {/* Dynamic Tracking Progress */}
            <div className="space-y-4">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Detailed Journey</h4>
              
              <div className="space-y-0 relative pl-2">
                {/* Vertical Line */}
                <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-muted group-last:hidden" />
                
                {[
                  { 
                    id: 'placed', 
                    label: 'Order Placed', 
                    desc: 'We have received your order', 
                    icon: Clock,
                    isActive: true,
                    isDone: ['preparing', 'cooking', 'prepared', 'served', 'picked', 'out_for_delivery', 'delivered'].includes(order.status) || order.delivery_status !== 'pending',
                    time: order.created_at
                  },
                  { 
                    id: 'preparing', 
                    label: 'Chef is Preparing', 
                    desc: 'Your food is being cooked with care', 
                    icon: Clock, // Chef icon would be better if available
                    isActive: ['preparing', 'cooking'].includes(order.status),
                    isDone: ['prepared', 'served', 'picked', 'out_for_delivery', 'delivered'].includes(order.status) || ['picked', 'out_for_delivery', 'delivered'].includes(order.delivery_status as string),
                    time: null
                  },
                  { 
                    id: 'prepared', 
                    label: 'Order Ready', 
                    desc: 'Food is packed and waiting for rider', 
                    icon: Package,
                    isActive: order.status === 'prepared',
                    isDone: ['picked', 'out_for_delivery', 'delivered'].includes(order.delivery_status as string),
                    time: null
                  },
                  { 
                    id: 'picked', 
                    label: 'Picked Up', 
                    desc: 'Rider has collected your meal', 
                    icon: Truck,
                    isActive: order.delivery_status === 'picked',
                    isDone: ['out_for_delivery', 'delivered'].includes(order.delivery_status as string),
                    time: (order as any).picked_up_at
                  },
                  { 
                    id: 'out_for_delivery', 
                    label: 'On the Way', 
                    desc: 'Rider is zooming towards your location', 
                    icon: Navigation,
                    isActive: order.delivery_status === 'out_for_delivery',
                    isDone: order.delivery_status === 'delivered',
                    time: null
                  },
                  { 
                    id: 'delivered', 
                    label: 'Delivered', 
                    desc: 'Enjoy your delicious meal!', 
                    icon: Star,
                    isActive: order.status === 'delivered' || order.delivery_status === 'delivered',
                    isDone: order.status === 'delivered' || order.delivery_status === 'delivered',
                    time: (order as any).delivered_at
                  }
                ].map((step, idx, arr) => (
                  <div key={step.id} className={`flex items-start gap-5 pb-8 relative group ${step.isActive || step.isDone ? 'opacity-100' : 'opacity-30'}`}>
                    {/* Step Indicator */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all duration-500 ${
                      step.isDone ? 'bg-green-500 scale-110 shadow-lg shadow-green-200' : 
                      step.isActive ? 'bg-primary scale-125 shadow-xl shadow-primary/30 animate-pulse' : 
                      'bg-muted'
                    }`}>
                      {step.isDone ? (
                        <ShieldCheck className="w-4 h-4 text-white" />
                      ) : (
                        <step.icon className={`w-4 h-4 ${step.isActive ? 'text-white' : 'text-muted-foreground'}`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pt-0.5 flex-1">
                      <div className="flex justify-between items-start">
                        <h5 className={`font-black text-sm uppercase tracking-tight ${step.isActive ? 'text-primary' : 'text-foreground'}`}>
                          {step.label}
                        </h5>
                        {step.time && (
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-md">
                            {new Date(step.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">
                        {step.desc}
                      </p>
                    </div>

                    {/* Progress Connecting Line Dot */}
                    {idx < arr.length - 1 && (
                      <div className={`absolute left-[23px] top-8 w-[2px] h-full ${step.isDone ? 'bg-green-500' : 'bg-muted'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Address */}
            <Card className="p-4 bg-muted/20 border-0 shadow-none rounded-2xl">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Delivery To</p>
                  <p className="text-sm font-bold mt-1 line-clamp-2">{order.delivery_address}</p>
                </div>
              </div>
            </Card>

            <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest" onClick={() => navigate('/customer/help-support')}>
              Need Help?
            </Button>
          </div>
        </div>
      </div>
    </MobileContainer>
  );
}
