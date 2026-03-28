import { useCart } from "@/contexts/cart-context";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerTrigger } from "@/components/ui/drawer";
import { ShoppingCart, User, Package, Plus, Minus, Trash2, ChefHat, X, CheckCircle2, Search, Utensils } from "lucide-react";
import { Button } from "@/components/design-system/button";
import { Badge } from "@/components/design-system/badge";
import { supabase, type MenuItem } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ItemCustomizationModal } from "@/components/customer/ItemCustomizationModal";
import { SpiceLevel } from "@/components/design-system/spice-level";

export function CartSlider({ 
  isOpen, 
  onOpenChange, 
  trigger 
}: { 
  isOpen: boolean, 
  onOpenChange: (open: boolean) => void,
  trigger?: React.ReactNode
}) {
  const [activeTab, setActiveTab] = useState<'menu' | 'draft'>('menu');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const navigate = useNavigate();

  const categories = ['All', 'Starters', 'Main Course', 'Biryani', 'Breads', 'Desserts'];

  const { 
    cartItems, tableId, sessionId, customerInfo, 
    updateQuantity, removeFromCart, clearCart, 
    getTotalAmount, addToCart,
    previousOrders, isLoadingHistory, fetchOrderHistory
  } = useCart();

  useEffect(() => {
    if (isOpen) {
      fetchOrderHistory();
      fetchMenu();
    }
  }, [isOpen]);

  const fetchMenu = async () => {
    setLoadingMenu(true);
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
    } finally {
      setLoadingMenu(false);
    }
  };

  const filteredMenu = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleToggleItemServed = async (orderId: string, itemId: string, currentStatus: boolean, allOrderItems: any[]) => {
    try {
      const newStatus = !currentStatus;
      const { error: itemError } = await supabase
        .from('order_items')
        .update({ is_served: newStatus })
        .eq('id', itemId);

      if (itemError) throw itemError;
      await fetchOrderHistory();

      const updatedItems = allOrderItems.map(item => 
        item.id === itemId ? { ...item, is_served: newStatus } : item
      );
      
      if (updatedItems.every(item => item.is_served)) {
        await supabase.from('orders').update({ status: 'served' }).eq('id', orderId);
        toast.success('Order fully served!');
      }
    } catch (err: any) {
      toast.error('Update failed: ' + err.message);
    }
  };

  const handlePlaceOrder = async () => {
    if (!tableId || cartItems.length === 0) {
        alert('Table ID is missing or cart is empty');
        return;
    }

    setIsSubmitting(true);
    try {
      // Logic for placing order (similar to waiter-ordering.tsx)
      let activeOrderFetcher = supabase
        .from('orders')
        .select('id, total_amount');
        
      if (sessionId) {
        activeOrderFetcher = activeOrderFetcher.eq('session_id', sessionId);
      } else {
        activeOrderFetcher = activeOrderFetcher.eq('table_id', tableId).eq('is_paid', false);
      }
      
      const { data: activeOrder, error: fetchError } = await activeOrderFetcher
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let orderId = activeOrder?.id;

      if (!orderId) {
        // Create new order
        const { data: newOrder, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: customerInfo?.id || null,
            table_id: tableId,
            session_id: sessionId || null,
            order_type: 'dine_in',
            placed_by: 'waiter',
            status: 'placed',
            payment_status: 'pending',
            payment_method: 'cod',
            total_amount: getTotalAmount(),
            is_paid: false
          })
          .select()
          .single();

        if (orderError) throw orderError;
        orderId = newOrder.id;
        
        // Update table status
        await supabase.from('restaurant_tables').update({ status: 'occupied' }).eq('id', tableId);
      } else {
        // Update existing order amount
        const currentTotal = activeOrder?.total_amount || 0;
        const newTotal = currentTotal + getTotalAmount();
        const { error: updateError } = await supabase.from('orders').update({ total_amount: newTotal, status: 'placed' }).eq('id', orderId);
        if (updateError) throw updateError;
      }

      // Insert items
      const items = cartItems.map(i => ({
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

      // UPDATE DINE-IN SESSION TOTAL
      if (sessionId) {
        // Fetch current session total first to be accurate
        const { data: sessionData } = await supabase
          .from('dine_in_sessions')
          .select('total_amount')
          .eq('id', sessionId)
          .single();
        
        const currentSessionTotal = sessionData?.total_amount || 0;
        const newSessionTotal = Number(currentSessionTotal) + getTotalAmount();

        await supabase
          .from('dine_in_sessions')
          .update({ total_amount: newSessionTotal })
          .eq('id', sessionId);
      }

      toast.success('Order placed successfully!');
      clearCart();
      onOpenChange(false);
      
      if (sessionId) {
        navigate(`/waiter/session/${sessionId}`);
      } else {
        navigate('/waiter/dashboard');
      }
    } catch (err: any) {
      console.error('Error placing order:', err);
      toast.error('Failed to place order: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="h-full flex flex-col bg-card border-l border-divider shadow-2xl">
        <DrawerHeader className="border-b border-divider p-0">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-brand-maroon" />
              <DrawerTitle className="text-xl font-black">Ordering Console</DrawerTitle>
            </div>
            <button 
              onClick={() => onOpenChange(false)} 
              className="p-3 bg-muted/50 hover:bg-muted text-foreground rounded-2xl transition-all active:scale-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex p-1 bg-muted/30 mx-4 mb-4 rounded-xl border border-divider">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${
                activeTab === 'menu' 
                  ? 'bg-white text-brand-maroon shadow-sm border border-brand-maroon/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              01. Browse Menu
            </button>
            <button
              onClick={() => setActiveTab('draft')}
              className={`flex-1 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all relative ${
                activeTab === 'draft' 
                  ? 'bg-white text-brand-maroon shadow-sm border border-brand-maroon/10' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              02. My Draft
              {cartItems.length > 0 && (
                <Badge variant="error" className="absolute -top-1 -right-1 font-black text-[9px] min-w-[18px] h-[18px] flex items-center justify-center p-0 rounded-full animate-pulse shadow-sm ring-2 ring-white">
                  {cartItems.length}
                </Badge>
              )}
            </button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
          {activeTab === 'menu' ? (
            /* Menu Section (Ordering Slider UI) */
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black text-brand-maroon uppercase tracking-widest border-l-2 border-brand-maroon pl-2">
                <Utensils className="w-3 h-3" />
                Menu Selection
              </div>

              <div className="space-y-4">
                {/* Search & Categories */}
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-muted/30 border border-divider rounded-xl text-sm outline-none focus:border-brand-maroon/40 transition-all font-medium"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all uppercase tracking-wider border ${
                          selectedCategory === category
                            ? 'bg-brand-maroon text-white border-brand-maroon'
                            : 'bg-white text-muted-foreground border-divider hover:border-brand-maroon/30'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minimalist Menu List */}
                <div className="grid grid-cols-1 gap-1">
                  {loadingMenu ? (
                    <div className="py-8 text-center text-xs text-muted-foreground animate-pulse font-bold uppercase tracking-widest">Identifying Items...</div>
                  ) : filteredMenu.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground italic">No matching items found</div>
                  ) : (
                    filteredMenu.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3 bg-white border border-divider rounded-xl hover:border-brand-maroon/20 hover:shadow-sm transition-all group"
                        onClick={() => {
                          setSelectedItem(item);
                          setModalOpen(true);
                        }}
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="font-bold text-sm text-foreground truncate group-hover:text-brand-maroon transition-colors">{item.name}</p>
                          <p className="text-[10px] font-black text-brand-maroon mt-0.5">₹{item.price}</p>
                        </div>
                        <button 
                          className="w-8 h-8 bg-brand-maroon/5 text-brand-maroon rounded-lg group-hover:bg-brand-maroon group-hover:text-white transition-all flex items-center justify-center border border-brand-maroon/10"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          ) : (
            <div className="space-y-8">
              {/* Customer Section */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">
                  <User className="w-3 h-3" />
                  Customer Information
                </div>
                {customerInfo ? (
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-lg font-bold">
                      {customerInfo.full_name?.[0] || 'C'}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{customerInfo.full_name}</p>
                      <p className="text-xs text-muted-foreground">{customerInfo.email || customerInfo.phone_number || 'Linked'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 p-4 rounded-2xl border border-dashed border-divider text-center">
                    <p className="text-sm font-medium text-muted-foreground italic">Walk-in Customer</p>
                  </div>
                )}
              </section>

          {/* New Items Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-primary pl-2">
              <Package className="w-3 h-3" />
              New Items (Draft)
            </div>
            
            <div className="space-y-3">
              {cartItems.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground/30">
                  <ShoppingCart className="w-12 h-12 mb-2" />
                  <p className="font-bold">No items in cart</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.menu_item_id} className="relative group bg-muted/20 p-3 rounded-2xl border border-transparent hover:border-divider transition-all">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-card rounded-xl flex items-center justify-center text-2xl shadow-sm border border-divider">
                        {item.image}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-foreground text-sm truncate">{item.name}</h4>
                          <p className="font-black text-primary text-sm">₹{item.price * item.quantity}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">₹{item.price} each</p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 shadow-sm border border-divider">
                            <button 
                              onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-md transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-black min-w-[24px] text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-md transition-colors text-primary"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.menu_item_id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Previous Items Section - TICKING SUPPORT */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest border-l-2 border-green-500 pl-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                Previous Items
              </div>
            </div>

            <div className="space-y-6">
              {isLoadingHistory ? (
                <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">Loading history...</div>
              ) : previousOrders.length === 0 ? (
                <div className="bg-muted/10 p-4 rounded-2xl border border-dashed border-divider text-center">
                  <p className="text-xs text-muted-foreground">No previous items for this table</p>
                </div>
              ) : (
                previousOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-2xl border border-divider shadow-sm overflow-hidden">
                    <div className="bg-muted/5 p-3 border-b border-divider flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground italic">Order #{order.id.slice(0, 6)}</span>
                        <Badge variant={
                          order.status === 'served' ? 'success' :
                          order.status === 'prepared' ? 'paid' : 'pending'
                        } className="text-[9px] py-0 px-2 uppercase font-black tracking-tighter">
                          {order.status}
                        </Badge>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="divide-y divide-divider/50">
                      {order.order_items?.map((item: any) => (
                        <div 
                          key={item.id} 
                          className={`flex items-center gap-4 p-3 transition-all ${item.is_served ? 'bg-green-50/20' : 'bg-white'}`}
                        >
                          <button
                            onClick={() => handleToggleItemServed(order.id, item.id, item.is_served, order.order_items)}
                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                              item.is_served 
                                ? 'bg-green-600 border-green-600 text-white' 
                                : 'bg-white border-brand-maroon/30 text-brand-maroon/20 hover:border-brand-maroon hover:text-brand-maroon/40'
                            }`}
                          >
                            <CheckCircle2 className={`w-3.5 h-3.5 ${!item.is_served ? 'opacity-40' : ''}`} />
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-xs leading-tight transition-all ${item.is_served ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[9px] font-bold text-muted-foreground">x{item.quantity} • ₹{item.price * item.quantity}</p>
                              <SpiceLevel level={item.spice_level} className="scale-75 origin-left opacity-80" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="px-3 py-2 bg-muted/5 flex justify-between items-center border-t border-divider/50">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Order Total</span>
                      <span className="text-xs font-black text-brand-maroon">₹{order.total_amount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
            </div>
          )}
        </div>

        {/* Footer with Place Order Button */}
        <div className="mt-auto p-4 bg-muted/10 border-t border-divider space-y-4">
          <div className="space-y-2">
            {previousOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0) > 0 && (
              <div className="flex justify-between items-center text-sm text-muted-foreground px-1">
                <span>Previous Items</span>
                <span className="font-bold">₹{previousOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm text-muted-foreground px-1">
              <span>{previousOrders.length > 0 ? 'New Items Total' : 'Items Total'}</span>
              <span className="font-bold text-foreground">₹{getTotalAmount()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-divider px-1">
              <span className="font-bold text-lg">Grand Total</span>
              <span className="font-black text-2xl text-primary">₹{getTotalAmount() + previousOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-14 flex-1 border-2 border-brand-maroon/20 text-brand-maroon font-black rounded-2xl hover:bg-brand-maroon/5"
              onClick={() => onOpenChange(false)}
            >
              CLOSE CONSOLE
            </Button>
            {activeTab === 'menu' ? (
              <Button
                className="flex-[2] h-14 text-lg font-black shadow-lg shadow-brand-maroon/20 bg-brand-maroon hover:bg-[#5D1227]"
                onClick={() => setActiveTab('draft')}
              >
                <ShoppingCart className="w-5 h-5 mr-3" />
                VIEW DRAFT ({cartItems.length})
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-14 w-14 p-0 shrink-0 border-2"
                  onClick={() => {
                    if (confirm('Clear all items from your cart?')) clearCart();
                  }}
                  disabled={cartItems.length === 0 || isSubmitting}
                >
                  <Trash2 className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button
                  className="flex-1 h-14 text-lg font-black shadow-lg shadow-primary/20"
                  disabled={cartItems.length === 0 || isSubmitting || !tableId}
                  onClick={handlePlaceOrder}
                  isLoading={isSubmitting}
                >
                  <ChefHat className="w-5 h-5 mr-3" />
                  PLACE ORDER
                </Button>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
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
              addToCart?.(selectedItem, specialInstructions, spiceLevel);
            }
            setModalOpen(false);
            setSelectedItem(null);
          }}
        />
      )}
    </Drawer>
  );
}
