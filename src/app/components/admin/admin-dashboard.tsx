import React from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Users, Calendar } from 'lucide-react';

export function AdminDashboard() {
  const kpis = [
    { label: "Today's Orders", value: '47', change: '+12%', trend: 'up', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Revenue', value: '₹23,450', change: '+8%', trend: 'up', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Active Tables', value: '8/12', change: '4 vacant', trend: 'neutral', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Bookings', value: '15', change: '+5 new', trend: 'up', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  const recentOrders = [
    { id: '#12345', table: 'T-4', items: 3, amount: 847, status: 'Preparing', time: '2m ago' },
    { id: '#12344', table: 'T-7', items: 2, amount: 597, status: 'Ready', time: '5m ago' },
    { id: '#12343', table: 'T-2', items: 4, amount: 1240, status: 'Completed', time: '12m ago' },
  ];

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Admin Dashboard" />

      <div className="px-4 py-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
              <Card key={index}>
                <CardBody className="p-4">
                  <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground mb-1">{kpi.value}</p>
                  <div className="flex items-center gap-1">
                    {kpi.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-600" />}
                    {kpi.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-600" />}
                    <span className={`text-xs ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {kpi.change}
                    </span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-primary text-white rounded-2xl text-left hover:opacity-90 transition-opacity">
              <p className="text-sm mb-1">New Order</p>
              <p className="text-2xl font-bold">+</p>
            </button>
            <button className="p-4 bg-secondary text-primary rounded-2xl text-left hover:opacity-90 transition-opacity">
              <p className="text-sm mb-1">Add Item</p>
              <p className="text-2xl font-bold">+</p>
            </button>
          </div>
        </div>

        {/* Recent Orders */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-foreground">Recent Orders</h3>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>
          <div className="space-y-2">
            {recentOrders.map((order, index) => (
              <Card key={index}>
                <CardBody className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-sm text-foreground">{order.id}</p>
                        <span className="text-xs text-muted-foreground">• {order.table}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{order.items} items • ₹{order.amount}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${
                        order.status === 'Preparing' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'Ready' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{order.time}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
