import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, CartItem } from '@/lib/supabase';
import { useCart } from '@/contexts/cart-context';
import { AppHeader } from '@/components/design-system/app-header';
import { Button } from '@/components/design-system/button';
import { Card, CardBody } from '@/components/design-system/card';
import { ShoppingBag, UtensilsCrossed, Bike, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';

export function CheckoutScreen() {
  const navigate = useNavigate();
  const { cartItems, clearCart, getTotalAmount } = useCart();
  const [loading, setLoading] = useState(false);
  
  // Order type selection
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery' | null>(null);
  
  // Dine-in fields
  const [tableId, setTableId] = useState('');
  const [tables, setTables] = useState<Array<{ id: string; table_number: number; capacity: number }>>([]);
  
  // Delivery fields
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [addresses, setAddresses] = useState<Array<{ id: string; address_line1: string; city: string; pincode: string }>>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    phone_number: ''
  });

  // Fetch tables and addresses on mount
  useState(() => {
    fetchTables();
    fetchAddresses();
  });

  async function fetchTables() {
    try {
      const { data, error } = await supabase
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

      const { data, error } = await supabase
        .from('addresses')
        .select('id, address_line1, city, state, pincode')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (data) {
        setAddresses(data);
        if (data.length > 0) {
          setSelectedAddress(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  }

  async function handleSaveAddress() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          address_label: newAddress.address_line1.split(' ')[0] || 'Home',
          address_line1: newAddress.address_line1,
          city: newAddress.city,
          state: newAddress.state,
          pincode: newAddress.pincode,
          phone_number: newAddress.phone_number,
          is_default: addresses.length === 0
        })
        .select()
        .single();

      if (error) throw error;

      setAddresses([...addresses, data]);
      setSelectedAddress(data.id);
      setShowAddressForm(false);
      setNewAddress({
        address_line1: '',
        city: '',
        state: '',
        pincode: '',
        phone_number: ''
      });

      toast.success('Address saved successfully!');
    } catch (error: any) {
      toast.error('Failed to save address: ' + error.message);
    }
  }

  async function handleSubmit() {

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to place order');
        navigate('/auth/login');
        return;
      }

      // Calculate total
      const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Get address details if delivery
      let deliveryAddressText = null;
      let deliveryPincode = null;
      let deliveryLatitude = null;
      let deliveryLongitude = null;

      if (orderType === 'delivery' && selectedAddress) {
        const { data: addressData } = await supabase
          .from('addresses')
          .select('address_line1, city, state, pincode, latitude, longitude')
          .eq('id', selectedAddress)
          .single();

        if (addressData) {
          deliveryAddressText = `${addressData.address_line1}, ${addressData.city}, ${addressData.state} - ${addressData.pincode}`;
          deliveryPincode = addressData.pincode;
          deliveryLatitude = addressData.latitude;
          deliveryLongitude = addressData.longitude;
        }
      }

      // Insert order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_type: orderType,
          table_id: orderType === 'dine_in' ? tableId : null,
          delivery_address: deliveryAddressText,
          delivery_pincode: deliveryPincode,
          delivery_latitude: deliveryLatitude,
          delivery_longitude: deliveryLongitude,
          total_amount: totalAmount,
          status: 'placed',
          payment_status: 'pending',
          payment_method: 'upi'
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

      // Update table status if dine-in
      if (orderType === 'dine_in') {
        await supabase
          .from('restaurant_tables')
          .update({ status: 'occupied' })
          .eq('id', tableId);
      }

      // Clear cart
      clearCart();

      toast.success('Order placed successfully! Proceeding to payment...');

      // Redirect to UPI payment
      setTimeout(() => {
        navigate(`/customer/payment/${order.id}`);
      }, 1000);

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

                <div className="border-t mt-3 pt-3">
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">₹{calculateTotal()}</span>
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
                      <div className="mt-3 pl-12">
                        <label className="block text-sm mb-2">Select Table</label>
                        {tables.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No tables available right now</p>
                        ) : (
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
                            
                            <Button
                              onClick={() => setShowAddressForm(true)}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <MapPin className="w-4 h-4 mr-2" />
                              Add New Address
                            </Button>
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
                            
                            <input
                              type="text"
                              placeholder="Address Line 1"
                              value={newAddress.address_line1}
                              onChange={(e) => setNewAddress({...newAddress, address_line1: e.target.value})}
                              className="w-full p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="City"
                                value={newAddress.city}
                                onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                                className="p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                              />
                              <input
                                type="text"
                                placeholder="State"
                                value={newAddress.state}
                                onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                                className="p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Pincode"
                                value={newAddress.pincode}
                                onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})}
                                className="p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                              />
                              <input
                                type="tel"
                                placeholder="Phone Number"
                                value={newAddress.phone_number}
                                onChange={(e) => setNewAddress({...newAddress, phone_number: e.target.value})}
                                className="p-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary outline-none"
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
                </div>
              </CardBody>
            </Card>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={loading || !orderType || (orderType === 'dine_in' && !tableId)}
                className="w-full h-14 text-lg font-semibold"
              >
                {loading ? (
                  'Processing...'
                ) : orderType === 'dine_in' ? (
                  `Pay ₹${calculateTotal()} & Dine In`
                ) : orderType === 'delivery' ? (
                  `Pay ₹${calculateTotal()} for Delivery`
                ) : (
                  'Select Order Type to Continue'
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground mt-3">
                You'll be redirected to UPI payment after clicking continue
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
