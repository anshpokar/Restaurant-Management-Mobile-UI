import React from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Badge } from '@/app/components/design-system/badge';
import { Users, Clock } from 'lucide-react';

const tables = [
  { id: 1, seats: 2, status: 'vacant', customer: null },
  { id: 2, seats: 4, status: 'occupied', customer: 'John Doe', orderTime: '45m' },
  { id: 3, seats: 4, status: 'vacant', customer: null },
  { id: 4, seats: 6, status: 'reserved', customer: 'Jane Smith', time: '7:30 PM' },
  { id: 5, seats: 2, status: 'occupied', customer: 'Bob Wilson', orderTime: '20m' },
  { id: 6, seats: 8, status: 'vacant', customer: null },
  { id: 7, seats: 4, status: 'occupied', customer: 'Alice Brown', orderTime: '35m' },
  { id: 8, seats: 2, status: 'reserved', customer: 'Charlie Davis', time: '8:00 PM' },
];

export function AdminTables() {
  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Table Management" />

      <div className="px-4 py-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{tables.filter(t => t.status === 'vacant').length}</p>
              <p className="text-xs text-muted-foreground">Vacant</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{tables.filter(t => t.status === 'occupied').length}</p>
              <p className="text-xs text-muted-foreground">Occupied</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{tables.filter(t => t.status === 'reserved').length}</p>
              <p className="text-xs text-muted-foreground">Reserved</p>
            </CardBody>
          </Card>
        </div>

        {/* Table Grid */}
        <div className="grid grid-cols-2 gap-3">
          {tables.map((table) => (
            <Card
              key={table.id}
              className={`cursor-pointer transition-shadow ${
                table.status === 'vacant' 
                  ? 'border-green-500 hover:shadow-lg' 
                  : table.status === 'occupied'
                  ? 'border-red-500'
                  : 'border-yellow-500'
              }`}
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-foreground">Table {table.id}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{table.seats} seats</span>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      table.status === 'vacant' ? 'vacant' :
                      table.status === 'occupied' ? 'occupied' : 'warning'
                    }
                    size="sm"
                  >
                    {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                  </Badge>
                </div>

                {table.customer && (
                  <div className="pt-3 border-t border-divider">
                    <p className="text-sm font-medium text-foreground mb-1">{table.customer}</p>
                    {table.orderTime && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{table.orderTime} ago</span>
                      </div>
                    )}
                    {table.time && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Reserved for {table.time}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
