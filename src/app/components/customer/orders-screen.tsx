import React, { useState } from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Badge } from '@/app/components/design-system/badge';
import { Package, Clock, CheckCircle2 } from 'lucide-react';

const orders = [
  { id: '#12345', date: '23 Jan 2026', time: '7:30 PM', items: ['Paneer Tikka', 'Dal Makhani', 'Naan x2'], total: 597, status: 'delivered' },
  { id: '#12344', date: '22 Jan 2026', time: '8:15 PM', items: ['Butter Chicken', 'Biryani', 'Gulab Jamun'], total: 847, status: 'preparing' },
  { id: '#12343', date: '20 Jan 2026', time: '6:45 PM', items: ['Dal Makhani', 'Naan x4'], total: 345, status: 'delivered' },
];

export function OrdersScreen() {
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed'>('all');

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="My Orders" />

      <div className="px-4 py-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-2xl">
          {['all', 'ongoing', 'completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab as any)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                filter === tab
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {orders
            .filter((order) => {
              if (filter === 'all') return true;
              if (filter === 'ongoing') return order.status !== 'delivered';
              return order.status === 'delivered';
            })
            .map((order) => (
              <Card key={order.id}>
                <CardBody className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{order.id}</p>
                      <p className="text-xs text-muted-foreground">{order.date} • {order.time}</p>
                    </div>
                    <Badge variant={order.status === 'delivered' ? 'success' : 'warning'} size="sm">
                      {order.status === 'delivered' ? 'Delivered' : 'Preparing'}
                    </Badge>
                  </div>

                  <div className="space-y-1 mb-3">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-foreground">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-divider">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <p className="font-bold text-foreground">₹{order.total}</p>
                    </div>
                    <button className="text-primary text-sm font-medium hover:underline">
                      {order.status === 'delivered' ? 'Reorder' : 'Track Order'}
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>

        {/* Empty State */}
        {orders.filter((order) => {
          if (filter === 'all') return true;
          if (filter === 'ongoing') return order.status !== 'delivered';
          return order.status === 'delivered';
        }).length === 0 && (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}
