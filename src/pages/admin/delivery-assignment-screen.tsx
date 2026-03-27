import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { supabase } from '../../lib/supabase';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Card, CardBody } from '../../components/design-system/card';
import { Badge } from '../../components/design-system/badge';
import { MobileContainer } from '../../components/MobileContainer';
import { Package, Truck, Clock, MapPin, AlertCircle, CheckCircle, XCircle, UserCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address: string;
  delivery_pincode: string;
  total_amount: number;
  payment_status: string;
  delivery_status: string;
  delivery_person_id?: string;
  assigned_at?: string;
  created_at: string;
  delivery_address_line2?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_instructions?: string;
}

interface DeliveryPerson {
  id: string;
  full_name: string;
  phone?: string;
  is_available: boolean;
  is_on_duty: boolean;
  current_order_count: number;
}

export function DeliveryAssignmentScreen() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningOrder, setAssigningOrder] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadPendingOrders();
    loadDeliveryPersons();
    
    // Set up real-time subscription
    const channel = supabase.channel('delivery_assignments')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadPendingOrders();
          loadDeliveryPersons();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadPendingOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'delivery')
        .in('delivery_status', ['pending', 'assigned'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDeliveryPersons() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          phone,
          is_available,
          is_on_duty
        `)
        .eq('role', 'delivery');

      if (error) throw error;
      
      // Get active order counts separately
      const enhancedData = await Promise.all(
        (data || []).map(async (person) => {
          const { count } = await supabase
            .from('delivery_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('delivery_person_id', person.id)
            .eq('status', 'assigned');
          
          return {
            ...person,
            current_order_count: count || 0
          } as DeliveryPerson;
        })
      );
      
      setDeliveryPersons(enhancedData);
    } catch (error) {
      console.error('Error loading delivery persons:', error);
    }
  }

  async function handleAssignDelivery(orderId: string, deliveryPersonId: string) {
    try {
      setAssigningOrder(orderId);

      const { error } = await supabase.from('orders').update({
        delivery_person_id: deliveryPersonId,
        delivery_status: 'assigned',
        assigned_at: new Date().toISOString()
      }).eq('id', orderId);

      if (error) throw error;

      // Create assignment record
      const { error: assignmentError } = await supabase.from('delivery_assignments').insert({
        order_id: orderId,
        delivery_person_id: deliveryPersonId,
        status: 'assigned'
      });

      if (assignmentError) throw assignmentError;

      // Send notification to delivery person
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: deliveryPersonId,
        title: 'New Delivery Assignment',
        message: 'You have been assigned a new delivery order.',
        type: 'delivery_assignment',
        metadata: { order_id: orderId }
      });

      if (notifError) console.error('Notification error:', notifError);

      toast.success('Delivery assigned successfully!');
      setShowAssignModal(false);
      setSelectedOrder(null);
      await loadPendingOrders();
      await loadDeliveryPersons();
    } catch (error) {
      console.error('Error assigning delivery:', error);
      toast.error('Failed to assign delivery. Please try again.');
    } finally {

      setAssigningOrder(null);
    }
  }

  async function handleAutoAssignDelivery(orderId: string) {
    try {
      setAssigningOrder(orderId);

      // Get order details
      const order = pendingOrders.find(o => o.id === orderId);
      if (!order || !order.delivery_latitude || !order.delivery_longitude) {
        toast.error('Order coordinates not available for auto-assignment.');
        return;
      }


      // Call auto-assign function
      const { data, error } = await supabase.rpc('auto_assign_delivery_smart', {
        order_id: orderId
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Order automatically assigned to nearest available delivery person!');
        await loadPendingOrders();
        await loadDeliveryPersons();
      } else {
        toast.error(`Auto-assignment failed: ${data?.error || 'Unknown error'}`);
        // Fallback to manual assignment
        setSelectedOrder(order);
        setShowAssignModal(true);
      }
    } catch (error) {
      console.error('Error in auto-assignment:', error);
      toast.error('Failed to auto-assign. Please assign manually.');
    } finally {

      setAssigningOrder(null);
    }
  }

  async function handleMarkPickedUp(orderId: string) {
    try {
      const { error } = await supabase.from('orders').update({
        delivery_status: 'out_for_delivery',
        picked_up_at: new Date().toISOString()
      }).eq('id', orderId);

      if (error) throw error;
      toast.success('Order marked as picked up!');
      await loadPendingOrders();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status.');
    }

  }

  async function handleMarkDelivered(orderId: string) {
    try {
      const { error } = await supabase.from('orders').update({
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        payment_status: 'paid'
      }).eq('id', orderId);

      if (error) throw error;

      // Update delivery assignment status
      const { error: assignmentError } = await supabase.rpc('complete_delivery_assignment', {
        p_order_id: orderId
      });

      if (assignmentError) console.error('Assignment completion error:', assignmentError);

      toast.success('Order marked as delivered!');
      await loadPendingOrders();
    } catch (error) {
      console.error('Error marking delivered:', error);
      toast.error('Failed to mark as delivered.');
    }

  }

  function getStatusBadge(status: string) {
    const badges = {
      pending: { variant: 'warning' as const, label: 'AWAITING DISPATCH' },
      assigned: { variant: 'info' as const, label: 'RIDER ENGAGED' },
      out_for_delivery: { variant: 'success' as const, label: 'IN TRANSIT' },
      delivered: { variant: 'paid' as const, label: 'FULFILLED' }
    };
    const config = badges[status as keyof typeof badges] || badges.pending;
    return (
      <Badge 
        variant={config.variant}
        className="px-3 py-1 rounded-full text-[8px] font-black tracking-widest uppercase border-0"
      >
        {config.label}
      </Badge>
    );
  }

  if (loading && pendingOrders.length === 0) {
    return (
      <MobileContainer>
        <AppHeader title="Dispatch Hub" />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-brand-maroon/20 mb-4" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Synchronizing Fleet...</p>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <AppHeader title="Dispatch Hub" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-8 pb-32 max-w-[1200px] mx-auto"
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
            <Card className="bg-gradient-to-br from-brand-maroon to-red-900 text-white border-none shadow-xl shadow-brand-maroon/20 rounded-[2.5rem] overflow-hidden relative">
              <CardBody className="p-6 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Pending Queue</p>
                </div>
                <p className="text-4xl font-black tracking-tighter">{pendingOrders.length}</p>
              </CardBody>
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
            <Card className="bg-white border-none shadow-xl shadow-black/5 rounded-[2.5rem] overflow-hidden">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Fleet</p>
                </div>
                <p className="text-4xl font-black tracking-tighter text-emerald-600">
                  {deliveryPersons.filter(dp => dp.is_available && dp.is_on_duty).length}
                </p>
              </CardBody>
            </Card>
          </motion.div>
        </div>

        {/* Pending Orders List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground">Logistics Pipeline</h2>
            <div className="px-3 py-1 bg-brand-maroon/5 rounded-full">
              <span className="text-[10px] font-black text-brand-maroon uppercase tracking-widest">{pendingOrders.length} ORDERS</span>
            </div>
          </div>
          
          <AnimatePresence mode="popLayout">
            {pendingOrders.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-muted shadow-inner"
              >
                <CheckCircle className="w-16 h-16 text-emerald-200 mx-auto mb-6" />
                <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-muted-foreground">Dispatch Complete</h3>
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase mt-1">No pending deliveries detected</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingOrders.map((order, index) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="shadow-xl shadow-black/5 border-none rounded-[2.5rem] group hover:shadow-2xl hover:shadow-brand-maroon/5 overflow-hidden transition-all duration-300">
                      <CardBody className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-brand-maroon/5 flex items-center justify-center text-brand-maroon shadow-inner">
                              <Package className="w-7 h-7" />
                            </div>
                            <div>
                              <h3 className="font-black text-foreground tracking-tight group-hover:text-brand-maroon transition-colors text-lg">#{order.order_number}</h3>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mt-0.5">EST. FULFILLMENT: {new Date(order.created_at).toLocaleTimeString()}</p>
                            </div>
                          </div>
                          {getStatusBadge(order.delivery_status)}
                        </div>
                        
                        <div className="space-y-4 mb-6">
                          <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-3xl border border-dashed border-border/50">
                            <MapPin className="w-4 h-4 text-brand-maroon mt-0.5" />
                            <div>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Destination Address</p>
                              <p className="text-xs font-bold text-foreground leading-relaxed">{order.delivery_address}, {order.delivery_pincode}</p>
                            </div>
                          </div>
                          
                          {order.delivery_instructions && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">{order.delivery_instructions}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-dashed border-border/50">
                          <div>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Order Value</p>
                            <p className="text-xl font-black text-foreground tracking-tighter">₹{order.total_amount}</p>
                          </div>
                          
                          <div className="flex gap-2">
                            {order.delivery_status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleAutoAssignDelivery(order.id)}
                                  disabled={assigningOrder === order.id}
                                  className="px-4 py-3 bg-brand-maroon/5 hover:bg-brand-maroon/10 text-brand-maroon text-[9px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50"
                                >
                                  {assigningOrder === order.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'AUTO DISPATCH'}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setShowAssignModal(true);
                                  }}
                                  disabled={assigningOrder === order.id}
                                  className="px-6 py-3 bg-brand-maroon text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-maroon/10 hover:shadow-brand-maroon/20 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  MANUAL ASSIGN
                                </button>
                              </>
                            )}
                            
                            {order.delivery_status === 'assigned' && (
                              <button
                                onClick={() => handleMarkPickedUp(order.id)}
                                className="px-8 py-3 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all active:scale-95"
                              >
                                CONFIRM PICKUP
                              </button>
                            )}
                            
                            {order.delivery_status === 'out_for_delivery' && (
                              <button
                                onClick={() => handleMarkDelivered(order.id)}
                                className="px-8 py-3 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:-translate-y-0.5 transition-all active:scale-95"
                              >
                                COMPLETE DELIVERY
                              </button>
                            )}
                          </div>
                        </div>

                        {order.assigned_at && (
                          <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest pt-4 opacity-40">
                            <Clock className="w-3 h-3" />
                            <span>PROTOCOL INITIATED • {new Date(order.assigned_at).toLocaleTimeString()}</span>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Delivery Persons List */}
        <div className="space-y-4">
          <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Personnel</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveryPersons.length === 0 ? (
              <Card className="col-span-full py-12 text-center bg-white rounded-[2.5rem] border-none shadow-sm">
                <Truck className="w-12 h-12 text-muted/30 mx-auto mb-4" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No logistics partners registered</p>
              </Card>
            ) : (
              deliveryPersons.map((person) => (
                <Card key={person.id} className="border-none shadow-xl shadow-black/5 rounded-[2rem] overflow-hidden group hover:shadow-lg transition-all">
                  <CardBody className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-muted-foreground shadow-inner border transition-colors ${
                            person.is_available && person.is_on_duty ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-muted/50 border-transparent'
                          }`}>
                            <UserCircle className="w-7 h-7" />
                          </div>
                          <div className={`absolute -right-1 -bottom-1 w-3.5 h-3.5 border-2 border-white rounded-full ${
                            person.is_available && person.is_on_duty ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                          }`} />
                        </div>
                        <div>
                          <p className="font-black text-foreground tracking-tight group-hover:text-brand-maroon transition-colors">{person.full_name}</p>
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{person.current_order_count} LOADED ORDERS</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-muted-foreground">{person.phone}</p>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${
                          person.is_available && person.is_on_duty ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {person.is_available && person.is_on_duty ? 'READY' : 'STANDBY'}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* Assignment Modal */}
      <AnimatePresence>
        {showAssignModal && selectedOrder && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAssignModal(false);
                setSelectedOrder(null);
              }}
              className="absolute inset-0 bg-brand-maroon/20 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl relative z-10 sm:mb-8"
            >
              <div className="p-8 border-b border-muted/50 text-center">
                <div className="w-16 h-1 w-12 bg-muted rounded-full mx-auto mb-6" />
                <h3 className="text-xl font-black text-foreground tracking-tight mb-1">Rider Selection</h3>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assign Order #{selectedOrder.order_number}</p>
              </div>
              
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                {deliveryPersons.filter(dp => dp.is_available && dp.is_on_duty).length === 0 ? (
                  <div className="text-center py-12">
                    <XCircle className="w-16 h-16 text-rose-200 mx-auto mb-6" />
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-relaxed px-12">No dispatch protocols available at this time</p>
                  </div>
                ) : (
                  deliveryPersons
                    .filter(person => person.is_available && person.is_on_duty)
                    .map((person) => (
                      <Card 
                        key={person.id} 
                        className="cursor-pointer hover:bg-muted/30 border-none shadow-xl shadow-black/5 rounded-3xl group transition-all"
                        onClick={() => handleAssignDelivery(selectedOrder.id, person.id)}
                      >
                        <CardBody className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                                <UserCircle className="w-7 h-7" />
                              </div>
                              <div>
                                <p className="font-black text-foreground tracking-tight group-hover:text-brand-maroon transition-colors">{person.full_name}</p>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{person.current_order_count} ORDERS CURRENTLY LOADED</p>
                              </div>
                            </div>
                            <Button variant="primary" size="sm" className="h-10 rounded-xl px-4 text-[9px] font-black uppercase tracking-widest bg-brand-maroon">
                              DISPATCH
                            </Button>
                          </div>
                        </CardBody>
                      </Card>
                    ))
                )}
              </div>
              
              <div className="p-8 pt-4">
                <button
                  className="w-full py-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted/50 rounded-2xl transition-all"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedOrder(null);
                  }}
                >
                  ABORT OPERATION
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MobileContainer>
  );
}
