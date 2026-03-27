import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { supabase } from '../../lib/supabase';
import { AppHeader } from '../../components/design-system/app-header';
import { Button } from '../../components/design-system/button';
import { Card } from '../../components/design-system/card';
import { MobileContainer } from '../../components/MobileContainer';
import { Package, Truck, Clock, MapPin, Phone, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

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
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      assigned: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Assigned' },
      out_for_delivery: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Out for Delivery' },
      delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' }
    };
    return badges[status as keyof typeof badges] || badges.pending;
  }

  if (loading) {
    return (
      <MobileContainer>
        <AppHeader title="Delivery Assignment" />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading orders...</p>
        </div>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <AppHeader title="Delivery Assignment" />
      
      <div className="p-4 space-y-4 pb-24">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-orange-50">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-900">{pendingOrders.length}</p>
                <p className="text-xs text-orange-700">Pending Orders</p>
              </div>
            </div>
          </Card>
          <Card className="bg-blue-50">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">
                  {deliveryPersons.filter(dp => dp.is_available && dp.is_on_duty).length}
                </p>
                <p className="text-xs text-blue-700">Available Riders</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pending Orders List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Pending Delivery Orders</h2>
          
          {pendingOrders.length === 0 ? (
            <Card className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-3" />
              <p className="text-gray-600">All caught up! No pending deliveries.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <Card key={order.id} className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">#{order.order_number}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(order.delivery_status).bg} ${getStatusBadge(order.delivery_status).text}`}>
                          {getStatusBadge(order.delivery_status).label}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{order.delivery_address}, {order.delivery_pincode}</span>
                        </div>
                        
                        {order.delivery_instructions && (
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{order.delivery_instructions}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="text-sm">
                      <p className="text-gray-600">Total</p>
                      <p className="font-bold text-gray-900">₹{order.total_amount}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {order.delivery_status === 'pending' && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleAutoAssignDelivery(order.id)}
                            disabled={assigningOrder === order.id}
                          >
                            Auto Assign
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowAssignModal(true);
                            }}
                            disabled={assigningOrder === order.id}
                          >
                            Assign Rider
                          </Button>
                        </>
                      )}
                      
                      {order.delivery_status === 'assigned' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleMarkPickedUp(order.id)}
                        >
                          Mark Picked Up
                        </Button>
                      )}
                      
                      {order.delivery_status === 'out_for_delivery' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </div>

                  {order.assigned_at && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                      <Clock className="w-3 h-3" />
                      Assigned at {new Date(order.assigned_at).toLocaleTimeString()}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Persons List */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Delivery Team</h2>
          
          {deliveryPersons.length === 0 ? (
            <Card className="text-center py-8">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No delivery persons registered yet.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {deliveryPersons.map((person) => (
                <Card key={person.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        person.is_available && person.is_on_duty ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{person.full_name}</p>
                        <p className="text-xs text-gray-500">{person.current_order_count} active orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{person.phone}</p>
                      <p className={`text-xs ${
                        person.is_available && person.is_on_duty 
                          ? 'text-green-600' 
                          : 'text-gray-400'
                      }`}>
                        {person.is_available && person.is_on_duty ? 'Available' : 'Busy'}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50">
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Assign Delivery</h3>
              <p className="text-sm text-gray-600">Order #{selectedOrder.order_number}</p>
            </div>
            
            <div className="p-4 space-y-3">
              {deliveryPersons.filter(dp => dp.is_available && dp.is_on_duty).length === 0 ? (
                <div className="text-center py-8">
                  <XCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
                  <p className="text-gray-600">No delivery persons available right now.</p>
                </div>
              ) : (
                deliveryPersons
                  .filter(person => person.is_available && person.is_on_duty)
                  .map((person) => (
                    <Card 
                      key={person.id} 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleAssignDelivery(selectedOrder.id, person.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{person.full_name}</p>
                          <p className="text-sm text-gray-500">{person.phone}</p>
                          <p className="text-xs text-gray-400">{person.current_order_count} orders</p>
                        </div>
                        <Button variant="primary" size="sm">
                          Assign
                        </Button>
                      </div>
                    </Card>
                  ))
              )}
            </div>
            
            <div className="p-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedOrder(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </MobileContainer>
  );
}
