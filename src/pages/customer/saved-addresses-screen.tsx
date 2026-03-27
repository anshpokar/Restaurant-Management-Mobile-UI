import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { MapPin, Plus, Trash2, Home, Building, Check, X } from 'lucide-react';
import { LeafletAddressPicker } from '../delivery/leaflet-address-picker';
import { useOutletContext } from 'react-router-dom';
import { type Profile, type AddressInput } from '@/lib/supabase';
import { useAddresses } from '@/hooks/use-addresses';

export function SavedAddressesScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const { addresses, loading, addAddress, deleteAddress, setDefaultAddress } = useAddresses(profile?.id || null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCache, setSearchCache] = useState<Record<string, any[]>>({});
  
  const [newAddress, setNewAddress] = useState<AddressInput>({
    address_label: 'Home',
    address_line1: '',
    address_line2: '',
    city: '',
    phone_number: '',
    is_default: false,
    latitude: null,
    longitude: null,
    flat_number: '',
    house_number: '',
    building_name: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addAddress({
        ...newAddress,
        address_line2: [newAddress.flat_number, newAddress.house_number, newAddress.building_name].filter(Boolean).join(", ")
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
        is_default: false,
        latitude: null,
        longitude: null,
        flat_number: '',
        building_name: ''
      });
    } catch (error) {
      console.error('Failed to add address:', error);
    }
  };

  // Debounced address search
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = newAddress.address_line1.trim();
      if (query.length >= 3) {
        if (addressSuggestions.some(s => s.display_name === query)) return;
        
        if (searchCache[query]) {
          setAddressSuggestions(searchCache[query]);
          setSearchError(null);
          return;
        }
        
        performSearch(query);
      } else {
        setAddressSuggestions([]);
        setSearchError(null);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [newAddress.address_line1]);

  async function performSearch(query: string) {
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
      );
      
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      
      // Map Photon GeoJSON to our suggestion format
      const mapped = data.features.map((f: any) => ({
        display_name: [
          f.properties.name, 
          f.properties.housenumber,
          f.properties.street, 
          f.properties.district, 
          f.properties.city, 
          f.properties.state
        ].filter(Boolean).join(", "),
        lat: f.geometry.coordinates[1].toString(),
        lon: f.geometry.coordinates[0].toString(),
        address: {
          city: f.properties.city || f.properties.town || f.properties.district || ''
        }
      }));

      setAddressSuggestions(mapped);
      setSearchCache(prev => ({ ...prev, [query]: mapped }));
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Search unavailable. Use "Pin on Map".');
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Saved Addresses" />

      <div className="px-4 py-4 space-y-4">
        {/* Add Address Button */}
        {!isAdding ? (
          <Button onClick={() => setIsAdding(true)} className='w-full py-6 rounded-2xl'>
            <Plus className="w-5 h-5 mr-2" />
            Add New Address
          </Button>
        ) : (
          <Card className="border-2 border-primary/20 shadow-xl overflow-visible">
            <CardBody className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">New Address</h3>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Type Selector */}
                <div className="flex gap-2 p-1 bg-muted rounded-xl">
                  {['Home', 'Work', 'Other'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setNewAddress({...newAddress, address_label: label})}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
                        newAddress.address_label === label 
                        ? 'bg-background text-primary shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">
                    Search Locality
                  </label>
                  <input
                    type="text"
                    placeholder="Enter area, street name..."
                    value={newAddress.address_line1}
                    onChange={(e) => {
                      setNewAddress({...newAddress, address_line1: e.target.value});
                    }}
                    className="w-full p-3 bg-background border-2 border-border rounded-xl focus:ring-2 focus:ring-primary outline-none pr-10 text-sm font-medium"
                  />
                  <MapPin className="absolute right-3 top-8.5 w-4 h-4 text-muted-foreground" />
                  
                  {isSearching && (
                    <div className="absolute right-10 top-9">
                      <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  
                  { (addressSuggestions.length > 0 || searchError) && (
                    <div className="absolute z-[1001] w-full mt-1 bg-card border-2 border-border rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {searchError && (
                        <div className="p-3 text-xs text-red-500 font-medium bg-red-50 items-center flex gap-2">
                          <MapPin className="w-3 h-3" />
                          {searchError}
                        </div>
                      )}
                      {addressSuggestions.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-0 text-xs font-semibold transition-colors"
                          onClick={() => {
                            setNewAddress({
                              ...newAddress,
                              address_line1: item.display_name,
                              city: item.address?.city || item.address?.town || item.address?.village || '',
                              latitude: parseFloat(item.lat),
                              longitude: parseFloat(item.lon)
                            });
                            setAddressSuggestions([]);
                            setSearchError(null);
                          }}
                        >
                          {item.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Map Picker */}
                <div className="rounded-xl overflow-hidden border-2 border-border">
                  <LeafletAddressPicker 
                    initialPosition={newAddress.latitude && newAddress.longitude ? [newAddress.latitude, newAddress.longitude] : undefined}
                    onLocationSelect={(lat, lng, address, details) => {
                      setNewAddress({
                        ...newAddress,
                        address_line1: address,
                        city: details?.city || details?.town || details?.village || '',
                        latitude: lat,
                        longitude: lng
                      });
                    }}
                  />
                </div>

                {/* Detail Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Flat No.</label>
                    <input
                      type="text"
                      placeholder="e.g. 101"
                      value={newAddress.flat_number}
                      onChange={(e) => setNewAddress({...newAddress, flat_number: e.target.value})}
                      className="w-full p-3 bg-background border-2 border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">House No.</label>
                    <input
                      type="text"
                      placeholder="e.g. H-42"
                      value={newAddress.house_number}
                      onChange={(e) => setNewAddress({...newAddress, house_number: e.target.value})}
                      className="w-full p-3 bg-background border-2 border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Building Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Skyline Apts"
                    value={newAddress.building_name}
                    onChange={(e) => setNewAddress({...newAddress, building_name: e.target.value})}
                    className="w-full p-3 bg-background border-2 border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">City</label>
                    <input
                      type="text"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                      className="w-full p-3 bg-background border-2 border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="10 digit mobile"
                      value={newAddress.phone_number}
                      onChange={(e) => setNewAddress({...newAddress, phone_number: e.target.value})}
                      className="w-full p-3 bg-background border-2 border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-xl">
                  <input
                    type="checkbox"
                    id="default"
                    checked={newAddress.is_default}
                    onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="default" className="text-sm font-bold text-primary">Set as default address</label>
                </div>

                <Button onClick={handleSubmit} className="w-full py-4 text-sm font-bold uppercase tracking-widest rounded-xl">
                  Save Address
                </Button>
              </div>
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
                    <p className='font-medium text-foreground'>
                      {[address.flat_number, address.house_number, address.building_name].filter(Boolean).join(", ")}
                    </p>
                    <p>{address.address_line1}</p>
                    <p>{address.city}{address.state ? `, ${address.state}` : ''}{address.pincode ? ` - ${address.pincode}` : ''}</p>
                    <p className="font-bold text-primary">{address.phone_number}</p>
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


