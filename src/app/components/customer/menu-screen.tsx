import React, { useState } from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { VegBadge } from '@/app/components/design-system/badge';
import { Input } from '@/app/components/design-system/input';
import { Search, SlidersHorizontal, Star, Plus } from 'lucide-react';

const menuItems = [
  { id: 1, name: 'Paneer Tikka', price: 299, category: 'Starters', veg: true, rating: 4.5, image: '🧈' },
  { id: 2, name: 'Butter Chicken', price: 349, category: 'Main Course', veg: false, rating: 4.8, image: '🍗' },
  { id: 3, name: 'Dal Makhani', price: 249, category: 'Main Course', veg: true, rating: 4.7, image: '🍛' },
  { id: 4, name: 'Chicken Biryani', price: 399, category: 'Biryani', veg: false, rating: 4.6, image: '🍚' },
  { id: 5, name: 'Naan', price: 49, category: 'Breads', veg: true, rating: 4.4, image: '🫓' },
  { id: 6, name: 'Gulab Jamun', price: 99, category: 'Desserts', veg: true, rating: 4.9, image: '🍮' },
];

export function MenuScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Starters', 'Main Course', 'Biryani', 'Breads', 'Desserts'];

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader 
        title="Menu" 
        actions={
          <button className="p-2 text-foreground hover:bg-muted rounded-full transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-surface border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Category Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems
            .filter((item) => selectedCategory === 'All' || item.category === selectedCategory)
            .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((item) => (
              <Card key={item.id}>
                <CardBody className="p-4">
                  <div className="flex gap-4">
                    <div className="text-5xl">{item.image}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <h4 className="font-medium text-foreground">{item.name}</h4>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Star className="w-3 h-3 fill-secondary text-secondary" />
                            <span>{item.rating}</span>
                          </div>
                        </div>
                        {item.veg ? <VegBadge /> : <div className="inline-flex items-center justify-center w-5 h-5 border-2 border-red-600 rounded"><div className="w-2 h-2 bg-red-600 rounded-full"></div></div>}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">{item.category}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-foreground">₹{item.price}</span>
                        <button className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90">
                          <Plus className="w-4 h-4" />
                          Add
                        </button>
                      </div>
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
