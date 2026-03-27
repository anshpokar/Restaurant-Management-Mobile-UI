import { useState, useEffect } from 'react';
import { supabase, type OrderItem } from '@/lib/supabase';
import { CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { X, Printer, Receipt, Utensils, IndianRupee, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface SessionBillModalProps {
  sessionId: string;
  tableNumber?: number;
  sessionName?: string;
  onClose: () => void;
}

interface AggregatedItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export function SessionBillModal({ sessionId, tableNumber, sessionName, onClose }: SessionBillModalProps) {
  const [loading, setLoading] = useState(true);
  const [aggregatedItems, setAggregatedItems] = useState<AggregatedItem[]>([]);
  const [totalDiscount, setTotalDiscount] = useState(0);

  useEffect(() => {
    fetchSessionOrders();
  }, [sessionId]);

  const fetchSessionOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('session_id', sessionId)
        .neq('status', 'cancelled');

      if (error) throw error;

      const sessionOrders = data || [];

      // Aggregate all items from all orders
      const itemMap: Record<string, AggregatedItem> = {};
      
      sessionOrders.forEach(order => {
        (order.order_items || []).forEach((item: OrderItem) => {
          const key = `${item.menu_item_id}-${item.price}`; // Group by item and price
          if (itemMap[key]) {
            itemMap[key].quantity += item.quantity;
            itemMap[key].total += (item.price * item.quantity);
          } else {
            itemMap[key] = {
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              total: item.price * item.quantity
            };
          }
        });
      });

      const calculatedAggregatedItems = Object.values(itemMap);
      setAggregatedItems(calculatedAggregatedItems);
      
      // Calculate overall discount from orders
      const calculatedDiscount = sessionOrders.reduce((sum, order) => sum + (order.discount_amount || 0), 0);
      setTotalDiscount(calculatedDiscount);

    } catch (error: any) {
      console.error('Error fetching session orders:', error);
      toast.error('Failed to generate bill details');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = aggregatedItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.05;
  const grandTotal = Math.max(0, subtotal + tax - totalDiscount);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 print:p-0 print:bg-white"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden print:shadow-none print:rounded-none"
        >
          {/* Header - Hidden in Print */}
          <div className="flex justify-between items-center p-6 border-b print:hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-maroon/5 rounded-xl flex items-center justify-center">
                <Receipt className="w-5 h-5 text-brand-maroon" />
              </div>
              <h2 className="text-xl font-black text-foreground tracking-tight">Invoice Review</h2>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-muted rounded-2xl transition-all">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <CardBody className="p-8 space-y-8 overflow-y-auto max-h-[80vh] no-scrollbar print:max-h-none print:p-10">
            {/* Branded Header */}
            <div className="text-center space-y-2 pb-6 border-b-2 border-dashed border-border/50">
              <h1 className="text-3xl font-black tracking-tighter text-brand-maroon underline decoration-brand-maroon/20 decoration-4 underline-offset-8">NAVRATNA</h1>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Pure Vegetarian Restaurant</p>
              <div className="flex items-center justify-center gap-6 pt-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
                <span className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-full">
                   <Utensils className="w-3 h-3 text-brand-maroon" /> Table #{tableNumber}
                </span>
                <span className="flex items-center gap-2 px-3 py-1 bg-muted/30 rounded-full">
                   <Clock className="w-3 h-3 text-brand-maroon" /> Session: {sessionName || 'Guest'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  className="w-10 h-10 border-4 border-brand-maroon/20 border-t-brand-maroon rounded-full mx-auto mb-4"
                />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Compiling fiscal records...</p>
              </div>
            ) : (
              <>
                {/* Item List */}
                <div className="space-y-4">
                  <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">
                    <span>Particulars</span>
                    <span>Amount</span>
                  </div>
                  <div className="space-y-3">
                    {aggregatedItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start group">
                        <div className="flex-1">
                          <p className="text-sm font-black text-foreground tracking-tight">{item.name}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase mt-0.5">
                            {item.quantity} × <IndianRupee className="w-2 h-2 inline" />{item.price.toFixed(2)}
                          </p>
                        </div>
                        <p className="font-black text-foreground">₹{item.total.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Section */}
                <div className="space-y-3 pt-6 border-t-2 border-dashed border-border/50">
                   <div className="flex justify-between text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>₹{subtotal.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                      <span>GST (5%)</span>
                      <span>₹{tax.toFixed(2)}</span>
                   </div>
                   {totalDiscount > 0 && (
                     <div className="flex justify-between text-[11px] font-black text-green-600 uppercase tracking-widest">
                        <span>Discounts</span>
                        <span>-₹{totalDiscount.toFixed(2)}</span>
                     </div>
                   )}
                   <div className="flex justify-between items-center bg-brand-maroon/5 p-4 rounded-2xl mt-4">
                      <span className="text-sm font-black text-brand-maroon uppercase tracking-[0.2em]">Grand Total</span>
                      <span className="text-2xl font-black text-brand-maroon">₹{grandTotal.toFixed(2)}</span>
                   </div>
                </div>

                {/* Footer Meta */}
                <div className="text-center pt-8 space-y-1">
                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em]">Generated via Intelligence Terminal</p>
                   <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">
                      {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </p>
                </div>
              </>
            )}

            {/* Print Friendly Footer (Visible only during print) */}
            <div className="hidden print:block text-center pt-10 border-t border-divider mt-10">
               <p className="text-xs font-bold">Thank you for dining with Navratna!</p>
               <p className="text-[10px] text-muted-foreground">Please keep this receipt for your records.</p>
            </div>
          </CardBody>

          {/* Action Footer - Hidden in Print */}
          <div className="p-6 bg-muted/30 flex gap-4 print:hidden">
             <Button 
               variant="outline" 
               className="flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2" 
               onClick={onClose}
             >
               BACK
             </Button>
              <Button 
                className="flex-[2] h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-brand-maroon hover:bg-brand-maroon/90 shadow-xl shadow-brand-maroon/20" 
                onClick={() => window.print()}
                disabled={loading || aggregatedItems.length === 0}
              >
                <Printer className="w-4 h-4 mr-3" />
                PRINT RECEIPT
              </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
