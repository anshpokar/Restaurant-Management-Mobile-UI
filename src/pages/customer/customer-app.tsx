import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { BottomNav, BottomNavItem } from '@/components/design-system/bottom-nav';
import { Home, Menu, ShoppingBag, User, ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/design-system/button';
import { Profile } from '@/lib/supabase';
import { useCart } from '@/hooks/use-cart';

interface CustomerAppProps {
  onLogout: () => void;
  profile: Profile | null;
}

export function CustomerApp({ onLogout, profile }: CustomerAppProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    totalAmount,
    totalItems,
    handlePlaceOrder
  } = useCart(profile);

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/customer/menu')) return 'menu';
    if (path.includes('/customer/bookings')) return 'bookings';
    if (path.includes('/customer/orders')) return 'orders';
    if (path.includes('/customer/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <div className="relative min-h-screen bg-background pb-16">
      <div className="flex-1">
        <Outlet context={{ addToCart, cartItems, totalItems, totalAmount, onLogout }} />
      </div>

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
          onClick={() => navigate('/customer/home')}
        />
        <BottomNavItem
          icon={<Menu className="w-6 h-6" />}
          label="Menu"
          active={activeTab === 'menu'}
          onClick={() => navigate('/customer/menu')}
        />
        <BottomNavItem
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Orders"
          active={activeTab === 'orders'}
          onClick={() => navigate('/customer/orders')}
        />
        <BottomNavItem
          icon={<User className="w-6 h-6" />}
          label="Profile"
          active={activeTab === 'profile'}
          onClick={() => navigate('/customer/profile')}
        />
      </BottomNav>
    </div>
  );
}
