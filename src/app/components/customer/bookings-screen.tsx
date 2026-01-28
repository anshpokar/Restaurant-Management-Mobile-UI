import React from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Button } from '@/app/components/design-system/button';
import { Calendar, Users, Clock } from 'lucide-react';

export function BookingsScreen() {
  const tables = [
    { id: 1, seats: 2, status: 'vacant' },
    { id: 2, seats: 4, status: 'occupied' },
    { id: 3, seats: 4, status: 'vacant' },
    { id: 4, seats: 6, status: 'reserved' },
    { id: 5, seats: 2, status: 'vacant' },
    { id: 6, seats: 8, status: 'vacant' },
  ];

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="Book Table" />

      <div className="px-4 py-4 space-y-6">
        {/* Booking Form */}
        <Card>
          <CardBody className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time
                </label>
                <input
                  type="time"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm"
                  defaultValue="19:00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Number of Guests
              </label>
              <select className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-sm">
                {[2, 4, 6, 8, 10].map((num) => (
                  <option key={num} value={num}>{num} Guests</option>
                ))}
              </select>
            </div>
          </CardBody>
        </Card>

        {/* Available Tables */}
        <div>
          <h3 className="text-lg font-bold text-foreground mb-3">Available Tables</h3>
          <div className="grid grid-cols-2 gap-3">
            {tables.map((table) => (
              <Card
                key={table.id}
                className={`cursor-pointer ${
                  table.status === 'vacant' 
                    ? 'border-green-500 hover:shadow-lg' 
                    : table.status === 'occupied'
                    ? 'border-red-500 opacity-50'
                    : 'border-yellow-500 opacity-75'
                }`}
              >
                <CardBody className="p-4 text-center">
                  <p className="text-2xl mb-2">🪑</p>
                  <p className="font-medium text-foreground">Table {table.id}</p>
                  <p className="text-xs text-muted-foreground mb-2">{table.seats} seats</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    table.status === 'vacant'
                      ? 'bg-green-100 text-green-700'
                      : table.status === 'occupied'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                  </span>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        <Button className="w-full" size="lg">
          Confirm Booking
        </Button>
      </div>
    </div>
  );
}
