import React from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Button } from '@/app/components/design-system/button';
import { VegBadge } from '@/app/components/design-system/badge';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const menuItems = [
  { id: 1, name: 'Paneer Tikka', price: 299, category: 'Starters', veg: true, available: true, image: '🧈' },
  { id: 2, name: 'Butter Chicken', price: 349, category: 'Main Course', veg: false, available: true, image: '🍗' },
  { id: 3, name: 'Dal Makhani', price: 249, category: 'Main Course', veg: true, available: false, image: '🍛' },
  { id: 4, name: 'Biryani', price: 399, category: 'Biryani', veg: false, available: true, image: '🍚' },
];

export function AdminMenu() {
  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader 
        title="Menu Management"
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        }
      />

      <div className="px-4 py-4 space-y-3">
        {menuItems.map((item) => (
          <Card key={item.id}>
            <CardBody className="p-4">
              <div className="flex gap-3">
                <div className="text-4xl">{item.image}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-foreground">{item.name}</h4>
                        {item.veg ? <VegBadge /> : <div className="inline-flex items-center justify-center w-5 h-5 border-2 border-red-600 rounded"><div className="w-2 h-2 bg-red-600 rounded-full"></div></div>}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                      {item.available ? 
                        <ToggleRight className="w-5 h-5 text-green-600" /> : 
                        <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                      }
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-foreground">₹{item.price}</span>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <Edit className="w-4 h-4 text-foreground" />
                      </button>
                      <button className="p-2 hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
