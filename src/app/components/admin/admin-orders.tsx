import React, { useState } from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Button } from '@/app/components/design-system/button';
import { Badge } from '@/app/components/design-system/badge';

type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed';

const orders = [
  { id: '#12345', table: 'T-4', customer: 'John Doe', items: ['Paneer Tikka', 'Dal Makhani'], amount: 847, status: 'new', type: 'Dine-in', time: '2m ago' },
  { id: '#12344', table: 'T-7', customer: 'Jane Smith', items: ['Butter Chicken', 'Naan'], amount: 597, status: 'preparing', type: 'Delivery', time: '5m ago' },
  { id: '#12343', table: 'T-2', customer: 'Bob Wilson', items: ['Biryani', 'Raita', 'Gulab Jamun'], amount: 1240, status: 'ready', type: 'Dine-in', time: '12m ago' },
  { id: '#12342', table: '-', customer: 'Alice Brown', items: ['Dal Makhani', 'Naan x4'], amount: 345, status: 'completed', type: 'Takeaway', time: '25m ago' },
];

export function AdminOrders() {
  const [activeTab, setActiveTab] = useState<OrderStatus>('new');

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Orders" />

      <div className="px-4 py-4 space-y-4">
        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {(['new', 'preparing', 'ready', 'completed'] as OrderStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === status
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {orders
            .filter((order) => order.status === activeTab)
            .map((order) => (
              <Card key={order.id}>
                <CardBody className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-foreground">{order.id}</p>
                        {order.table !== '-' && (
                          <span className="text-xs text-muted-foreground">• {order.table}</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customer}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={order.type === 'Dine-in' ? 'info' : order.type === 'Delivery' ? 'warning' : 'success'} 
                          size="sm"
                        >
                          {order.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{order.time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-foreground">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
                        {item}
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-divider">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="font-bold text-lg text-foreground">₹{order.amount}</p>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'new' && (
                        <Button size="sm">Accept</Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button size="sm" variant="secondary">Mark Ready</Button>
                      )}
                      {order.status === 'ready' && (
                        <Button size="sm" variant="secondary">Complete</Button>
                      )}
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
