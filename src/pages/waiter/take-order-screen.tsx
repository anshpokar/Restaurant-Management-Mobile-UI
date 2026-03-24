import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCart, type CartItem } from '@/contexts/cart-context';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { supabase, type Profile, getStoredUser, type MenuItem } from '@/lib/supabase';
import { ShoppingBag, Plus, Minus, Trash2, ChefHat, Flame } from 'lucide-react';


export function WaiterTakeOrderScreen() {
  const navigate = useNavigate();
  const { tableId } = useParams<{ tableId: string }>();
  const location = useLocation();
  
  // Get customer info from navigation state
  const customerInfo = location.state as any || {};
  const { profile } = { profile: null as Profile | null }; // Waiter's profile
  const userId = profile?.id || getStoredUser()?.id;

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const { 
    cartItems, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    updateSpecialInstructions, 
    updateSpiceLevel,
    clearCart,
    setWaiterContext
  } = useCart();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCart, setShowCart] = useState(false);

  useEffect(() => {
    fetchMenuItems();
    if (tableId) {
      setWaiterContext(tableId, null, customerInfo);
    }
  }, [tableId, customerInfo]);

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSpecialInstructions = (itemId: number, instructions: string) => {
    updateSpecialInstructions(itemId, instructions);
  };

  const handleUpdateSpiceLevel = (itemId: number, level: 'mild' | 'medium' | 'spicy' | 'extra_spicy') => {
    updateSpiceLevel(itemId, level);
  };

  const totalAmount = cartItems.reduce((sum: number, item: CartItem) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

  const handleSubmitOrder = async () => {
    if (!tableId || cartItems.length === 0) {
      alert('Please add items to cart first');
      return;
    }

    setSubmitting(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          table_id: tableId,
          order_type: 'dine_in',
          placed_by: 'waiter',
          customer_name: customerInfo.customerName || 'Walk-in Customer',
          customer_email: customerInfo.customerEmail || null,
          customer_phone: customerInfo.customerPhone || null,
          total_amount: totalAmount,
          status: 'placed',
          payment_status: 'pending',
          payment_method: null
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = cartItems.map((item: CartItem) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        special_instructions: item.special_instructions || null,
        spice_level: item.spice_level || null
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // Update table status
      await supabase
        .from('restaurant_tables')
        .update({
          status: 'occupied',
          occupied_at: new Date().toISOString(),
          occupied_by_customer_name: customerInfo.customerName || 'Walk-in Customer',
          occupied_by_customer_email: customerInfo.customerEmail || null,
          current_order_id: order.id
        })
        .eq('id', tableId);

      alert('Order placed successfully! Sent to kitchen.');
      clearCart();
      // Navigate back to table selection
      navigate('/waiter/dashboard');
    } catch (error: any) {
      console.error('Error placing order:', error);
      alert('Failed to place order: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)))];
  
  const filteredItems = selectedCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const getSpiceLevelColor = (level: string) => {
    switch (level) {
      case 'mild': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'spicy': return 'bg-orange-500';
      case 'extra_spicy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title={`Table ${tableId} - Take Order`} />

      <div className="px-4 py-4 space-y-4">
        {/* Customer Info Banner */}
        {customerInfo.customerName && (
          <Card>
            <CardBody className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-primary uppercase">Customer</p>
                  <p className="text-sm font-medium text-foreground">
                    {customerInfo.customerName}
                    {customerInfo.customerEmail && ' ✓'}
                  </p>
                </div>
                <Badge variant={customerInfo.customerEmail ? 'success' : 'info'}>
                  {customerInfo.customerEmail ? 'Linked' : 'Walk-in'}
                </Badge>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat === 'all' ? 'All Items' : cat}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading menu...</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredItems.map((item: MenuItem) => {
              const inCart = cartItems.find((i: CartItem) => i.menu_item_id === item.id);
              
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardBody className="p-4">
                    <div className="flex gap-4">
                      {/* Item Image */}
                      <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                        {item.image}
                      </div>

                      {/* Item Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-foreground">{item.name}</h3>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-primary">₹{item.price}</p>
                            {item.is_special && (
                              <Badge variant="paid" className="mt-1">Special</Badge>
                            )}
                          </div>
                        </div>

                        {/* Add to Cart / Quantity Controls */}
                        {!inCart ? (
                          <Button
                            onClick={() => addToCart(item)}
                            size="sm"
                            className="w-full mt-2"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add to Order
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <button
                               onClick={() => {
                                 const itemInCart = cartItems.find((i: CartItem) => i.menu_item_id === item.id);
                                 if (itemInCart) {
                                   updateQuantity(item.id, itemInCart.quantity - 1);
                                 }
                               }}
                               className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                             >
                               <Minus className="w-4 h-4" />
                             </button>
                             <span className="font-bold text-foreground min-w-[30px] text-center">
                               {inCart.quantity}
                             </span>
                             <button
                               onClick={() => updateQuantity(item.id, inCart.quantity + 1)}
                               className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                             >
                               <Plus className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => removeFromCart(item.id)}
                               className="ml-auto text-red-500 hover:bg-red-50 p-2 rounded-lg"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        )}

                        {/* Special Instructions & Spice Level (if in cart) */}
                        {inCart && (
                          <div className="mt-3 pt-3 border-t border-divider space-y-2">
                            <input
                              type="text"
                              placeholder="Special instructions (optional)"
                              value={inCart.special_instructions || ''}
                              onChange={(e) => handleUpdateSpecialInstructions(item.id, e.target.value)}
                              className="w-full px-3 py-1.5 bg-surface border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary outline-none"
                            />
                            
                            <div className="flex items-center gap-2">
                              <Flame className="w-3 h-3 text-muted-foreground" />
                              <select
                                value={inCart.spice_level || 'medium'}
                                onChange={(e) => handleUpdateSpiceLevel(item.id, e.target.value as any)}
                                className="px-2 py-1 bg-surface border border-border rounded-lg text-xs focus:ring-2 focus:ring-primary outline-none"
                              >
                                <option value="mild">Mild</option>
                                <option value="medium">Medium</option>
                                <option value="spicy">Spicy</option>
                                <option value="extra_spicy">Extra Spicy</option>
                              </select>
                              <div className={`w-2 h-2 rounded-full ${getSpiceLevelColor(inCart.spice_level || 'medium')}`} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}

        {/* Floating Cart Summary & Submit Button */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-divider p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{totalItems} items</p>
                  <p className="text-xs text-muted-foreground">Total: ₹{totalAmount}</p>
                </div>
              </div>
              <Button
                onClick={() => setShowCart(!showCart)}
                variant="outline"
                size="sm"
              >
                {showCart ? 'Hide' : 'View'} Cart
              </Button>
            </div>

            {showCart && (
              <div className="max-h-48 overflow-y-auto space-y-2 mb-3 text-sm">
                {cartItems.map((item: CartItem) => (
                  <div key={item.menu_item_id} className="flex justify-between items-center">
                    <span className="text-foreground">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="font-medium text-muted-foreground">
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={handleSubmitOrder}
              disabled={submitting || cartItems.length === 0}
              className="w-full h-12 text-lg"
            >
              <ChefHat className="w-5 h-5 mr-2" />
              {submitting ? 'Submitting...' : `Send to Kitchen (₹${totalAmount})`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
