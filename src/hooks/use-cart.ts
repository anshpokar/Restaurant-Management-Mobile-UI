import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type MenuItem, type Profile } from '@/lib/supabase';

export interface CartItem extends MenuItem {
    quantity: number;
}

export function useCart(profile: Profile | null) {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('cartItems');
        return saved ? JSON.parse(saved) : [];
    });
    const [isCartOpen, setIsCartOpen] = useState(false);

    useEffect(() => {
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
            const userId = profile?.id;
            if (!userId) {
                alert('Please login to place an order');
                return;
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .insert({
                    user_id: userId,
                    total_amount: totalAmount,
                    status: 'placed',
                    delivery_address: 'Home - Connaught Place'
                })
                .select()
                .single();

            if (orderError) throw orderError;

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
            navigate('/customer/orders');
        } catch (error: any) {
            console.error('Error placing order:', error);
            alert('Failed to place order: ' + error.message);
        }
    };

    return {
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        totalAmount,
        totalItems,
        handlePlaceOrder
    };
}
