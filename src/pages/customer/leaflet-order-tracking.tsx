import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons for rider and destination
const createRiderIcon = () => {
  return L.divIcon({
    html: '<div style="font-size: 28px; text-align: center;">🛵</div>',
    className: 'custom-div-icon',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
  });
};

const createDestinationIcon = () => {
  return L.divIcon({
    html: '<div style="font-size: 28px; text-align: center;">🏠</div>',
    className: 'custom-div-icon',
    iconSize: [35, 35],
    iconAnchor: [17, 17]
  });
};

interface LeafletOrderTrackingProps {
  riderLocation?: { lat: number; lng: number } | null;
  deliveryLocation?: { lat: number; lng: number } | null;
  routeCoordinates?: [number, number][];
  onMapClick?: (lat: number, lng: number) => void;
}

export function LeafletOrderTracking({ 
  riderLocation, 
  deliveryLocation, 
  routeCoordinates,
  onMapClick 
}: LeafletOrderTrackingProps) {
  const defaultCenter = riderLocation || { lat: 19.1669, lng: 73.2359 };

  return (
    <MapContainer
      center={[defaultCenter.lat, defaultCenter.lng]}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: '400px', width: '100%', borderRadius: '8px' }}
      onClick={(e) => onMapClick?.(e.latlng.lat, e.latlng.lng)}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Rider Location with Live Updates */}
      {riderLocation && (
        <Marker 
          position={[riderLocation.lat, riderLocation.lng]}
          icon={createRiderIcon()}
        >
          {/* Optional popup showing rider info */}
          {/* <Popup>
            <div>
              <p className="font-semibold">Delivery Partner</p>
              <p className="text-sm">On the way!</p>
            </div>
          </Popup> */}
        </Marker>
      )}

      {/* Delivery Destination */}
      {deliveryLocation && (
        <Marker 
          position={[deliveryLocation.lat, deliveryLocation.lng]}
          icon={createDestinationIcon()}
        />
      )}

      {/* Route Line (if you have route coordinates from OSRM) */}
      {routeCoordinates && routeCoordinates.length > 0 && (
        <Polyline 
          positions={routeCoordinates} 
          color="#3B82F6" 
          weight={4}
          opacity={0.7}
          dashArray="10, 10"
        />
      )}
    </MapContainer>
  );
}
