import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { Users, Clock, DollarSign, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase, type RestaurantTable, type Order } from '@/lib/supabase';
import { Button } from '@/components/design-system/button';

export function AdminTables() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [activeOrders, setActiveOrders] = useState<Record<string, Order>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all tables
      const { data: tableData } = await supabase
        .from('restaurant_tables')
        .select('*')
        .order('table_number', { ascending: true });

      setTables(tableData || []);

      // 2. Fetch all unpaid orders with their items and customer profiles
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, order_items(*), profiles(*)')
        .eq('is_paid', false);

      const orderMap: Record<string, Order> = {};
      orderData?.forEach(order => {
        if (order.table_id) orderMap[order.table_id] = order;
      });
      setActiveOrders(orderMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const releaseTable = async (tableId: string, orderId?: string) => {
    if (!confirm('Mark as paid and release this table?')) return;

    try {
      // 1. Mark order as paid
      if (orderId) {
        await supabase
          .from('orders')
          .update({ is_paid: true, status: 'delivered' })
          .eq('id', orderId);
      }

      // 2. Mark table as available
      await supabase
        .from('restaurant_tables')
        .update({ status: 'available' })
        .eq('id', tableId);

      fetchData();
    } catch (err) {
      alert('Failed to release table');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader
        title="Table Management"
        actions={
          <button onClick={fetchData} className="p-2 hover:bg-muted rounded-full">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-sm">
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-black text-green-600">
                {tables.filter(t => t.status === 'available').length}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Vacant</p>
            </CardBody>
          </Card>
          <Card className="border-none shadow-sm">
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-black text-red-600">
                {tables.filter(t => t.status === 'occupied').length}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Occupied</p>
            </CardBody>
          </Card>
          <Card className="border-none shadow-sm">
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-black text-orange-500">
                {tables.filter(t => t.status === 'reserved').length}
              </p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Reserved</p>
            </CardBody>
          </Card>
        </div>

        {/* Table Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tables.map((table) => {
            const activeOrder = activeOrders[table.id];
            return (
              <Card
                key={table.id}
                className={`transition-all border-2 ${table.status === 'available'
                    ? 'border-green-100 hover:border-green-300'
                    : table.status === 'occupied'
                      ? 'border-red-100 bg-red-50/10'
                      : 'border-orange-100'
                  }`}
              >
                <CardBody className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xl font-black text-foreground">Table {table.table_number}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{table.capacity} Seats</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        table.status === 'available' ? 'success' :
                          table.status === 'occupied' ? 'occupied' : 'warning'
                      }
                    >
                      {table.status.toUpperCase()}
                    </Badge>
                  </div>

                  {activeOrder ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-white rounded-xl border border-divider shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-black uppercase text-muted-foreground">Guest</p>
                          <p className="text-xs font-black text-foreground">
                            {activeOrder.profiles?.full_name || 'Walk-in Guest'}
                          </p>
                        </div>
                        <div className="space-y-1 mb-3">
                          {activeOrder.order_items?.map((item, i) => (
                            <div key={i} className="flex justify-between text-[10px]">
                              <span>x{item.quantity} {item.name}</span>
                              <span className="font-bold">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-divider flex justify-between items-center">
                          <span className="text-sm font-black text-primary flex items-center gap-1">
                            <DollarSign className="w-4 h-4" /> Bill Total
                          </span>
                          <span className="text-lg font-black text-primary">₹{activeOrder.total_amount}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => releaseTable(table.id, activeOrder.id)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Paid & Release
                      </Button>
                    </div>
                  ) : table.status === 'occupied' ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground italic">No active order found for this table.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => releaseTable(table.id)}
                      >
                        Force Release Table
                      </Button>
                    </div>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
