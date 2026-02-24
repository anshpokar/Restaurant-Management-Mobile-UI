import React, { useState } from 'react';
import { BottomNav, BottomNavItem } from '../design-system/bottom-nav';
import { Home, Menu, Calendar, ShoppingBag, User, ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react';
import { HomeScreen } from './home-screen';
import { MenuScreen, type MenuItem } from './menu-screen';
import { BookingsScreen } from './bookings-screen';
import { OrdersScreen } from './orders-screen';
import { ProfileScreen } from './profile-screen';
import { Card, CardBody } from '../design-system/card';
import { Button } from '../design-system/button';
import { Profile, supabase } from '@/lib/supabase';

export interface CartItem extends MenuItem {
  quantity: number;
}

type CustomerTab = 'home' | 'menu' | 'bookings' | 'orders' | 'profile';

interface CustomerAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function CustomerApp({ onLogout, profile }: CustomerAppProps) {
  const [activeTab, setActiveTab] = useState<CustomerTab>(() => {
    return (localStorage.getItem('customerActiveTab') as CustomerTab) || 'home';
  });
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cartItems');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Persistence Effects
  React.useEffect(() => {
    localStorage.setItem('customerActiveTab', activeTab);
  }, [activeTab]);

  React.useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: MenuItem) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    try {
      // Prefer profile ID (supports demo mode)
      const userId = profile?.id;

      if (!userId) {
        alert('Please login to place an order');
        return;
      }

      // 1. Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: userId,
          total_amount: totalAmount,
          status: 'placed',
          delivery_address: 'Home - Connaught Place' // Simplified for demo
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items
      const orderItemsData = cartItems.map(item => ({
        order_id: order.id,
        menu_item_id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      alert('Order placed successfully! The chef is now viewing your order.');
      setCartItems([]);
      setIsCartOpen(false);
      setActiveTab('orders');
    } catch (error: any) {
      console.error('Error placing order:', error);
      alert('Failed to place order: ' + error.message);
    }
  };

  return (
    <div className="relative min-h-screen bg-background pb-16">
      {activeTab === 'home' && (
        <HomeScreen
          onNavigate={(tab: CustomerTab) => setActiveTab(tab)}
          onAddToCart={addToCart}
          profile={profile}
        />
      )}
      {activeTab === 'menu' && <MenuScreen onAddToCart={addToCart} />}
      {activeTab === 'bookings' && <BookingsScreen />}
      {activeTab === 'orders' && <OrdersScreen profile={profile} />}
      {activeTab === 'profile' && <ProfileScreen onLogout={onLogout} profile={profile} />}

      {/* Floating Cart Button */}
      {cartItems.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed right-6 bottom-24 w-16 h-16 bg-primary text-white rounded-full shadow-2xl flex items-center justify-center z-40 animate-bounce-subtle active:scale-95 transition-all"
        >
          <div className="relative">
            <ShoppingCart className="w-7 h-7" />
            <span className="absolute -top-3 -right-3 bg-secondary text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-primary">
              {totalItems}
            </span>
          </div>
        </button>
      )}

      {/* Cart Drawer */}
      {/* ... (Cart JSX remains the same) */}

      {/* Cart Drawer/Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-card rounded-t-[32px] sm:rounded-[32px] shadow-2xl max-h-[85vh] flex flex-col animate-slide-up">
            <div className="p-6 border-b border-divider flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Your Cart</h2>
                <p className="text-sm text-muted-foreground">{totalItems} items selected</p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center text-3xl">
                    {item.image}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-foreground">{item.name}</h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">₹{item.price}</p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold text-foreground min-w-[20px] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="ml-auto font-bold text-foreground">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-divider bg-muted/30">
              <div className="flex justify-between items-center mb-6">
                <span className="text-muted-foreground font-medium">Total Amount</span>
                <span className="text-2xl font-black text-foreground">₹{totalAmount}</span>
              </div>
              <Button
                className="w-full h-14 text-lg rounded-2xl"
                onClick={handlePlaceOrder}
              >
                Place Order
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav>
        <BottomNavItem
          icon={<Home className="w-6 h-6" />}
          label="Home"
          active={activeTab === 'home'}
          onClick={() => setActiveTab('home')}
        />
        <BottomNavItem
          icon={<Menu className="w-6 h-6" />}
          label="Menu"
          active={activeTab === 'menu'}
          onClick={() => setActiveTab('menu')}
        />
        <BottomNavItem
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Orders"
          active={activeTab === 'orders'}
          onClick={() => setActiveTab('orders')}
        />
        <BottomNavItem
          icon={<User className="w-6 h-6" />}
          label="Profile"
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        />
      </BottomNav>
    </div>
  );
}
