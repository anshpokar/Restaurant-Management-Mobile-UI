import { Truck, ExternalLink, RefreshCw } from 'lucide-react';
import { Card } from '../design-system/card';
import { MapView } from '../map/MapView';
import { useLiveDeliveries } from '../../hooks/useLiveDeliveries';
import { useNavigate } from 'react-router-dom';

export function AdminLiveDeliveryPanel() {
  const { activeOrders, loading, refresh } = useLiveDeliveries();
  const navigate = useNavigate();

  if (loading && activeOrders.length === 0) {
    return (
      <Card className="min-h-[400px] flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
          <p className="text-sm font-medium text-muted-foreground tracking-tight">Initializing live radar...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border shadow-xl">
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <h3 className="font-black text-foreground uppercase tracking-wider text-sm">Live Delivery Radar</h3>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase">{activeOrders.length} Active</span>
           <button onClick={() => refresh()} className="p-1.5 hover:bg-muted rounded-full transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      <div className="h-[350px] w-full relative">
        <MapView 
          center={[28.6139, 77.2090]} // Restaurant / City Center
          zoom={13}
          className="h-full w-full"
          // We'll pass all current order and driver markers here
          // MapView needs to support an array of markers for this complex view
          // Let's refine MapView to support multiple markers
          showAllActive={true}
          activeOrders={activeOrders}
        />
        
        {activeOrders.length === 0 && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] z-[1000] flex items-center justify-center p-8">
            <div className="text-center space-y-2">
              <Truck className="w-12 h-12 text-muted/40 mx-auto" />
              <p className="font-bold text-muted-foreground">No active deliveries</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">Once orders are out for delivery, they'll appear here in real-time.</p>
            </div>
          </div>
        )}
      </div>

      {activeOrders.length > 0 && (
        <div className="p-2 bg-muted/10 border-t">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {activeOrders.map(order => (
              <div 
                key={order.id} 
                className="min-w-[240px] bg-card border border-border rounded-xl p-3 shadow-sm hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => navigate(`/admin/orders/${order.id}`)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-black text-primary uppercase tracking-tighter">#{order.order_number}</p>
                    <h4 className="font-bold text-sm truncate max-w-[150px]">{order.customer_name}</h4>
                  </div>
                  <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                    order.delivery_status === 'out_for_delivery' ? 'bg-purple-100 text-purple-700' : 
                    order.delivery_status === 'available' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {order.delivery_status.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                   <div className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      <span className="font-medium truncate max-w-[100px]">{order.driver_name || 'Assigning...'}</span>
                   </div>
                   <ExternalLink className="w-3 h-3 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
