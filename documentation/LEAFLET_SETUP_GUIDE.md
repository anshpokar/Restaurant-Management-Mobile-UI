# 🗺️ LEAFLET + OPENSTREETMAP SETUP GUIDE (FREE)

## ✅ WHY LEAFLET?

- **100% FREE** - No API keys required
- **OpenStreetMap** - Community-driven maps
- **Lightweight** - Fast loading
- **Feature-rich** - Markers, popups, routing, geocoding
- **No billing** - Unlimited usage for reasonable traffic

---

## 📦 INSTALLATION

### **Step 1: Install Packages**
```bash
npm install leaflet react-leaflet @types/leaflet --save --legacy-peer-deps
```

✅ **Already installed!**

---

## 🔧 COMPONENT IMPLEMENTATION

### **Option 1: Simple Address Picker (Leaflet Version)**

Create: `src/pages/delivery/leaflet-address-picker.tsx`

```typescript
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletAddressPickerProps {
  onLocationSelect?: (lat: number, lng: number) => void;
}

function LocationMarker({ onLocationSelect }: { onLocationSelect?: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useMapEvents({
    click(e) {
      const newPostion = [e.latlng.lat, e.latlng.lng];
      setPosition(newPostion);
      onLocationSelect?.(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export function LeafletAddressPicker({ onLocationSelect }: LeafletAddressPickerProps) {
  const defaultPosition: [number, number] = [28.6139, 77.2090]; // Delhi

  return (
    <div className="h-[500px] w-full">
      <MapContainer 
        center={defaultPosition} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
      <p className="text-sm text-gray-600 mt-2">
        Click on the map to select your location
      </p>
    </div>
  );
}
```

---

### **Option 2: Advanced with Search & Reverse Geocoding**

Create: `src/pages/delivery/leaflet-advanced-picker.tsx`

```typescript
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix marker icon
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

function LocationMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number] | null;
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  if (!position) return null;

  return (
    <Marker position={position}>
      <Popup>
        Selected Location<br/>
        Lat: {position[0]}, Lng: {position[1]}
      </Popup>
    </Marker>
  );
}

export function LeafletAdvancedPicker() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [formData, setFormData] = useState<FormData>({
    address_line1: '',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: ''
  });

  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    
    // Reverse geocoding using Nominatim (FREE!)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      
      setFormData(prev => ({
        ...prev,
        address_line1: data.display_name || '',
        pincode: extractPincode(data.address)
      }));
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const extractPincode = (address: any): string => {
    return address.postcode || '';
  };

  return (
    <div className="space-y-4">
      <div className="h-[500px] w-full rounded-lg overflow-hidden border-2 border-gray-200">
        <MapContainer 
          center={[28.6139, 77.2090]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            onPositionChange={handleLocationSelect} 
          />
        </MapContainer>
      </div>

      {/* Form Fields */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Address"
          value={formData.address_line1}
          onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
          className="w-full p-2 border rounded"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="City"
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
            className="p-2 border rounded"
          />
          <input
            type="text"
            placeholder="State"
            value={formData.state}
            onChange={(e) => setFormData({...formData, state: e.target.value})}
            className="p-2 border rounded"
          />
        </div>
        <input
          type="text"
          placeholder="Pincode"
          value={formData.pincode}
          onChange={(e) => setFormData({...formData, pincode: e.target.value})}
          className="w-full p-2 border rounded"
        />
      </div>
    </div>
  );
}
```

---

### **Option 3: Order Tracking with Live Updates**

Replace Google Maps in `order-tracking-screen.tsx`:

```typescript
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Custom icons
const riderIcon = L.divIcon({
  html: '<div style="font-size: 24px;">🛵</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const destinationIcon = L.divIcon({
  html: '<div style="font-size: 24px;">🏠</div>',
  className: 'custom-div-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// In the component render:
<MapContainer
  center={riderLocation || defaultCenter}
  zoom={13}
  style={{ height: '400px', width: '100%', borderRadius: '8px' }}
>
  <TileLayer
    attribution='&copy; OpenStreetMap'
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  />
  
  {/* Rider Location */}
  {riderLocation && (
    <Marker 
      position={[riderLocation.lat, riderLocation.lng]}
      icon={riderIcon}
    />
  )}

  {/* Delivery Destination */}
  {order.delivery_latitude && order.delivery_longitude && (
    <Marker 
      position={[order.delivery_latitude, order.delivery_longitude]}
      icon={destinationIcon}
    />
  )}

  {/* Route Line (if you have route coordinates) */}
  {routeCoordinates && routeCoordinates.length > 0 && (
    <Polyline positions={routeCoordinates} color="#3B82F6" weight={4} />
  )}
</MapContainer>
```

---

## 🎯 INTEGRATION STEPS

### **1. Replace Google Maps Address Picker**

In `src/routes/index.tsx`:

```typescript
// Change from:
import { GoogleMapsAddressPicker } from '@/pages/delivery/google-maps-address-picker';

// To:
import { LeafletAddressPicker } from '@/pages/delivery/leaflet-address-picker';

// Update route:
<Route path="delivery-address" element={<LeafletAddressPicker />} />
```

### **2. Update Order Tracking Screen**

Modify `src/pages/customer/order-tracking-screen.tsx`:

```typescript
// Remove Google Maps imports
// import { LoadScript, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';

// Add Leaflet imports
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
```

---

## 🌍 FREE SERVICES YOU CAN USE

### **1. Map Tiles (Choose one):**

```typescript
// OpenStreetMap (Recommended)
url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

// OpenTopoMap (Terrain)
url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"

// CartoDB Positron (Light theme)
url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

// CartoDB Dark Matter (Dark theme)
url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
```

### **2. Geocoding (FREE - Nominatim):**

```typescript
// Search address
const searchAddress = async (query: string) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
  );
  return await response.json();
};

// Reverse geocoding
const reverseGeocode = async (lat: number, lng: number) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  );
  return await response.json();
};
```

⚠️ **Nominatim Usage Policy:**
- Max 1 request per second
- Include User-Agent header
- Fair usage only

### **3. Routing (FREE - OSRM):**

```typescript
const getRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
  const response = await fetch(
    `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
  );
  const data = await response.json();
  return data.routes[0].geometry; // GeoJSON LineString
};
```

---

## 📋 COMPARISON: Google Maps vs Leaflet

| Feature | Google Maps | Leaflet + OSM |
|---------|-------------|---------------|
| **Cost** | $7/month free tier, then paid | **100% FREE** |
| **API Key** | Required | **Not Required** |
| **Map Tiles** | High quality | Good quality |
| **Geocoding** | Excellent, paid | Good, free (Nominatim) |
| **Routing** | Excellent, paid | Good, free (OSRM) |
| **Customization** | Limited | Very high |
| **Offline** | No | Yes (with plugins) |
| **Bundle Size** | ~200KB | ~150KB |

---

## 🚀 RECOMMENDED APPROACH

### **For Your Restaurant App:**

1. **Address Picker:** Use Leaflet with Nominatim geocoding
2. **Order Tracking:** Use Leaflet with live updates
3. **Delivery Routing:** Use OSRM for route optimization
4. **All FREE!** No API keys needed

---

## 📁 FILES TO CREATE/MODIFY

### **Create:**
1. `src/pages/delivery/leaflet-address-picker.tsx` - Basic picker
2. `src/pages/delivery/leaflet-advanced-picker.tsx` - With search
3. `src/lib/leaflet-utils.ts` - Helper functions

### **Modify:**
1. `src/pages/customer/order-tracking-screen.tsx` - Replace Google Maps
2. `src/routes/index.tsx` - Update imports

---

## ✅ NEXT STEPS

Would you like me to:

1. **Create the Leaflet address picker component** to replace Google Maps?
2. **Update the order tracking screen** to use Leaflet?
3. **Add geocoding and routing** with Nominatim/OSRM?
4. **Create a complete example** with all features?

Let me know and I'll implement it! 🗺️
