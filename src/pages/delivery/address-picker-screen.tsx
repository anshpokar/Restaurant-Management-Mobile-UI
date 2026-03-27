import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Input } from '../../components/design-system/input';
import { Card } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { MapPin, Home, Building, Plus, Check, X, AlertCircle } from 'lucide-react';

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

export function AddressPickerScreen() {
  const navigate = useNavigate();
  const [savedAddresses, setSavedAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  
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
    // Final validation before selection
    const isValidPincode = await validatePincode(address.pincode);
    if (!isValidPincode) {
      alert('Sorry, this address is no longer in our delivery zone.');
      return;
    }

    // Navigate back with selected address
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
      // First unset all defaults
      await supabase.from('delivery_addresses')
        .update({ is_default: false })
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

      // Set new default
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

        {/* Add New Address Form */}
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
                  Address Line 1 *
                </label>
                <Input
                  value={formData.address_line1}
                  onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                  placeholder="House/Flat No., Building Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Address Line 2
                </label>
                <Input
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  placeholder="Street, Area (Optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Pincode *
                </label>
                <Input
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="110001"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter 6-digit Delhi pincode
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Optional: GPS Coordinates</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Latitude
                    </label>
                    <Input
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      placeholder="19.1669"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Longitude
                    </label>
                    <Input
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      placeholder="77.2090"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank if you don't know the coordinates
                </p>
              </div>

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
