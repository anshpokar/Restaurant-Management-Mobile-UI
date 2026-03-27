import { useCart } from "@/contexts/cart-context";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { ShoppingCart, User, Package, Plus, Minus, Trash2, ChefHat, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/design-system/button";
import { Badge } from "@/components/design-system/badge";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function CartSlider({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
  const { 
    cartItems, tableId, sessionId, customerInfo, 
    updateQuantity, removeFromCart, clearCart, 
    getTotalAmount, getTotalItems,
    previousOrders, isLoadingHistory, fetchOrderHistory
  } = useCart();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchOrderHistory();
    }
  }, [isOpen]);

  const handleMarkAsServed = async (orderId: string) => {
    try {
      // Need dynamic import or use supabase from lib
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('orders')
        .update({ status: 'served' })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Order marked as served');
      fetchOrderHistory(); // Refresh from context
    } catch (err: any) {
      toast.error('Failed to update status: ' + err.message);
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
        <DrawerHeader className="border-b border-divider flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <DrawerTitle className="text-xl font-black">Your Cart</DrawerTitle>
            <Badge variant="info" className="ml-2">
              {getTotalItems() + previousOrders.reduce((sum, o) => sum + (o.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0), 0)} Items
            </Badge>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-2 h-10 w-10 flex items-center justify-center hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-hide">
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
              New Items
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

          {/* Previous Items Section */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest border-l-2 border-green-500 pl-2">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              Previous Items
            </div>

            <div className="space-y-4">
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
                        <span className="text-[10px] font-bold text-muted-foreground">#{order.id.slice(0, 6)}</span>
                        <Badge variant={
                          order.status === 'served' ? 'success' :
                          order.status === 'prepared' ? 'paid' :
                          order.status === 'preparing' ? 'info' : 'warning'
                        } className="text-[10px] py-0 px-2 uppercase font-black">
                          {order.status}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    <div className="p-3 space-y-2">
                      {order.order_items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            <span className="font-bold text-foreground">x{item.quantity}</span> {item.name}
                          </span>
                          <span className="font-medium">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-divider flex justify-between font-black text-xs text-primary">
                        <span>Order Total</span>
                        <span>₹{order.total_amount}</span>
                      </div>
                    </div>

                    {order.status === 'prepared' && (
                      <div className="p-2 bg-green-50/50 border-t border-green-100">
                        <Button 
                          size="sm" 
                          className="w-full h-8 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black"
                          onClick={() => handleMarkAsServed(order.id)}
                        >
                          MARK AS SERVED
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
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
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
