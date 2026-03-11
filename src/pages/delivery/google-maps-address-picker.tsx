import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoadScript, GoogleMap, Marker, Autocomplete } from '@react-google-maps/api';
import { supabase } from '../../lib/supabase';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Input } from '../../components/design-system/input';
import { Card } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { MapPin, Home, Building, Plus, Check, X, AlertCircle, Navigation, Crosshair } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const libraries: ('places')[] = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '8px'
};

const defaultCenter = {
  lat: 28.6139, // Connaught Place, New Delhi
  lng: 77.2090
};

interface DeliveryAddress {
  id: string;
  label: string;
  address_line1: string;
  address_line2?: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
}

interface ValidationResult {
  is_valid: boolean;
  is_pincode_valid: boolean;
  is_within_range: boolean;
  distance_km?: number;
}

export function GoogleMapsAddressPicker() {
  const navigate = useNavigate();
  const location = useLocation();
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
  // Map state
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<{lat: number, lng: number} | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    label: '',
    address_line1: '',
    address_line2: '',
    pincode: '',
    latitude: '',
    longitude: ''
  });

  useEffect(() => {
    loadSavedAddresses();
  }, []);

  async function loadSavedAddresses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedAddresses(data || []);
    } catch (error) {
      console.error('Error loading addresses:', error);
    } finally {
      setLoading(false);
    }
  }

  function onLoadMap(mapInstance: google.maps.Map) {
    setMap(mapInstance);
    
    // Try to get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMarkerPosition(newPos);
          mapInstance.panTo(newPos);
          mapInstance.setZoom(15);
          
          // Reverse geocode to get address
          reverseGeocode(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }

  function onMarkerDragEnd(e: google.maps.MapMouseEvent) {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setMarkerPosition({ lat, lng });
      
      setFormData({
        ...formData,
        latitude: lat.toString(),
        longitude: lng.toString()
      });
      
      // Reverse geocode
      reverseGeocode(lat, lng);
    }
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        let pincode = '';
        
        // Extract pincode from address components
        for (const component of result.address_components) {
          if (component.types.includes('postal_code')) {
            pincode = component.long_name;
            break;
          }
        }
        
        setFormData({
          ...formData,
          address_line1: result.formatted_address,
          pincode: pincode,
          latitude: lat.toString(),
          longitude: lng.toString()
        });
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  }

  function onLoadAutocomplete(ac: google.maps.places.Autocomplete) {
    setAutocomplete(ac);
  }

  function onPlaceChanged() {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        setMarkerPosition({ lat, lng });
        
        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(17);
        }
        
        setFormData({
          ...formData,
          address_line1: place.formatted_address || '',
          pincode: extractPincode(place),
          latitude: lat.toString(),
          longitude: lng.toString()
        });
      }
    }
  }

  function extractPincode(place: google.maps.places.PlaceResult): string {
    if (!place.address_components) return '';
    
    for (const component of place.address_components) {
      if (component.types.includes('postal_code')) {
        return component.long_name;
      }
    }
    return '';
  }

  async function getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          setMarkerPosition({ lat, lng });
          
          if (map) {
            map.panTo({ lat, lng });
            map.setZoom(15);
          }
          
          await reverseGeocode(lat, lng);
        },
        (error) => {
          alert('Unable to get your current location. Please enter address manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  }

  async function validatePincode(pincode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_pincode_deliverable', {
        check_pincode: pincode
      });

      if (error) throw error;
      return data || false;
    } catch (error) {
      console.error('Error validating pincode:', error);
      return false;
    }
  }

  async function validateFullAddress(lat: number, lon: number, pincode: string) {
    try {
      const { data, error } = await supabase.rpc('validate_delivery_address', {
        p_latitude: lat,
        p_longitude: lon,
        p_pincode: pincode
      });

      if (error) throw error;
      setValidationResult(data);
      return data;
    } catch (error) {
      console.error('Error validating address:', error);
      setValidationResult(null);
      return null;
    }
  }

  async function handleSaveAddress() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate pincode first
      const isValidPincode = await validatePincode(formData.pincode);
      if (!isValidPincode) {
        alert('Sorry, we do not deliver to this pincode. Please enter a valid Delhi pincode.');
        return;
      }

      // Validate full address if coordinates provided
      let validationData = null;
      if (formData.latitude && formData.longitude) {
        validationData = await validateFullAddress(
          parseFloat(formData.latitude),
          parseFloat(formData.longitude),
          formData.pincode
        );

        if (!validationData?.is_valid) {
          alert('Sorry, this address is outside our delivery zone (20km radius).');
          return;
        }
      }

      const { error } = await supabase.from('delivery_addresses').insert({
        user_id: user.id,
        label: formData.label,
        address_line1: formData.address_line1,
        address_line2: formData.address_line2 || null,
        pincode: formData.pincode,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        is_within_delivery_zone: validationData?.is_valid || true,
        distance_from_restaurant: validationData?.distance_km || null
      });

      if (error) throw error;

      // Reload addresses
      await loadSavedAddresses();
      setShowAddForm(false);
      setFormData({
        label: '',
        address_line1: '',
        address_line2: '',
        pincode: '',
        latitude: '',
        longitude: ''
      });
    } catch (error) {
      console.error('Error saving address:', error);
      alert('Failed to save address. Please try again.');
    }
  }

  async function handleSelectAddress(address: DeliveryAddress) {
    const isValidPincode = await validatePincode(address.pincode);
    if (!isValidPincode) {
      alert('Sorry, this address is no longer in our delivery zone.');
      return;
    }

    navigate(-1, { 
      state: { 
        selectedAddress: address,
        validated: true 
      } 
    });
  }

  async function handleDeleteAddress(id: string) {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const { error } = await supabase.from('delivery_addresses').delete().eq('id', id);
      if (error) throw error;
      await loadSavedAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Failed to delete address.');
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await supabase.from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      const { error } = await supabase.from('delivery_addresses')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      await loadSavedAddresses();
    } catch (error) {
      console.error('Error setting default:', error);
    }
  }

  function getAddressIcon(label: string) {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home')) return Home;
    if (lowerLabel.includes('work') || lowerLabel.includes('office')) return Building;
    return MapPin;
  }

  if (loading) {
    return (
      <MobileContainer>
        <AppHeader title="Select Delivery Address" showBack />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading addresses...</p>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <AppHeader title="Select Delivery Address" showBack />
      
      <div className="p-4 space-y-4 pb-24">
        {/* Validation Info */}
        <Card className="bg-blue-50 border-blue-200 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Delivery Zone Validation</p>
              <p>We deliver within 20km radius and selected Delhi pincodes only.</p>
            </div>
          </div>
        </Card>

        {/* Saved Addresses */}
        {!showAddForm && savedAddresses.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Saved Addresses</h2>
            {savedAddresses.map((address) => {
              const Icon = getAddressIcon(address.label);
              return (
                <Card key={address.id} className="relative">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{address.label}</h3>
                        {address.is_default && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {address.address_line1}
                        {address.address_line2 && `, ${address.address_line2}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        PIN: {address.pincode}
                        {address.distance_from_restaurant && (
                          <span className="ml-2 text-gray-500">
                            ({address.distance_from_restaurant} km away)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSelectAddress(address)}
                      className="flex-1"
                    >
                      Deliver Here
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(address.id)}
                      disabled={address.is_default}
                    >
                      {address.is_default ? <Check className="w-4 h-4" /> : 'Set Default'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAddress(address.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* No Addresses Message */}
        {!showAddForm && savedAddresses.length === 0 && (
          <Card className="text-center py-8">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No saved addresses yet</p>
            <Button variant="primary" onClick={() => setShowAddForm(true)}>
              Add New Address
            </Button>
          </Card>
        )}

        {/* Add New Address Form with Google Maps */}
        {showAddForm && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add New Address</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
            </div>

            <Card className="space-y-4">
              {/* Google Maps Integration */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pick Location on Map
                </label>
                <LoadScript
                  googleMapsApiKey={GOOGLE_MAPS_API_KEY}
                  libraries={libraries}
                >
                  <div className="relative mb-2">
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={markerPosition || defaultCenter}
                      zoom={15}
                      onLoad={onLoadMap}
                      onClick={(e) => {
                        if (e.latLng) {
                          const lat = e.latLng.lat();
                          const lng = e.latLng.lng();
                          setMarkerPosition({ lat, lng });
                          setFormData({
                            ...formData,
                            latitude: lat.toString(),
                            longitude: lng.toString()
                          });
                        }
                      }}
                    >
                      {markerPosition && (
                        <Marker
                          position={markerPosition}
                          draggable={true}
                          onDragEnd={onMarkerDragEnd}
                        />
                      )}
                    </GoogleMap>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={getCurrentLocation}
                      className="absolute top-2 right-2 bg-white shadow-md"
                    >
                      <Crosshair className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Autocomplete
                    onLoad={onLoadAutocomplete}
                    onPlaceChanged={onPlaceChanged}
                  >
                    <Input
                      placeholder="Search for address..."
                      className="w-full"
                    />
                  </Autocomplete>
                </LoadScript>
                
                <p className="text-xs text-gray-500 mt-1">
                  Click on map or search to select location
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Label (e.g., Home, Work) *
                </label>
                <Input
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Home"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Address *
                </label>
                <Input
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="Auto-filled from map selection"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Address Line 2 (Optional)
                </label>
                <Input
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  placeholder="Flat No., Floor, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Pincode *
                </label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="Auto-detected"
                  maxLength={6}
                />
              </div>

              {/* Hidden fields for coordinates */}
              <input type="hidden" value={formData.latitude} name="latitude" />
              <input type="hidden" value={formData.longitude} name="longitude" />

              {validationResult && (
                <div className={`p-3 rounded-lg ${
                  validationResult.is_valid 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    validationResult.is_valid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {validationResult.is_valid 
                      ? `✓ Address is within our delivery zone (${validationResult.distance_km} km)`
                      : '✗ Address is outside our delivery zone'}
                  </p>
                  <p className={`text-xs mt-1 ${
                    validationResult.is_valid ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Pincode {validationResult.is_pincode_valid ? '✓' : '✗'} | 
                    Distance {validationResult.is_within_range ? '✓' : '✗'}
                  </p>
                </div>
              )}

              <Button
                variant="primary"
                className="w-full"
                onClick={handleSaveAddress}
                disabled={!formData.label || !formData.address_line1 || !formData.pincode}
              >
                Save Address
              </Button>
            </Card>
          </div>
        )}

        {/* Add New Address Button (when viewing list) */}
        {!showAddForm && (
          <Button
            variant="primary"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Address
          </Button>
        )}
      </div>
    </MobileContainer>
  );
}
