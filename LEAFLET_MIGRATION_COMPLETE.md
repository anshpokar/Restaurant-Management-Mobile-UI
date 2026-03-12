# 🗺️ LEAFLET MIGRATION - COMPLETE GUIDE

## ✅ WHY WE'RE MIGRATING TO LEAFLET

### **Google Maps Problems:**
❌ Costs $7/month + usage fees  
❌ Requires credit card setup  
❌ Complex API key management  
❌ Expensive for high usage  

### **Leaflet Benefits:**
✅ **100% FREE** - No costs ever  
✅ **No API keys** - Works immediately  
✅ **OpenStreetMap** - Community-driven  
✅ **Lightweight** - Faster loading  
✅ **Privacy-friendly** - No tracking  

---

## 📊 CURRENT STATUS

### **✅ ALREADY MIGRATED:**

1. **Address Picker** - `src/pages/delivery/leaflet-address-picker.tsx` ✅
2. **Order Tracking** - `src/pages/customer/leaflet-order-tracking.tsx` ✅
3. **Routes Updated** - Using Leaflet components ✅

### **⏳ NEEDS MIGRATION:**

1. **Order Tracking Screen** - Still using Google Maps
   - File: `src/pages/customer/order-tracking-screen.tsx`
   - Currently imports: `@react-google-maps/api`

---

## 🔄 STEP-BY-STEP MIGRATION

### **Step 1: Update Order Tracking Screen** ⚠️ REQUIRED

The main order tracking screen still uses Google Maps. Here's how to fix it:

#### **Current Code (Lines 1-3):**
```typescript
import { LoadScript, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
```

#### **Replace With:**
```typescript
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
```

---

### **Complete Migration Guide for order-tracking-screen.tsx:**

**Find this section (around line 14):**
```typescript
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090
};
```

**Replace with:**
```typescript
// Leaflet configuration
const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '8px'
};

const defaultCenter: [number, number] = [28.6139, 77.2090]; // Delhi coordinates
```

---

**Find the Google Map component (search for `<LoadScript`):**
```typescript
<LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
  <GoogleMap
    mapContainerStyle={mapContainerStyle}
    center={defaultCenter}
    zoom={15}
    options={{
      disableDefaultUI: false,
      streetViewControl: false,
    }}
  >
    {/* Markers and routes */}
  </GoogleMap>
</LoadScript>
```

**Replace with:**
```typescript
<MapContainer
  center={defaultCenter}
  zoom={15}
  style={mapContainerStyle}
  className="rounded-lg"
>
  <TileLayer
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  />
  
  {/* Rider Marker */}
  {riderLocation && (
    <Marker position={[riderLocation.lat, riderLocation.lng]}>
      {/* Custom rider icon if needed */}
    </Marker>
  )}
  
  {/* Delivery Location Marker */}
  {deliveryLocation && (
    <Marker position={[deliveryLocation.lat, deliveryLocation.lng]}>
      {/* Custom home icon if needed */}
    </Marker>
  )}
  
  {/* Route Polyline (if available) */}
  {routeCoordinates && routeCoordinates.length > 0 && (
    <Polyline
      positions={routeCoordinates}
      color="#F97316"
      weight={4}
      opacity={0.8}
    />
  )}
</MapContainer>
```

---

## 🎯 QUICK FIX - USE EXISTING COMPONENT

**EASIEST SOLUTION:** Use the existing `LeafletOrderTracking` component!

### **In order-tracking-screen.tsx:**

**Add import:**
```typescript
import { LeafletOrderTracking } from './leaflet-order-tracking';
```

**Replace Google Map with:**
```typescript
<LeafletOrderTracking
  riderLocation={riderLocation}
  deliveryLocation={deliveryLocation}
  routeCoordinates={routeCoordinates}
/>
```

**Remove:**
- All `@react-google-maps/api` imports
- `GOOGLE_MAPS_API_KEY` constant
- `<LoadScript>` and `<GoogleMap>` components

---

## 📦 NPM PACKAGES

### **Already Installed:**
✅ `leaflet` - Core library  
✅ `react-leaflet` - React bindings  
✅ `@types/leaflet` - TypeScript types  

### **Can Be Removed:**
❌ `@react-google-maps/api` - No longer needed

Run this to remove:
```bash
npm uninstall @react-google-maps/api
```

---

## 🗑️ FILES TO DELETE

After complete migration, you can delete these **Google Maps files**:

1. **`src/pages/delivery/google-maps-address-picker.tsx`** ❌
   - **Replacement:** `src/pages/delivery/leaflet-address-picker.tsx` ✅
   - **Size:** 22KB saved

2. **Any `.env` variables:**
   ```env
   # Can remove this line from .env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
   ```

---

## ✅ VERIFICATION CHECKLIST

After migration:

### **Code Check:**
- [ ] No `@react-google-maps/api` imports
- [ ] No `GOOGLE_MAPS_API_KEY` usage
- [ ] All maps use `react-leaflet`
- [ ] No TypeScript errors

### **Functionality Test:**
- [ ] Address picker shows map
- [ ] Can select location on map
- [ ] Order tracking displays correctly
- [ ] Rider position updates
- [ ] Routes display properly

### **Performance Check:**
- [ ] Maps load faster
- [ ] No console errors
- [ ] Smooth scrolling/zooming
- [ ] Mobile responsive

---

## 🎨 CUSTOMIZATION OPTIONS

### **Change Map Style:**

Edit the `TileLayer` URL:

```typescript
<TileLayer
  // Dark theme
  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
  
  // Light theme
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
  
  // Terrain
  url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
  
  attribution='&copy; OpenStreetMap contributors'
/>
```

---

### **Custom Markers:**

```typescript
// Create custom icon
const customIcon = L.icon({
  iconUrl: '/path/to/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Use in marker
<Marker position={position} icon={customIcon} />
```

---

## 💰 COST SAVINGS

### **Before (Google Maps):**
```
$7.00/month base fee
+ $7.00 per 1000 map loads
+ $5.00 per 1000 geocoding requests
= ~$20-50/month for typical restaurant
```

### **After (Leaflet):**
```
$0.00 - Completely FREE!
$0.00 - No usage fees
$0.00 - No API key required
= $0.00/month forever!
```

**Annual Savings: $240-$600!** 🎉

---

## 🔧 TROUBLESHOOTING

### **Issue 1: Map Not Showing**

**Symptoms:** Blank space where map should be

**Solution:**
```bash
# Check if leaflet is installed
npm list leaflet

# If not installed:
npm install leaflet react-leaflet

# Check CSS is imported
import 'leaflet/dist/leaflet.css';
```

---

### **Issue 2: Icons Not Displaying**

**Symptoms:** Default gray squares instead of markers

**Solution:**
```typescript
// Add this after your imports
import L from 'leaflet';

// Fix icon path issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
```

---

### **Issue 3: TypeScript Errors**

**Symptoms:** Type errors with Leaflet components

**Solution:**
```bash
# Install types
npm install --save-dev @types/leaflet @types/react-leaflet
```

---

## 📊 MIGRATION SUMMARY

### **What Changes:**

| Component | Before (Google) | After (Leaflet) | Status |
|-----------|----------------|-----------------|--------|
| **Address Picker** | GoogleMapsAddressPicker | LeafletAddressPicker | ✅ Done |
| **Order Tracking** | GoogleMap | MapContainer | ⏳ Needs update |
| **Library** | @react-google-maps/api | react-leaflet | ✅ Installed |
| **Cost** | $7+/month | $0 | ✅ Saved! |

---

## 🚀 IMMEDIATE NEXT STEPS

### **Option A: Quick Fix (Recommended)**

Use the existing `LeafletOrderTracking` component:

1. Open `src/pages/customer/order-tracking-screen.tsx`
2. Add import: `import { LeafletOrderTracking } from './leaflet-order-tracking';`
3. Replace `<GoogleMap>` with `<LeafletOrderTracking />`
4. Remove Google Maps imports
5. Done! ✅

**Time:** 5 minutes

---

### **Option B: Full Rewrite**

Manually replace all Google Maps code with Leaflet:

1. Remove all `@react-google-maps/api` imports
2. Add all `react-leaflet` imports
3. Replace `<LoadScript>` with `<MapContainer>`
4. Replace `<GoogleMap>` with `<MapContainer>`
5. Replace `<Marker>` with Leaflet markers
6. Replace `<DirectionsRenderer>` with `<Polyline>`
7. Test thoroughly

**Time:** 15-20 minutes

---

## ✅ RECOMMENDED APPROACH

**Use Option A (Quick Fix)** - It's faster and uses tested code!

The `LeafletOrderTracking` component already exists and works perfectly. Just import and use it!

---

## 📚 ADDITIONAL RESOURCES

- **Leaflet Docs:** https://leafletjs.com/
- **React Leaflet:** https://react-leaflet.js.org/
- **OpenStreetMap:** https://www.openstreetmap.org/
- **Free Map Tiles:** https://leaflet-extras.github.io/leaflet-providers/preview/

---

## 🎉 BENEFITS AFTER MIGRATION

✅ **Zero map costs** - Save $240-$600/year  
✅ **No API keys** - Simpler deployment  
✅ **Faster loading** - Lighter library  
✅ **Better privacy** - No Google tracking  
✅ **Unlimited usage** - No quotas  
✅ **Community support** - Active development  

---

**Ready to complete the migration? Start with Option A (Quick Fix) above!** 🚀

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** ⚠️ Partial Migration Complete - Final Step Needed
