import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '../../components/design-system/button';
import { MapPin, Navigation, X } from 'lucide-react';

// Fix for default marker icon issue in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletAddressPickerProps {
  onLocationSelect?: (lat: number, lng: number, address: string, details?: any) => void;
  initialPosition?: [number, number];
  onClose?: () => void;
}

function LocationMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number] | null;
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      onPositionChange(newPosition[0], newPosition[1]);
    },
  });

  if (!position) return null;

  return <Marker position={position} />;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export function LeafletAddressPicker({ onLocationSelect, initialPosition, onClose }: LeafletAddressPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition || null);
  const [loading, setLoading] = useState(false);

  // Sync position when initialPosition prop changes
  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    setLoading(true);
    
    // Reverse geocoding using Nominatim (FREE!)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'Restaurant Management App/1.0'
          }
        }
      );
      const data = await response.json();
      
      const address = data.display_name || '';
      const addressDetails = data.address || {};
      
      onLocationSelect?.(lat, lng, address, addressDetails);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      onLocationSelect?.(lat, lng, 'Selected Location');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.error('Geolocation error:', err);
          alert('Unable to get your current location');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Pin Location on Map
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Map */}
      <div className="h-[300px] w-full rounded-2xl overflow-hidden border-2 border-border mb-3 relative group">
        <MapContainer 
          center={position || [28.6139, 77.2090]} 
          zoom={position ? 16 : 13} 
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            onPositionChange={handleLocationSelect} 
          />
          {position && <ChangeView center={position} zoom={16} />}
        </MapContainer>
        
        {loading && (
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] z-[1000] flex items-center justify-center">
             <div className="bg-white p-3 rounded-full shadow-lg animate-bounce">
                <MapPin className="w-6 h-6 text-primary" />
             </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl"
        >
          <Navigation className="w-4 h-4" />
          My Location
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center font-medium uppercase tracking-widest">
        Tap the map to set delivery pin
      </p>
    </div>
  );
}
