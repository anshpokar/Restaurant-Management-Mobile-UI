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
  Package, Truck, AlertCircle, Star
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  delivery_status: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  total_amount: number;
  created_at: string;
}

interface DeliveryPerson {
  id: string;
  full_name: string;
  phone?: string;
  rating?: number;
}

export function OrderTrackingScreen() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [deliveryPerson, setDeliveryPerson] = useState<DeliveryPerson | null>(null);
  const [loading, setLoading] = useState(true);

  const { driverLocation, history } = useTracking(orderId);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  async function fetchOrderDetails() {
    try {
      const { data: orderData, error } = await supabase
        .from('orders')
        .select(`
          *,
          delivery_person:profiles (
            id,
            full_name,
            phone,
            rating
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
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
    switch (order.delivery_status) {
      case 'pending': return { label: 'Preparing', color: 'bg-yellow-500', icon: Clock };
      case 'assigned': return { label: 'Rider Assigned', color: 'bg-blue-500', icon: Truck };
      case 'picked': return { label: 'Order Picked Up', color: 'bg-orange-500', icon: Package };
      case 'out_for_delivery': return { label: 'On the Way', color: 'bg-primary', icon: Navigation };
      case 'delivered': return { label: 'Delivered', color: 'bg-green-500', icon: Package };
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
            history={history.map(h => [h.lat, h.lng])}
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
                <p className="font-black text-lg text-primary">~12 Mins</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-background rounded-t-[32px] -mt-8 relative z-[1002] shadow-[0_-8px_30px_rgb(0,0,0,0.12)] p-6 overflow-y-auto">
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
                  <Button size="sm" variant="outline" className="rounded-xl w-10 h-10 p-0" onClick={() => window.open(`tel:${deliveryPerson.phone}`)}>
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

            {/* Tracking Progress */}
            <div className="space-y-4">
              <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Delivery Progress</h4>
              <div className="space-y-4 relative">
                <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-muted" />
                
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${order.delivery_status === 'delivered' ? 'bg-green-500 text-white' : 'bg-primary text-white shadow-lg shadow-primary/30'}`}>
                    <Package className="w-4 h-4" />
                  </div>
                  <div className="pt-1">
                    <p className="font-bold text-sm">Order Confirmed</p>
                    <p className="text-xs text-muted-foreground">Your order is being prepared</p>
                  </div>
                </div>

                <div className={`flex items-start gap-4 transition-opacity ${['out_for_delivery', 'delivered'].includes(order.delivery_status) ? 'opacity-100' : 'opacity-40'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${order.delivery_status === 'delivered' ? 'bg-green-500 text-white' : 'bg-primary text-white'}`}>
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div className="pt-1">
                    <p className="font-bold text-sm">Out for Delivery</p>
                    <p className="text-xs text-muted-foreground">Driver is on the way to you</p>
                  </div>
                </div>
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
