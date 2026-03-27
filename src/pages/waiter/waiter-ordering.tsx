import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { ItemCustomizationModal } from '@/components/customer/ItemCustomizationModal';
import {
    Search,
    UtensilsCrossed,
    Clock,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    ArrowLeft,
    Flame,
    Shield,
    ChefHat
} from 'lucide-react';
import { supabase, type RestaurantTable, type Profile, type MenuItem, type Order } from '@/lib/supabase';
import { useCart, type CartItem } from '@/contexts/cart-context';
import { toast } from 'sonner';



export function WaiterOrdering() {
    const navigate = useNavigate();
    const { tableId } = useParams<{ tableId: string }>();
    const location = useLocation();
    const sessionId = (location.state as any)?.sessionId;
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [linkedCustomer, setLinkedCustomer] = useState<Profile | null>(null);
    
    const { 
        cartItems: cart, 
        addToCart,
        clearCart, 
        previousOrders, 
        fetchOrderHistory,
        updateQuantity, 
        setWaiterContext,
        getTotalAmount,
        getGSTAmount,
        getSubtotal
    } = useCart();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

    const categories = ['All', 'Starters', 'Main Course', 'Biryani', 'Breads', 'Desserts'];

    useEffect(() => {
        fetchMenu();
        if (tableId) {
            fetchTableInfo();
            fetchActiveOrder();
        }
    }, [tableId, sessionId]); // removed linkedCustomer

    // Separate effect for syncing context and order history to prevent infinite fetch loops
    useEffect(() => {
        fetchOrderHistory();
        if (tableId) {
            setWaiterContext(tableId, sessionId || null, linkedCustomer || null);
        }
    }, [tableId, sessionId, linkedCustomer]);

    const fetchMenu = async () => {
        try {
            const { data, error } = await supabase
                .from('menu_items')
                .select('*')
                .eq('is_available', true)
                .order('name', { ascending: true });

            if (error) throw error;
            setMenuItems(data || []);
        } catch (error) {
            console.error('Error fetching menu:', error);
        }
    };

    const fetchTableInfo = async () => {
        const { data } = await supabase.from('restaurant_tables').select('*').eq('id', tableId).maybeSingle();
        if (data) setSelectedTable(data);
    };

    const fetchActiveOrder = async () => {
        try {
            // First, fetch session info to get user_id if linked
            if (sessionId) {
                const { data: sessionData } = await supabase
                    .from('dine_in_sessions')
                    .select('*, profiles(*)')
                    .eq('id', sessionId)
                    .maybeSingle();
                
                if (sessionData?.profiles) {
                    setLinkedCustomer(sessionData.profiles);
                }
            } else if (tableId) {
                // If no sessionId, check if table has an active session
                const { data: tableData } = await supabase
                    .from('restaurant_tables')
                    .select('current_session_id')
                    .eq('id', tableId)
                    .maybeSingle();
                
                if (tableData?.current_session_id) {
                    const { data: sessionData } = await supabase
                        .from('dine_in_sessions')
                        .select('*, profiles(*)')
                        .eq('id', tableData.current_session_id)
                        .maybeSingle();
                    
                    if (sessionData?.profiles) {
                        setLinkedCustomer(sessionData.profiles);
                    }
                }
            }

            const query = supabase
                .from('orders')
                .select('*, order_items(*), profiles(*)');

            if (sessionId) {
                query.eq('session_id', sessionId);
            } else {
                query.eq('table_id', tableId).eq('is_paid', false);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data && !error) {
                setActiveOrder(data);
                if (data.profiles) setLinkedCustomer(data.profiles);
            } else if (!linkedCustomer) {
                setActiveOrder(null);
                setLinkedCustomer(null);
            }
        } catch (err) {
            console.error('Error fetching active order/session:', err);
        }
    };

    const handleUpdateQuantity = (id: number, delta: number) => {
        const item = cart.find(i => i.menu_item_id === id);
        if (item) {
            updateQuantity(id, item.quantity + delta);
        }
    };


    const handlePlaceOrder = async () => {
        if (!tableId || cart.length === 0) return;

        try {
            let orderId = activeOrder?.id;

            if (!orderId) {
                const { data: newOrder, error: orderError } = await supabase
                    .from('orders')
                    .insert({
                        table_id: tableId,
                        session_id: sessionId || null,
                        user_id: linkedCustomer?.id || null,
                        total_amount: getTotalAmount('dine_in'),
                        status: 'placed',
                        is_paid: false,
                        order_type: 'dine_in',
                        placed_by: 'waiter',
                        payment_status: 'pending',
                        payment_method: 'cod'
                    })
                    .select()
                    .single();

                if (orderError) throw orderError;
                orderId = newOrder.id;
                await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', tableId);
            } else {
                const newTotal = activeOrder!.total_amount + getTotalAmount('dine_in');
                const { error: updateError } = await supabase.from('orders').update({ total_amount: newTotal, status: 'placed' }).eq('id', orderId);
                if (updateError) throw updateError;
            }

            const items = cart.map((i: CartItem) => ({
                order_id: orderId,
                menu_item_id: i.menu_item_id,
                name: i.name,
                quantity: i.quantity,
                price: i.price,
                image: i.image,
                special_instructions: i.special_instructions || null,
                spice_level: i.spice_level || null
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(items);
            if (itemsError) throw itemsError;

            // Update dine_in_sessions total_amount
            if (sessionId) {
                const currentSessionTotal = previousOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                const newItemsTotal = getTotalAmount('dine_in');
                await supabase
                    .from('dine_in_sessions')
                    .update({ total_amount: currentSessionTotal + newItemsTotal })
                    .eq('id', sessionId);
            }
            
            toast.success('Order placed successfully!');
            clearCart();

            // Navigate back to session management if coming from a session, otherwise to waiter dashboard
            if (sessionId) {
                navigate(`/waiter/session/${sessionId}`);
            } else {
                navigate('/waiter');
            }
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to place order: ' + err.message);
        }

    };

    const filteredMenu = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-warm-off-white">
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center gap-6 mb-8">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => sessionId ? navigate(`/waiter/session/${sessionId}`) : navigate('/waiter')}
                        className="bg-white border-2 border-divider hover:border-brand-maroon/30 text-brand-maroon font-bold rounded-xl"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" /> RETURN
                    </Button>
                    <div>
                        <p className="text-[10px] font-black text-brand-maroon uppercase tracking-widest mb-0.5">Kitchen Portal</p>
                        <h2 className="text-3xl font-black text-foreground tracking-tight">Table {selectedTable?.table_number}</h2>
                    </div>
                </div>

                <div className="space-y-6 mb-8">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-brand-maroon opacity-40" />
                        <input
                            type="text"
                            placeholder="Identify menu item..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border-none rounded-2xl shadow-premium focus:ring-4 focus:ring-brand-maroon/5 font-bold text-foreground transition-all"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all uppercase tracking-widest ${
                                    selectedCategory === cat 
                                        ? 'bg-brand-maroon text-white shadow-lg shadow-brand-maroon/20 scale-105' 
                                        : 'bg-white text-muted-foreground hover:text-brand-maroon hover:bg-brand-maroon/5 border border-divider'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pr-2 pb-8">
                    {filteredMenu.map(item => (
                        <Card key={item.id} className="border-none shadow-premium hover:shadow-hover transition-all duration-300 rounded-[1.5rem] bg-white group">
                            <CardBody className="p-5 flex gap-4">
                                <div className="text-4xl bg-warm-beige w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    {item.image}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-black text-foreground leading-tight truncate">{item.name}</h4>
                                        <div className="scale-75 origin-right flex-shrink-0">
                                            <Badge variant={item.veg ? 'success' : 'error'} className="font-black text-[9px] px-2 py-0.5">
                                                {item.veg ? 'VEG' : 'NON-VEG'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-lg font-black text-brand-maroon">₹{item.price}</p>
                                    {(() => {
                                        const cartItem = cart.find(i => i.menu_item_id === item.id);
                                        if (cartItem && cartItem.quantity > 0) {
                                            return (
                                                <div className="mt-4 flex items-center justify-between gap-2 bg-brand-maroon/[0.03] border border-brand-maroon/10 rounded-[1rem] p-1.5 transition-all">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUpdateQuantity(item.id, -1);
                                                        }}
                                                        className="w-10 h-10 bg-white text-brand-maroon rounded-lg font-black shadow-sm hover:bg-brand-maroon hover:text-white transition-all active:scale-90 flex items-center justify-center border border-brand-maroon/5"
                                                    >
                                                        <Minus className="w-5 h-5" />
                                                    </button>
                                                    <span className="text-base font-black text-brand-maroon min-w-[2rem] text-center">
                                                        {cartItem.quantity}
                                                    </span>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addToCart(item, cartItem.special_instructions, cartItem.spice_level);
                                                        }}
                                                        className="w-10 h-10 bg-white text-brand-maroon rounded-lg font-black shadow-sm hover:bg-brand-maroon hover:text-white transition-all active:scale-90 flex items-center justify-center border border-brand-maroon/5"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <button
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setModalOpen(true);
                                                    }}
                                                    className="mt-4 w-full bg-brand-maroon text-white py-3 rounded-[1rem] text-[10px] font-black uppercase tracking-widest hover:bg-[#5D1227] shadow-lg shadow-brand-maroon/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                >
                                                    <Plus className="w-4 h-4" /> ADD TO DRAFT
                                                </button>
                                            );
                                        }
                                    })()}
                                </div>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="w-full md:w-96 lg:w-[28rem] bg-white border-l border-divider flex flex-col shadow-2xl z-10">

                {activeOrder && (
                    <div className="p-6 border-b border-divider bg-brand-gold/[0.02]">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" /> Order Registry
                            </p>
                            <span className="text-[10px] font-black text-brand-gold">EXISTING ITEMS</span>
                        </div>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {activeOrder.order_items?.map((item, idx) => (
                                <div key={idx} className="p-3 bg-white/50 border border-brand-gold/10 rounded-xl space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="text-xs font-black text-foreground truncate">{item.name}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground">x{item.quantity} · ₹{item.price}</p>
                                        </div>
                                        <span className="font-black text-xs text-brand-gold">₹{item.price * item.quantity}</span>
                                    </div>
                                    
                                    {/* Customization in Registry */}
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {item.spice_level && (
                                            <div className="flex gap-0.5">
                                                {Array.from({ length: 
                                                    item.spice_level === 'extra_spicy' ? 4 : 
                                                    item.spice_level === 'spicy' ? 3 : 
                                                    item.spice_level === 'medium' ? 2 : 1 
                                                }).map((_, i) => (
                                                    <Flame key={i} className={`w-3 h-3 ${
                                                        item.spice_level === 'extra_spicy' ? 'text-red-500 fill-red-500' :
                                                        item.spice_level === 'spicy' ? 'text-orange-500 fill-orange-500' :
                                                        'text-brand-gold fill-brand-gold'
                                                    }`} />
                                                ))}
                                            </div>
                                        )}
                                        {item.special_instructions && (
                                            <div className="px-2 py-0.5 bg-brand-maroon/5 rounded-full border border-brand-maroon/10">
                                                <p className="text-[8px] font-bold text-brand-maroon leading-none truncate max-w-[120px]">
                                                    "{item.special_instructions}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className="pt-3 border-t border-brand-gold/20 flex justify-between font-black text-brand-gold text-sm uppercase tracking-widest">
                                <span>Registry Total</span>
                                <span>₹{activeOrder.total_amount}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-6 border-b border-divider flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-xl flex items-center gap-3">
                            <ShoppingCart className="w-6 h-6 text-brand-maroon" /> New Draft
                        </h3>
                    </div>
                    <Badge variant="paid" className="bg-brand-maroon text-white border-none font-black text-[10px] rounded-lg">
                        {cart.length} ITEMS
                    </Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-10 text-center">
                            <UtensilsCrossed className="w-24 h-24 mb-4" />
                            <p className="font-black text-lg tracking-widest uppercase">No active draft</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.menu_item_id} className="group flex flex-col gap-3 bg-white p-4 rounded-[1.5rem] border border-divider shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <span className="text-3xl bg-warm-beige w-12 h-12 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                                        {item.image}
                                    </span>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-black text-foreground truncate">{item.name}</p>
                                        <p className="text-[10px] font-bold text-muted-foreground">₹{item.price} · Unit Price</p>
                                    </div>
                                    <div className="flex items-center gap-2 bg-warm-off-white p-1 rounded-xl border border-divider">
                                        <button onClick={() => handleUpdateQuantity(item.menu_item_id, -1)} className="w-8 h-8 bg-white shadow-sm flex items-center justify-center rounded-lg hover:text-red-500 transition-colors"><Minus className="w-4 h-4" /></button>
                                        <span className="text-sm font-black w-6 text-center text-foreground">{item.quantity}</span>
                                        <button onClick={() => addToCart({
                                            id: item.menu_item_id,
                                            name: item.name,
                                            price: item.price,
                                            image: item.image || '',
                                            category: '',
                                            veg: item.veg || false,
                                            rating: 0,
                                            is_available: true
                                        })} className="w-8 h-8 bg-white shadow-sm flex items-center justify-center rounded-lg text-brand-maroon hover:bg-brand-maroon hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                {/* Customization in Cart */}
                                <div className="flex flex-wrap gap-2 items-center pl-1">
                                    {item.spice_level && (
                                        <div className="flex gap-0.5">
                                            {Array.from({ length: 
                                                item.spice_level === 'extra_spicy' ? 4 : 
                                                item.spice_level === 'spicy' ? 3 : 
                                                item.spice_level === 'medium' ? 2 : 1 
                                            }).map((_, i) => (
                                                <Flame key={i} className={`w-3.5 h-3.5 ${
                                                    item.spice_level === 'extra_spicy' ? 'text-red-500 fill-red-500' :
                                                    item.spice_level === 'spicy' ? 'text-orange-500 fill-orange-500' :
                                                    'text-brand-gold fill-brand-gold'
                                                }`} />
                                            ))}
                                        </div>
                                    )}
                                    {item.special_instructions && (
                                        <div className="flex-1 flex items-center gap-1.5 px-3 py-1 bg-brand-maroon/[0.02] border border-brand-maroon/10 rounded-full">
                                            <Shield className="w-3 h-3 text-brand-maroon opacity-40" />
                                            <p className="text-[10px] font-bold text-brand-maroon italic truncate">
                                                {item.special_instructions}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-8 bg-warm-off-white/80 border-t border-divider space-y-6">
                    <div className="space-y-3">
                        {activeOrder && (
                            <div className="flex justify-between items-center text-[10px] font-black text-brand-maroon/50 uppercase tracking-widest">
                                <span>REGISTRY LOCK</span>
                                <span>₹{activeOrder.total_amount}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            <span>DRAFT SUB-TOTAL</span>
                            <span>₹{getSubtotal().toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            <span>PROTOCOL GST (5%)</span>
                            <span>₹{getGSTAmount().toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between items-end pt-4 border-t border-divider">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-brand-maroon uppercase tracking-[0.3em] mb-1">Estimated Liability</span>
                                <span className="text-3xl font-black text-foreground">
                                    ₹{(previousOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) + getTotalAmount('dine_in')).toFixed(0)}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                className="w-12 h-12 border-2 border-divider text-muted-foreground hover:border-red-500 hover:text-red-500 rounded-2xl transition-all"
                                onClick={() => {
                                    if (confirm('TERMINATE DRAFT? ALL NEW ITEMS WILL BE PURGED.')) clearCart();
                                }}
                                disabled={cart.length === 0}
                            >
                                <Trash2 className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <Button
                        className="w-full h-20 bg-brand-maroon hover:bg-[#5D1227] text-white rounded-[1.5rem] shadow-2xl shadow-brand-maroon/30 text-xl font-black tracking-tight transition-all disabled:opacity-50 disabled:grayscale"
                        disabled={cart.length === 0}
                        onClick={handlePlaceOrder}
                    >
                        <ChefHat className="w-7 h-7 mr-3" />
                        SUBMIT TO KITCHEN
                    </Button>
                </div>
            </div>

            {/* Customization Modal */}
            {selectedItem && (
                <ItemCustomizationModal
                    isOpen={modalOpen}
                    itemName={selectedItem.name}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedItem(null);
                    }}
                    onConfirm={(specialInstructions, spiceLevel) => {
                        if (selectedItem) {
                            addToCart(selectedItem, specialInstructions, spiceLevel);
                        }
                        setModalOpen(false);
                        setSelectedItem(null);
                    }}
                />
            )}
        </div>
    );
}
