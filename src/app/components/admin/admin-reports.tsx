import React from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Button } from '@/app/components/design-system/button';
import { Download, LogOut, TrendingUp, Calendar } from 'lucide-react';

interface AdminReportsProps {
  onLogout: () => void;
}

export function AdminReports({ onLogout }: AdminReportsProps) {
  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Reports & Settings" />

      <div className="px-4 py-4 space-y-6">
        {/* Date Range Picker */}
        <Card>
          <CardBody className="p-4">
            <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="px-3 py-2 bg-surface border border-border rounded-xl text-sm"
                defaultValue={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
              <input
                type="date"
                className="px-3 py-2 bg-surface border border-border rounded-xl text-sm"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
          </CardBody>
        </Card>

        {/* Revenue Summary */}
        <Card>
          <CardBody className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Revenue Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Total Revenue</span>
                <span className="font-bold text-lg text-foreground">₹1,64,320</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Total Orders</span>
                <span className="font-bold text-foreground">328</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Average Order Value</span>
                <span className="font-bold text-foreground">₹501</span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-divider">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">+18% from last week</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Best Selling Items */}
        <Card>
          <CardBody className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Best Selling Items</h3>
            <div className="space-y-3">
              {[
                { name: 'Butter Chicken', orders: 87, revenue: 30363 },
                { name: 'Biryani', orders: 65, revenue: 25935 },
                { name: 'Paneer Tikka', orders: 54, revenue: 16146 },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.orders} orders</p>
                  </div>
                  <span className="font-bold text-foreground">₹{item.revenue.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Order Type Distribution */}
        <Card>
          <CardBody className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Order Type Distribution</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Dine-in</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: '55%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-foreground">55%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Delivery</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: '30%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-foreground">30%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Takeaway</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: '15%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-foreground">15%</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Export Options */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Export as PDF
          </Button>
          <Button variant="outline" className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Export as Excel
          </Button>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full !text-destructive !border-destructive hover:!bg-destructive/10"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Logout from Admin
        </Button>
      </div>
    </div>
  );
}
