import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { MenuItem, Offer, supabase } from '@/lib/supabase';

export interface CartItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  veg?: boolean;
  special_instructions?: string;
  spice_level?: 'mild' | 'medium' | 'spicy' | 'extra_spicy';
}

interface CartContextType {
  cartItems: CartItem[];
  tableId: string | null;
  sessionId: string | null;
  customerInfo: any | null;
  addToCart: (item: MenuItem, specialInstructions?: string, spiceLevel?: 'mild' | 'medium' | 'spicy' | 'extra_spicy') => void;
  removeFromCart: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  updateSpecialInstructions: (menuItemId: number, instructions: string) => void;
  updateSpiceLevel: (menuItemId: number, level: 'mild' | 'medium' | 'spicy' | 'extra_spicy') => void;
  clearCart: () => void;
  setWaiterContext: (tableId: string | null, sessionId: string | null, customerInfo: any | null) => void;
  getTotalItems: () => number;
  getTotalAmount: (type?: 'dine_in' | 'delivery' | null) => number;
  previousOrders: any[];
  isLoadingHistory: boolean;
  fetchOrderHistory: () => Promise<void>;
  updateItemServedStatus: (orderId: string, itemId: string, isServed: boolean) => void;
  appliedOffer: Offer | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  getDiscountAmount: () => number;
  getGSTAmount: () => number;
  getSubtotal: () => number;
  getDeliveryCharge: (type: 'dine_in' | 'delivery' | null) => number;
  getTotalSessionItems: () => number;
  getTotalSessionAmount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('waiter_cart_items');
    return saved ? JSON.parse(saved) : [];
  });
  const [tableId, setTableId] = useState<string | null>(() => localStorage.getItem('waiter_table_id'));
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('waiter_session_id'));
  const [customerInfo, setCustomerInfo] = useState<any | null>(() => {
    const saved = localStorage.getItem('waiter_customer_info');
    return saved ? JSON.parse(saved) : null;
  });
  const [previousOrders, setPreviousOrders] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [appliedOffer, setAppliedOffer] = useState<Offer | null>(null);

  // Persist changes to localStorage
  useEffect(() => {
    localStorage.setItem('waiter_cart_items', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    if (tableId) localStorage.setItem('waiter_table_id', tableId);
    else localStorage.removeItem('waiter_table_id');
  }, [tableId]);

  useEffect(() => {
    if (sessionId) localStorage.setItem('waiter_session_id', sessionId);
    else localStorage.removeItem('waiter_session_id');
  }, [sessionId]);

  useEffect(() => {
    if (customerInfo) localStorage.setItem('waiter_customer_info', JSON.stringify(customerInfo));
    else localStorage.removeItem('waiter_customer_info');
  }, [customerInfo]);

  const fetchOrderHistory = useCallback(async () => {
    if (!tableId && !sessionId) return;

    setIsLoadingHistory(true);
    try {
      const { supabase } = await import('@/lib/supabase');

      const query = supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          order_items (
            id,
            name,
            quantity,
            price,
            special_instructions,
            spice_level,
            is_served
          )
        `);

      if (sessionId) {
        query.eq('session_id', sessionId);
      } else {
        query.eq('table_id', tableId).eq('is_paid', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching order history:', error);
        throw error;
      }

      setPreviousOrders(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [tableId, sessionId]);

  const updateItemServedStatus = useCallback((orderId: string, itemId: string, isServed: boolean) => {
    setPreviousOrders(prev => prev.map(order => 
      order.id === orderId 
        ? {
            ...order,
            order_items: order.order_items?.map((item: any) => 
              item.id === itemId ? { ...item, is_served: isServed } : item
            )
          }
        : order
    ));
  }, []);

  useEffect(() => {
    if (tableId || sessionId) {
      fetchOrderHistory();
    }
  }, [tableId, sessionId]);

  const addToCart = (item: MenuItem, specialInstructions?: string, spiceLevel?: 'mild' | 'medium' | 'spicy' | 'extra_spicy') => {
    setCartItems(prev => {
      const existing = prev.find(i => i.menu_item_id === item.id);
      if (existing) {
        return prev.map(i =>
          i.menu_item_id === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      } else {
        return [...prev, {
          menu_item_id: item.id,
          name: item.name,
          quantity: 1,
          price: item.price,
          image: item.image,
          veg: item.veg,
          special_instructions: specialInstructions,
          spice_level: spiceLevel || 'medium'
        }];
      }
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCartItems(prev => prev.filter(item => item.menu_item_id !== menuItemId));
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.menu_item_id === menuItemId ? { ...item, quantity } : item
      )
    );
  };

  const updateSpecialInstructions = (menuItemId: number, instructions: string) => {
    setCartItems(prev =>
      prev.map(item =>
        item.menu_item_id === menuItemId ? { ...item, special_instructions: instructions } : item
      )
    );
  };

  const updateSpiceLevel = (menuItemId: number, level: 'mild' | 'medium' | 'spicy' | 'extra_spicy') => {
    setCartItems(prev =>
      prev.map(item =>
        item.menu_item_id === menuItemId ? { ...item, spice_level: level } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const setWaiterContext = (tId: string | null, sId: string | null, cInfo: any | null) => {
    if (tId !== tableId) {
      setCartItems([]);
    }
    setTableId(tId);
    setSessionId(sId);
    setCustomerInfo(cInfo);
  };

  const getSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getGSTAmount = () => {
    return getSubtotal() * 0.05;
  };

  const getDiscountAmount = () => {
    if (!appliedOffer) return 0;
    const subtotal = getSubtotal();
    const gst = getGSTAmount();
    const baseForDiscount = subtotal + gst;
    
    const value = Number(appliedOffer.discount_value);
    const type = appliedOffer.discount_type.toLowerCase();
    
    if (type === 'flat') {
      return Math.min(value, baseForDiscount);
    } else {
      return (baseForDiscount * value) / 100;
    }
  };

  const applyCoupon = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('discount_code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { success: false, message: 'Invalid or expired coupon code' };
      }

      const subtotal = getSubtotal();
      if (data.min_order_amount && subtotal < data.min_order_amount) {
        return { success: false, message: `Minimum order amount of ₹${data.min_order_amount} required` };
      }

      setAppliedOffer(data as Offer);
      return { success: true, message: 'Coupon applied successfully!' };
    } catch (err) {
      console.error('Error applying coupon:', err); // Added error logging
      return { success: false, message: 'Error checking coupon' };
    }
  };

  const removeCoupon = () => {
    setAppliedOffer(null);
  };

  const getTotalItems = () => cartItems.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);
  
  const getDeliveryCharge = (type: 'dine_in' | 'delivery' | null) => {
    if (type !== 'delivery') return 0;
    const subtotal = getSubtotal();
    return subtotal < 500 ? 50 : 0;
  };

  const getTotalAmount = (type: 'dine_in' | 'delivery' | null = 'dine_in') => {
    const subtotal = getSubtotal();
    const gst = getGSTAmount();
    const discount = getDiscountAmount();
    const delivery = getDeliveryCharge(type);
    return Math.max(0, subtotal + gst - discount + delivery);
  };

  const getTotalSessionItems = () => {
    const newItems = getTotalItems();
    const prevItems = previousOrders.reduce((sum, o) => sum + (o.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0), 0);
    return newItems + prevItems;
  };

  const getTotalSessionAmount = () => {
    const newAmount = getTotalAmount();
    const prevAmount = previousOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    return newAmount + prevAmount;
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      tableId,
      sessionId,
      customerInfo,
      addToCart,
      removeFromCart,
      updateQuantity,
      updateSpecialInstructions,
      updateSpiceLevel,
      clearCart,
      setWaiterContext,
      getTotalItems,
      getTotalAmount,
      previousOrders,
      isLoadingHistory,
      fetchOrderHistory,
      updateItemServedStatus,
      appliedOffer,
      applyCoupon,
      removeCoupon,
      getDiscountAmount,
      getGSTAmount,
      getSubtotal,
      getDeliveryCharge,
      getTotalSessionItems,
      getTotalSessionAmount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
