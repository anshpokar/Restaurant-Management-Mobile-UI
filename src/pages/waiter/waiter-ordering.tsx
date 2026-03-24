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
    ArrowLeft
} from 'lucide-react';
import { supabase, type RestaurantTable, type Profile, type MenuItem, type Order } from '@/lib/supabase';
import { useCart, type CartItem } from '@/contexts/cart-context';


export function WaiterOrdering() {
    const navigate = useNavigate();
    const { tableId } = useParams<{ tableId: string }>();
    const location = useLocation();
    const sessionId = (location.state as any)?.sessionId;
    const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [linkedCustomer, setLinkedCustomer] = useState<Profile | null>(null);
    const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
    
    const { 
        cartItems: cart, 
        addToCart,
        clearCart, 
        previousOrders, 
        fetchOrderHistory,
        updateQuantity, 
        setWaiterContext
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

    const searchCustomer = async () => {
        if (!customerSearch) return;
        setIsSearchingCustomer(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .or(`email.eq.${customerSearch},phone_number.eq.${customerSearch},username.eq.${customerSearch}`)
                .maybeSingle();

            if (data) setLinkedCustomer(data);
            else alert('Customer not found');
        } catch (err) {
            alert('Error searching customer');
        } finally {
            setIsSearchingCustomer(false);
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
                        total_amount: cart.reduce((s, i) => s + (i.price * i.quantity), 0),
                        status: 'placed',
                        is_paid: false
                    })
                    .select()
                    .single();

                if (orderError) throw orderError;
                orderId = newOrder.id;
                await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', tableId);
            } else {
                const newTotal = activeOrder!.total_amount + cart.reduce((s: number, i: CartItem) => s + (i.price * i.quantity), 0);
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

            alert('Order updated successfully!');
            clearCart();
            // Navigate back to session management if coming from a session, otherwise to waiter dashboard
            if (sessionId) {
                navigate(`/waiter/session/${sessionId}`);
            } else {
                navigate('/waiter');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to place order');
        }
    };

    const filteredMenu = menuItems.filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-muted/20">
            <div className="flex-1 flex flex-col p-4 overflow-hidden">
                <div className="flex items-center gap-4 mb-4">
                    <Button variant="outline" size="sm" onClick={() => sessionId ? navigate(`/waiter/session/${sessionId}`) : navigate('/waiter')}>
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <h2 className="text-xl font-black text-foreground">Ordering for Table {selectedTable?.table_number}</h2>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-card border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-primary text-white' : 'bg-card text-muted-foreground hover:bg-muted'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pr-2">
                    {filteredMenu.map(item => (
                        <Card key={item.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardBody className="p-4 flex gap-4">
                                <div className="text-4xl">{item.image}</div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-foreground leading-tight">{item.name}</h4>
                                        <div className="scale-75 origin-right">
                                            <Badge variant={item.veg ? 'success' : 'error'}>
                                                {item.veg ? 'VEG' : 'NON-VEG'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm font-black text-primary mt-1">₹{item.price}</p>
                                    {(() => {
                                        const cartItem = cart.find(i => i.menu_item_id === item.id);
                                        if (cartItem && cartItem.quantity > 0) {
                                            return (
                                                <div className="mt-3 w-full flex items-center justify-between gap-2 bg-primary/10 rounded-xl p-1">
                                                    <button
                                                        onClick={() => handleUpdateQuantity(item.id, -1)}
                                                        className="w-8 h-8 bg-white text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center justify-center"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-sm font-black text-primary min-w-[2rem] text-center">
                                                        {cartItem.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => addToCart(item, cartItem.special_instructions, cartItem.spice_level)}
                                                        className="w-8 h-8 bg-white text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center justify-center"
                                                    >
                                                        <Plus className="w-4 h-4" />
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
                                                    className="mt-3 w-full bg-primary/10 text-primary py-2 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center justify-center gap-1"
                                                >
                                                    <Plus className="w-3 h-3" /> ADD ITEM
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

            <div className="w-full md:w-80 lg:w-96 bg-card border-l border-border flex flex-col shadow-xl">
                <div className="p-4 border-b border-border bg-muted/10">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Link Customer</p>
                    {linkedCustomer ? (
                        <div className="flex items-center justify-between bg-primary/5 p-2 rounded-xl border border-primary/20">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                                    {linkedCustomer.full_name[0]}
                                </div>
                                <div>
                                    <p className="text-xs font-bold">{linkedCustomer.full_name}</p>
                                    <p className="text-[10px] text-muted-foreground">{linkedCustomer.email || linkedCustomer.username}</p>
                                </div>
                            </div>
                            <button onClick={() => setLinkedCustomer(null)} className="text-muted-foreground hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-white border-none text-xs p-2 rounded-lg outline-none focus:ring-1 focus:ring-primary"
                                placeholder="Email/Username/Phone"
                                value={customerSearch}
                                onChange={e => setCustomerSearch(e.target.value)}
                            />
                            <button
                                onClick={searchCustomer}
                                className="bg-primary text-white p-2 rounded-lg"
                                disabled={isSearchingCustomer}
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {activeOrder && (
                    <div className="p-4 border-b border-border bg-yellow-50/30">
                        <p className="text-[10px] font-black text-yellow-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Previous Orders
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {activeOrder.order_items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px]">
                                    <span className="text-muted-foreground">x{item.quantity} {item.name}</span>
                                    <span className="font-bold">₹{item.price * item.quantity}</span>
                                </div>
                            ))}
                            <div className="pt-2 border-t border-yellow-200 flex justify-between font-black text-yellow-700">
                                <span>Total Previous</span>
                                <span>₹{activeOrder.total_amount}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-black text-lg flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-primary" /> New Items
                    </h3>
                    <Badge variant="info">{cart.length} Items</Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 text-center">
                            <UtensilsCrossed className="w-16 h-16 mb-2" />
                            <p className="font-bold">No items added yet</p>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.menu_item_id} className="flex items-center gap-3 bg-muted/30 p-3 rounded-2xl">
                                <span className="text-2xl">{item.image}</span>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-foreground">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">₹{item.price} x {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleUpdateQuantity(item.menu_item_id, -1)} className="p-1 hover:bg-muted rounded-lg"><Minus className="w-4 h-4" /></button>
                                    <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => addToCart({
                                        id: item.menu_item_id,
                                        name: item.name,
                                        price: item.price,
                                        image: item.image || '',
                                        category: '',
                                        veg: item.veg || false,
                                        rating: 0,
                                        is_available: true
                                    })} className="p-1 hover:bg-muted rounded-lg text-primary"><Plus className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-muted/10 border-t border-border space-y-4">
                    <div className="space-y-1">
                        {activeOrder && (
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>Previous Bill</span>
                                <span>₹{activeOrder.total_amount}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>New Items</span>
                            <span>₹{cart.reduce((s, i) => s + (i.price * i.quantity), 0)}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg pt-2 border-t border-divider">
                            <span className="font-bold text-foreground">Grand Total</span>
                            <span className="font-black text-2xl text-primary">
                                ₹{previousOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0) + cart.reduce((s, i) => s + (i.price * i.quantity), 0)}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                if (confirm('Clear all items?')) clearCart();
                            }}
                            disabled={cart.length === 0}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                            className="flex-[3] h-14 text-lg font-black"
                            disabled={cart.length === 0}
                            onClick={handlePlaceOrder}
                        >
                            PLACE ORDER
                        </Button>
                    </div>
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
