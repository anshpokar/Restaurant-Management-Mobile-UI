import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/contexts/cart-context';
import { AppHeader } from '@/components/design-system/app-header';
import { Button } from '@/components/design-system/button';
import { Card, CardBody } from '@/components/design-system/card';
import { ShoppingBag, MapPin, X, CreditCard, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { LeafletAddressPicker } from '../delivery/leaflet-address-picker';

export function CheckoutScreen() {
  const navigate = useNavigate();
  const { 
    cartItems, 
    clearCart, 
    getTotalAmount, 
    appliedOffer, 
    applyCoupon, 
    removeCoupon, 
    getDiscountAmount 
  } = useCart();
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  
  // Order type selection
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery' | null>(null);
  
  // Dine-in fields
  const [tableId, setTableId] = useState('');
  const [tables, setTables] = useState<Array<{ id: string; table_number: number; capacity: number }>>([]);
  
  // Delivery fields
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [addresses, setAddresses] = useState<Array<{ id: string; address_line1: string; city: string; pincode: string }>>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchCache, setSearchCache] = useState<Record<string, any[]>>({});
  const [newAddress, setNewAddress] = useState({
    address_line1: '',
    flat_number: '',
    house_number: '',
    building_name: '',
    city: '',
    phone_number: '',
    latitude: null as number | null,
    longitude: null as number | null
  });

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi'>('cod');
  
  // Dine-in session management
  const [sessionName, setSessionName] = useState('');
  const [activeSession, setActiveSession] = useState<string | null>(null); // Session ID

  // Fetch tables and addresses on mount
  useEffect(() => {
    fetchTables();
    fetchAddresses();
    checkActiveSession();
  }, []);

  async function checkActiveSession() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('Checking active session for user:', user.id);

      // Check for active dine-in session in database
      const { data: sessions, error } = await supabase
        .from('dine_in_sessions')
        .select('id, session_name, table_id')
        .eq('user_id', user.id)
        .eq('session_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching active session:', error);
        throw error;
      }
      
      console.log('Active sessions found:', sessions);
      
      if (sessions && sessions.length > 0) {
        setActiveSession(sessions[0].id);
        setSessionName(sessions[0].session_name || `Table ${sessions[0].table_id}`);
        console.log('Active session set:', sessions[0].id, sessions[0].session_name);
      } else {
        console.log('No active sessions found');
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  }

  async function fetchTables() {
    try {
      const { data } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, capacity')
        .eq('status', 'available')
        .order('table_number');
      
      if (data) setTables(data);
    } catch (error) {
      console.error('Error fetching tables:', error);
    }
  }

  async function fetchAddresses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: addressesData } = await supabase
        .from('addresses')
        .select('id, address_line1, city, pincode')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (addressesData) {
        setAddresses(addressesData);
        if (addressesData.length > 0) {
          setSelectedAddress(addressesData[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  }

  async function handleSaveAddress() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save addresses');
        return;
      }

      console.log('Saving address with coords:', newAddress.latitude, newAddress.longitude);

      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          address_label: newAddress.building_name || 'Home',
          address_line1: newAddress.address_line1,
          address_line2: `${newAddress.flat_number}, ${newAddress.building_name}`,
          city: newAddress.city,
          phone_number: newAddress.phone_number,
          latitude: newAddress.latitude,
          longitude: newAddress.longitude,
          flat_number: newAddress.flat_number,
          house_number: newAddress.house_number,
          building_name: newAddress.building_name,
          is_default: addresses.length === 0
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error saving address:', error);
        throw error;
      }

      setAddresses([...addresses, data]);
      setSelectedAddress(data.id);
      setShowAddressForm(false);
      setNewAddress({
        address_line1: '',
        flat_number: '',
        house_number: '',
        building_name: '',
        city: '',
        phone_number: '',
        latitude: null,
        longitude: null
      });

      toast.success('Address saved successfully!');
    } finally {
      setLoading(false);
    }
  }

  // Debounced address search
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = newAddress.address_line1.trim();
      if (query.length >= 3) {
        // Skip if already selected this exact address or if it's in cache
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
    }, 800); // Photon is faster and more liberal with limits

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

  async function handlePlaceOrder() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to place order');
        navigate('/auth/login');
        return;
      }

      // Validate required fields
      if (orderType === 'dine_in' && !tableId) {
        toast.error('Please select a table');
        return;
      }

      if (orderType === 'delivery' && !selectedAddress) {
        toast.error('Please select a delivery address');
        return;
      }

      setLoading(true);

      // Calculate total (discounted)
      const totalAmount = getTotalAmount();
      const discountAmount = getDiscountAmount();
      const couponUsed = appliedOffer?.discount_code;

      // ============================================
      // SPECIAL FLOW: Dine-In Session Management
      // ============================================
      if (orderType === 'dine_in') {
        try {
          let sessionId = activeSession;

          // If no active session, create a new one
          if (!sessionId) {
            // Prompt user for session name
            if (!sessionName.trim()) {
              setLoading(false);
              toast.info('Please enter a session name');
              return;
            }

            // Create new dine-in session
            const { data: session, error: sessionError } = await supabase
              .from('dine_in_sessions')
              .insert({
                table_id: tableId,
                user_id: user.id,
                session_status: 'active',
                payment_status: 'pending',
                total_amount: totalAmount,
                paid_amount: 0,
                session_name: sessionName.trim(),
                notes: `Session: ${sessionName.trim()}`
              })
              .select('id, session_name, table_id')
              .single();

            if (sessionError) throw sessionError;

            sessionId = session.id;
            setActiveSession(sessionId);
            toast.success(`Session "${sessionName}" started!`);
          }

          // Create order linked to session
          const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
              user_id: user.id,
              order_type: 'dine_in',
              table_id: tableId,
              total_amount: totalAmount,
              status: 'placed',
              payment_status: 'pending',
              payment_method: 'cod', // Will update when paying
              is_paid: false,
               placed_by: 'customer',
               session_id: sessionId,
               notes: `Dine-in Session: ${sessionId}`,
               session_name: sessionName.trim() // Add session_name for easier lookup
            })
            .select()
            .single();

          if (orderError) throw orderError;

          // Insert order items
          const orderItemsData = cartItems.map(item => ({
            order_id: order.id,
            menu_item_id: item.menu_item_id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            image: item.image || ''
          }));

          const { error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItemsData);

          if (itemsError) throw itemsError;

          // Update table status
          await supabase
            .from('restaurant_tables')
            .update({ status: 'occupied' })
            .eq('id', tableId);

          clearCart();

          toast.success(`Added to session "${sessionName}"!`);
          setTimeout(() => {
            navigate(`/customer/orders`);
          }, 1000);

          return; // Exit early for dine-in flow
        } catch (error: any) {
          console.error('Dine-in session error:', error);
          toast.error('Failed to manage session: ' + error.message);
          setLoading(false);
          return;
        }
      }

      // ============================================
      // REGULAR ORDER FLOW (Delivery)
      // ============================================

      // Get address details if delivery
      let deliveryAddressText = null;
      let deliveryPincode = null;
      let deliveryLatitude = null;
      let deliveryLongitude = null;

      if (orderType === 'delivery' && selectedAddress) {
        try {
          const { data: addressData, error: addressError } = await supabase
            .from('addresses')
            .select('address_line1, city, state, pincode, latitude, longitude')
            .eq('id', selectedAddress)
            .single();

          if (addressError) {
            console.error('Error fetching address:', addressError);
            throw new Error('Could not fetch delivery address');
          }

          if (addressData) {
            deliveryAddressText = `${addressData.address_line1}, ${addressData.city}, ${addressData.state} - ${addressData.pincode}`;
            deliveryPincode = addressData.pincode;
            deliveryLatitude = addressData.latitude;
            deliveryLongitude = addressData.longitude;
          }
        } catch (error: any) {
          console.error('Address fetch error:', error);
          toast.error('Please select a valid delivery address');
          setLoading(false);
          return;
        }
      }

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_type: orderType,
          table_id: null, // Delivery orders don't have table_id
          delivery_address: deliveryAddressText,
          delivery_pincode: deliveryPincode,
          delivery_latitude: deliveryLatitude,
          delivery_longitude: deliveryLongitude,
          total_amount: totalAmount,
          discount_amount: discountAmount,
          coupon_code: couponUsed,
          status: 'placed',
          payment_status: 'pending',
          payment_method: paymentMethod,
          is_paid: paymentMethod === 'cod' ? false : false,
          placed_by: 'customer'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItemsData = cartItems.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image || ''
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // Clear cart
      clearCart();

      // Handle based on payment method
      if (paymentMethod === 'cod') {
        toast.success('Order placed successfully! Pay on delivery.');
        setTimeout(() => {
          navigate(`/customer/orders`);
        }, 1000);
      } else {
        // UPI Payment - Show payment window
        toast.success('Order placed! Proceeding to payment...');
        setTimeout(() => {
          navigate(`/customer/payment/${order.id}`);
        }, 500);
      }

    } catch (error: any) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  const calculateTotal = getTotalAmount;

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Checkout" />

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        
        {/* Empty Cart State */}
        {cartItems.length === 0 ? (
          <Card>
            <CardBody className="p-8 text-center">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h2 className="text-xl font-bold mb-2">Your Cart is Empty</h2>
              <p className="text-muted-foreground mb-4">Add some delicious items first!</p>
              <Button onClick={() => navigate('/customer/menu')}>
                Browse Menu
              </Button>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Cart Summary */}
            <Card>
              <CardBody className="p-4">
                <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Order Summary
                </h2>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.menu_item_id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm bg-primary/10 px-2 py-1 rounded">
                          {item.quantity}x
                        </span>
                        <span className="text-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium text-muted-foreground">
                        ₹{item.price * item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t mt-3 pt-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">₹{cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
                  </div>
                  
                  {getDiscountAmount() > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600 font-bold">
                      <div className="flex items-center gap-1">
                        <span>Discount ({appliedOffer?.discount_code}):</span>
                      </div>
                      <span>-₹{getDiscountAmount()}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center font-bold text-lg pt-1 border-t border-dashed">
                    <span>Total Payable:</span>
                    <span className="text-primary">₹{getTotalAmount()}</span>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Order Type Selection */}
            <Card>
              <CardBody className="p-4">
                <h2 className="font-bold text-lg mb-4">Select Order Type</h2>
                
                <div className="space-y-3">
                  {/* Dine-in Option */}
                  <button
                    onClick={() => setOrderType('dine_in')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      orderType === 'dine_in' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">🍽️</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">Dine-in</h3>
                        <p className="text-sm text-muted-foreground">
                          Eat at our restaurant
                        </p>
                      </div>
                      {orderType === 'dine_in' && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {orderType === 'dine_in' && (
                      <div className="mt-3 pl-12 space-y-3">
                        {/* Table Selection */}
                        <div>
                          <label className="block text-sm mb-2">Select Table</label>
                          <select
                            value={tableId}
                            onChange={(e) => setTableId(e.target.value)}
                            className="w-full p-3 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                          >
                            <option value="">Choose a table...</option>
                            {tables.map(table => (
                              <option key={table.id} value={table.id}>
                                Table {table.table_number} (Capacity: {table.capacity})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Session Name Input - Only if no active session */}
                        {!activeSession && tableId && (
                          <div>
                            <label className="block text-sm mb-2">Session Name</label>
                            <input
                              type="text"
                              placeholder="e.g., Lunch with Friends, Birthday Party"
                              value={sessionName}
                              onChange={(e) => setSessionName(e.target.value)}
                              className="w-full p-3 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Give your dining session a name for easy identification
                            </p>
                          </div>
                        )}

                        {/* Active Session Info */}
                        {activeSession && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <p className="text-sm font-bold text-green-800">
                                Active Session: "{sessionName}"
                              </p>
                            </div>
                            <p className="text-xs text-green-700 mt-1">
                              Orders will be added to this session
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                  </button>

                  {/* Delivery Option */}
                  <button
                    onClick={() => setOrderType('delivery')}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      orderType === 'delivery' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-3xl">🚴</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">Delivery</h3>
                        <p className="text-sm text-muted-foreground">
                          Get it delivered to your door
                        </p>
                      </div>
                      {orderType === 'delivery' && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {orderType === 'delivery' && (
                      <div className="mt-3 pl-12 space-y-3">
                        {!showAddressForm ? (
                          <>
                            {addresses.length > 0 && (
                              <div>
                                <label className="block text-sm mb-2">Select Address</label>
                                <select
                                  value={selectedAddress}
                                  onChange={(e) => setSelectedAddress(e.target.value)}
                                  className="w-full p-3 bg-surface border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                >
                                  {addresses.map(addr => (
                                    <option key={addr.id} value={addr.id}>
                                      {addr.address_line1}, {addr.city} - {addr.pincode}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            
                            <div className="mt-3">
                              <Button
                                onClick={() => setShowAddressForm(true)}
                                variant="outline"
                                size="sm"
                                className="w-full"
                              >
                                <MapPin className="w-4 h-4 mr-2" />
                                Add New Address
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="bg-surface p-3 rounded-lg space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="font-semibold text-sm">New Address</h4>
                              <button
                                onClick={() => setShowAddressForm(false)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="relative mb-3">
                              <input
                                type="text"
                                placeholder="Search Area / Locality"
                                value={newAddress.address_line1}
                                onChange={(e) => {
                                  setNewAddress({...newAddress, address_line1: e.target.value});
                                }}
                                className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none pr-10 text-sm"
                              />
                              <MapPin className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                              
                              {isSearching && (
                                <div className="absolute right-10 top-3.5">
                                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                              
                              {(addressSuggestions.length > 0 || searchError) && (
                                <div className="absolute z-[1001] w-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                  {searchError && (
                                    <div className="p-3 text-xs text-red-500 font-medium bg-red-50 items-center flex gap-2">
                                      <MapPin className="w-3 h-3" />
                                      {searchError}
                                    </div>
                                  )}
                                  {addressSuggestions.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-0 text-xs font-medium"
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

                            <div className="mb-3">
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
                            
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder="Flat No."
                                value={newAddress.flat_number}
                                onChange={(e) => setNewAddress({...newAddress, flat_number: e.target.value})}
                                className="p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                              />
                              <input
                                type="text"
                                placeholder="House No."
                                value={newAddress.house_number}
                                onChange={(e) => setNewAddress({...newAddress, house_number: e.target.value})}
                                className="p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                              />
                            </div>
                            
                            <input
                              type="text"
                              placeholder="Building Name"
                              value={newAddress.building_name}
                              onChange={(e) => setNewAddress({...newAddress, building_name: e.target.value})}
                              className="w-full p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                            />

                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder="City"
                                value={newAddress.city}
                                onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                                className="p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                              />
                              <input
                                type="tel"
                                placeholder="Phone Number"
                                value={newAddress.phone_number}
                                onChange={(e) => setNewAddress({...newAddress, phone_number: e.target.value})}
                                className="p-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none"
                              />
                            </div>
                            
                            <Button onClick={handleSaveAddress} className="w-full">
                              Save Address
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Delivery Coupon Section */}
                  {orderType === 'delivery' && (
                    <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-black text-xs uppercase tracking-widest text-primary">Apply Coupon</h4>
                        {appliedOffer && (
                          <button 
                            onClick={removeCoupon}
                            className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Remove
                          </button>
                        )}
                      </div>
                      
                      {appliedOffer ? (
                        <div className="flex items-center justify-between p-3 bg-white rounded-xl border-2 border-dashed border-green-500">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-xl">🎉</div>
                            <div>
                              <p className="font-black text-sm text-green-700">{appliedOffer.discount_code}</p>
                              <p className="text-[10px] text-green-600 font-medium">{appliedOffer.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-green-700">-₹{getDiscountAmount()}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter Code (e.g. NAV30)"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            className="flex-1 p-3 bg-white border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm uppercase"
                          />
                          <Button 
                            className="px-6 h-12 rounded-xl"
                            disabled={!couponCode || isApplying}
                            onClick={async () => {
                              setIsApplying(true);
                              const result = await applyCoupon(couponCode);
                              if (result.success) {
                                toast.success(result.message);
                                setCouponCode('');
                              } else {
                                toast.error(result.message);
                              }
                              setIsApplying(false);
                            }}
                          >
                            {isApplying ? '...' : 'APPLY'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Payment Method Selection - Only for Delivery */}
            {orderType && orderType !== 'dine_in' && (
              <Card>
                <CardBody className="p-4">
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Method
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Cash on Delivery Option */}
                    <button
                      onClick={() => setPaymentMethod('cod')}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'cod' 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-border hover:border-green-300'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          paymentMethod === 'cod' ? 'bg-green-500 text-white' : 'bg-gray-200'
                        }`}>
                          <IndianRupee className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">Cash on Delivery</h3>
                          <p className="text-xs text-muted-foreground mt-1">Pay when you receive</p>
                        </div>
                        {paymentMethod === 'cod' && (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>

                    {/* UPI/Prepaid Option */}
                    <button
                      onClick={() => setPaymentMethod('upi')}
                      className={`w-full p-4 rounded-lg border-2 transition-all ${
                        paymentMethod === 'upi' 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-border hover:border-blue-300'
                      }`}
                    >
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          paymentMethod === 'upi' ? 'bg-blue-500 text-white' : 'bg-gray-200'
                        }`}>
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">Prepaid (UPI)</h3>
                          <p className="text-xs text-muted-foreground mt-1">Pay online via UPI</p>
                        </div>
                        {paymentMethod === 'upi' && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Payment Info */}
                  {paymentMethod === 'cod' ? (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs text-green-800 font-medium">
                        💵 You'll pay cash when you receive your order
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800 font-medium">
                        📱 You'll be redirected to UPI payment page after placing order
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                onClick={handlePlaceOrder}
                disabled={loading || !orderType || (orderType === 'dine_in' && !tableId)}
                className="w-full h-14 text-lg font-semibold"
              >
                {loading ? (
                  'Processing...'
                ) : orderType === 'dine_in' ? (
                  activeSession 
                    ? `Add to Session "${sessionName}"`
                    : sessionName 
                      ? `Start Session "${sessionName}"`
                      : 'Enter Session Name to Continue'
                ) : orderType === 'delivery' ? (
                  `Pay ₹${calculateTotal()} for Delivery`
                ) : (
                  'Select Order Type to Continue'
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-3">
                {orderType === 'dine_in' 
                  ? '🍽️ Dine-in session - Pay when you\'re done eating'
                  : paymentMethod === 'cod' 
                    ? '💵 Cash on Delivery - Pay when you receive your order' 
                    : '📱 You will be redirected to UPI payment page'
                }
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
