import React from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Badge, VegBadge } from '@/app/components/design-system/badge';
import { MapPin, Bell, UtensilsCrossed, Calendar, Truck, Star } from 'lucide-react';

interface HomeScreenProps {
  onNavigate: (tab: string) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="NAVRATNA"
        actions={
          <button className="p-2 text-foreground hover:bg-muted rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
          </button>
        }
      />

      <div className="px-4 py-4 space-y-6">
        {/* Location Selector */}
        <button className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <MapPin className="w-5 h-5" />
          <div className="text-left">
            <p className="text-sm font-medium">Delivering to</p>
            <p className="text-xs text-muted-foreground">Connaught Place, New Delhi</p>
          </div>
        </button>

        {/* Hero Banner */}
        <Card className="overflow-hidden bg-gradient-to-br from-primary to-accent">
          <CardBody className="p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 fill-secondary text-secondary" />
              <Badge variant="warning" size="sm">Today's Special</Badge>
            </div>
            <h2 className="text-2xl font-bold mb-2">Navratna Korma</h2>
            <p className="text-white/90 mb-4">Nine precious ingredients in a creamy cashew sauce</p>
            <button className="bg-secondary text-primary px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity">
              Order Now - ₹349
            </button>
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Card onClick={() => onNavigate('menu')} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardBody className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-primary/10 rounded-2xl flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Order Food</p>
            </CardBody>
          </Card>

          <Card onClick={() => onNavigate('bookings')} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardBody className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-accent/10 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sm font-medium text-foreground">Book Table</p>
            </CardBody>
          </Card>

          <Card onClick={() => onNavigate('orders')} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardBody className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-secondary/10 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-sm font-medium text-foreground">Track Order</p>
            </CardBody>
          </Card>
        </div>

        {/* Offers Banner */}
        <Card className="bg-gradient-to-r from-secondary/20 to-accent/20 border-secondary/30">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground mb-1">🎉 Flat 30% OFF</p>
                <p className="text-sm text-muted-foreground">On orders above ₹499</p>
              </div>
              <button className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90">
                Apply
              </button>
            </div>
          </CardBody>
        </Card>

        {/* Bestsellers Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-foreground">Bestsellers</h3>
            <button className="text-sm text-primary hover:underline">See All</button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {[
              { name: 'Paneer Tikka', price: 299, image: '🧈', veg: true, rating: 4.5 },
              { name: 'Butter Chicken', price: 349, image: '🍗', veg: false, rating: 4.8 },
              { name: 'Dal Makhani', price: 249, image: '🍛', veg: true, rating: 4.7 },
              { name: 'Biryani', price: 399, image: '🍚', veg: false, rating: 4.6 },
            ].map((item, index) => (
              <Card key={index} className="min-w-[160px] cursor-pointer hover:shadow-lg transition-shadow">
                <CardBody className="p-3">
                  <div className="text-5xl mb-2 text-center">{item.image}</div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-foreground mb-1">{item.name}</h4>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-secondary text-secondary" />
                        <span>{item.rating}</span>
                      </div>
                    </div>
                    {item.veg ? <VegBadge /> : <div className="inline-flex items-center justify-center w-5 h-5 border-2 border-red-600 rounded"><div className="w-2 h-2 bg-red-600 rounded-full"></div></div>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">₹{item.price}</span>
                    <button className="bg-primary text-white px-3 py-1 rounded-lg text-xs font-medium hover:opacity-90">
                      Add
                    </button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* Categories Grid */}
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">Categories</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: 'Starters', icon: '🥗', color: 'bg-red-100' },
              { name: 'Main Course', icon: '🍛', color: 'bg-yellow-100' },
              { name: 'Breads', icon: '🫓', color: 'bg-orange-100' },
              { name: 'Desserts', icon: '🍨', color: 'bg-pink-100' },
              { name: 'Beverages', icon: '🥤', color: 'bg-blue-100' },
              { name: 'Combos', icon: '🍱', color: 'bg-green-100' },
              { name: 'Biryani', icon: '🍚', color: 'bg-purple-100' },
              { name: 'Chinese', icon: '🥟', color: 'bg-indigo-100' },
            ].map((category, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardBody className="p-3 text-center">
                  <div className={`w-12 h-12 mx-auto mb-2 ${category.color} rounded-2xl flex items-center justify-center text-2xl`}>
                    {category.icon}
                  </div>
                  <p className="text-xs font-medium text-foreground">{category.name}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
