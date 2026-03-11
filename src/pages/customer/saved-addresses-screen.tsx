import { useState } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { MapPin, Plus, Trash2, Edit, Home, Building, Check } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { type Profile, type AddressInput } from '@/lib/supabase';
import { useAddresses } from '@/hooks/use-addresses';

export function SavedAddressesScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const { addresses, loading, addAddress, deleteAddress, setDefaultAddress } = useAddresses(profile?.id || null);
  const [isAdding, setIsAdding] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressInput>({
    address_label: 'Home',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    phone_number: '',
    is_default: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAddress({
        address_label: newAddress.address_label,
        address_line1: newAddress.address_line1,
        address_line2: newAddress.address_line2,
        city: newAddress.city,
        state: newAddress.state,
        pincode: newAddress.pincode,
        phone_number: newAddress.phone_number,
        is_default: newAddress.is_default
      });
      setIsAdding(false);
      setNewAddress({
        address_label: 'Home',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        phone_number: '',
        is_default: false
      });
      alert('Address added successfully!');
    } catch (error) {
      alert('Failed to add address');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Saved Addresses" />

      <div className="px-4 py-4 space-y-4">
        {/* Add Address Button */}
        <Button onClick={() => setIsAdding(!isAdding)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          {isAdding ? 'Cancel' : 'Add New Address'}
        </Button>

        {/* Add Address Form */}
        {isAdding && (
          <Card>
            <CardBody className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Label</label>
                  <select
                    value={newAddress.address_label}
                    onChange={(e) => setNewAddress({ ...newAddress, address_label: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option>Home</option>
                    <option>Work</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Address Line 1</label>
                  <input
                    required
                    value={newAddress.address_line1}
                    onChange={(e) => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="House/Flat no., Building name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Address Line 2</label>
                  <input
                    value={newAddress.address_line2}
                    onChange={(e) => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                    placeholder="Street, Area (optional)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">City</label>
                    <input
                      required
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      placeholder="New Delhi"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">State</label>
                    <input
                      required
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      placeholder="Delhi"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Pincode</label>
                    <input
                      required
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      placeholder="110001"
                      pattern="[0-9]{6}"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Phone</label>
                    <input
                      required
                      value={newAddress.phone_number}
                      onChange={(e) => setNewAddress({ ...newAddress, phone_number: e.target.value })}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="default"
                    checked={newAddress.is_default}
                    onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="default" className="text-sm font-medium">Set as default address</label>
                </div>

                <Button type="submit" className="w-full">Save Address</Button>
              </form>
            </CardBody>
          </Card>
        )}

        {/* Addresses List */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-10 bg-surface rounded-2xl border border-dashed">
            <MapPin className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm font-medium text-foreground">No saved addresses</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first address for faster checkout</p>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <Card key={address.id} className={`relative overflow-hidden ${address.is_default ? 'ring-2 ring-primary' : ''}`}>
                <CardBody className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {address.address_label === 'Home' ? (
                        <Home className="w-5 h-5 text-primary" />
                      ) : address.address_label === 'Work' ? (
                        <Building className="w-5 h-5 text-primary" />
                      ) : (
                        <MapPin className="w-5 h-5 text-primary" />
                      )}
                      <div>
                        <h4 className="font-bold text-foreground">{address.address_label}</h4>
                        {address.is_default && (
                          <span className="text-xs text-primary font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Default
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!address.is_default && (
                        <button
                          onClick={() => setDefaultAddress(address.id)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => deleteAddress(address.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>{address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}</p>
                    <p>{address.city}, {address.state} - {address.pincode}</p>
                    <p className="font-medium text-foreground">{address.phone_number}</p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
