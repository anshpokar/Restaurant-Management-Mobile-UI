import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '../../components/design-system/button';
import { Card } from '../../components/design-system/card';
import { MapPin, Navigation } from 'lucide-react';

// Fix for default marker icon issue in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FormData {
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

interface LeafletAddressPickerProps {
  onLocationSelect?: (lat: number, lng: number, address: string) => void;
  initialPosition?: [number, number];
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

export function LeafletAddressPicker({ onLocationSelect, initialPosition }: LeafletAddressPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(initialPosition || null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    address_line1: '',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: ''
  });

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
      const pincode = data.address?.postcode || '';
      
      setFormData(prev => ({
        ...prev,
        address_line1: address,
        pincode: pincode,
        latitude: lat,
        longitude: lng
      }));

      onLocationSelect?.(lat, lng, address);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      setFormData(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
      }));
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

  const handleSave = () => {
    if (!position) {
      alert('Please select a location on the map');
      return;
    }
    // You can add validation here
    alert('Location selected! Address: ' + formData.address_line1);
  };

  return (
    <div className="space-y-4 p-4">
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-orange-600" />
          Select Your Location
        </h2>
        
        {/* Map */}
        <div className="h-[400px] w-full rounded-lg overflow-hidden border-2 border-gray-200 mb-3">
          <MapContainer 
            center={position || [28.6139, 77.2090]} 
            zoom={position ? 15 : 13} 
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
          </MapContainer>
        </div>

        {/* Current Location Button */}
        <Button
          type="button"
          variant="outline"
          onClick={getCurrentLocation}
          className="w-full mb-3 flex items-center justify-center gap-2"
        >
          <Navigation className="w-4 h-4" />
          Use Current Location
        </Button>

        {/* Selected Location Info */}
        {position && (
          <div className="bg-blue-50 p-3 rounded-lg mb-3">
            <p className="text-sm font-medium text-blue-900 mb-1">Selected Location:</p>
            <p className="text-xs text-blue-700">
              Lat: {position[0].toFixed(6)}, Lng: {position[1].toFixed(6)}
            </p>
            {loading && (
              <p className="text-xs text-blue-600 mt-1">Fetching address...</p>
            )}
          </div>
        )}

        {/* Form Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Complete Address
            </label>
            <textarea
              value={formData.address_line1}
              onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
              className="w-full p-2 border rounded-md text-sm"
              rows={3}
              placeholder="Enter or select location on map"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                className="w-full p-2 border rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pincode
            </label>
            <input
              type="text"
              value={formData.pincode}
              onChange={(e) => setFormData({...formData, pincode: e.target.value})}
              className="w-full p-2 border rounded-md text-sm"
              placeholder="Auto-detected when you select location"
            />
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!position || loading}
          className="w-full mt-4"
        >
          {loading ? 'Fetching Address...' : 'Save Location'}
        </Button>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Click anywhere on the map to select your location
        </p>
      </Card>
    </div>
  );
}
