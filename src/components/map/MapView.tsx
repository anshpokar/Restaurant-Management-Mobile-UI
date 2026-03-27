import { MapContainer, TileLayer, Marker, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Fix for default marker icon issue in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const createDivIcon = (emoji: string, color: string = '#F97316') => L.divIcon({
  html: `<div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2);">
    ${emoji}
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const icons = {
  restaurant: createDivIcon('🏪', '#F97316'), // Orange
  driver: createDivIcon('🛵', '#3B82F6'),      // Blue
  customer: createDivIcon('🏠', '#EF4444'),    // Red
  activeDriver: createDivIcon('🚚', '#8B5CF6'), // Purple
};

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  driverLocation?: [number, number];
  customerLocation?: [number, number];
  restaurantLocation?: [number, number];
  history?: [number, number][];
  deliveryRadius?: number; // in meters
  className?: string;
  routePolyline?: [number, number][]; // New: for Swiggy-style routing
  // Multi-marker support for Admin
  showAllActive?: boolean;
  activeOrders?: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    delivery_latitude: number;
    delivery_longitude: number;
    driver_lat?: number;
    driver_lng?: number;
    delivery_status: string;
  }>;
}

export function MapView({ 
  center, 
  zoom = 13, 
  driverLocation, 
  customerLocation, 
  restaurantLocation = [28.6139, 77.2090], // Default to New Delhi center
  history,
  deliveryRadius,
  className = "h-[300px] w-full",
  routePolyline,
  showAllActive,
  activeOrders
}: MapViewProps) {
  return (
    <div className={className}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} zoom={zoom} />

        {/* Existing Single Tracking Mode */}
        {!showAllActive && (
          <>
            {restaurantLocation && (
              <Marker position={restaurantLocation} icon={icons.restaurant} />
            )}
            
            {customerLocation && (
              <Marker position={customerLocation} icon={icons.customer} />
            )}

            {driverLocation && (
              <Marker position={driverLocation} icon={icons.driver} />
            )}

            {history && history.length > 0 && (
              <Polyline positions={history} color="#3B82F6" weight={4} opacity={0.6} dashArray="8, 8" />
            )}

            {/* Swiggy-style Live Route */}
            {routePolyline && routePolyline.length > 0 && (
              <Polyline positions={routePolyline} color="#F97316" weight={6} opacity={0.8} />
            )}

            {deliveryRadius && (
              <Circle 
                center={restaurantLocation} 
                radius={deliveryRadius} 
                pathOptions={{ color: '#F97316', fillColor: '#F97316', fillOpacity: 0.1 }} 
              />
            )}
          </>
        )}

        {/* Admin Multi-Tracking Mode */}
        {showAllActive && activeOrders?.map(order => (
          <div key={order.id}>
             {/* Customer Marker */}
             <Marker 
               position={[order.delivery_latitude, order.delivery_longitude]} 
               icon={icons.customer}
             />
             
             {/* Driver Marker */}
             {order.driver_lat && order.driver_lng && (
               <>
                 <Marker 
                   position={[order.driver_lat, order.driver_lng]} 
                   icon={order.delivery_status === 'out_for_delivery' ? icons.activeDriver : icons.driver} 
                 />
                 {/* Line between driver and target */}
                 <Polyline 
                   positions={[[order.driver_lat, order.driver_lng], [order.delivery_latitude, order.delivery_longitude]]}
                   color={order.delivery_status === 'out_for_delivery' ? '#8B5CF6' : '#94A3B8'}
                   weight={2}
                   opacity={0.4}
                   dashArray="5, 5"
                 />
               </>
             )}
          </div>
        ))}

        {/* Global Restaurant Hub for Admin */}
        {showAllActive && (
          <Marker position={restaurantLocation} icon={icons.restaurant} />
        )}
      </MapContainer>
    </div>
  );
}
