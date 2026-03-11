import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { VegBadge } from '@/components/design-system/badge';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, X, Image as ImageIcon, Star } from 'lucide-react';
import { supabase, type MenuItem } from '@/lib/supabase';

export function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  // New Item Form State
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    category: 'Main Course',
    veg: true,
    image: '🍽️'
  });

  const categories = ['All', 'Starters', 'Main Course', 'Biryani', 'Breads', 'Desserts', 'Beverages'];
  const formCategories = categories.filter(c => c !== 'All');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_available: !item.is_available })
        .eq('id', item.id);

      if (error) throw error;
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i));
    } catch (error) {
      alert('Failed to update availability');
    }
  };

  const toggleSpecial = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_special: !item.is_special })
        .eq('id', item.id);

      if (error) throw error;
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_special: !i.is_special } : i));
    } catch (error) {
      alert('Failed to update special status');
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      alert('Failed to delete item');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          name: newItem.name,
          price: parseFloat(newItem.price),
          category: newItem.category,
          veg: newItem.veg,
          image: newItem.image,
          rating: 4.5,
          is_available: true
        })
        .select()
        .single();

      if (error) throw error;
      setItems(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setIsAdding(false);
      setNewItem({ name: '', price: '', category: 'Main Course', veg: true, image: '🍽️' });
    } catch (error) {
      alert('Failed to add item');
    }
  };

  return (
    <div className="min-h-screen bg-muted/5 pb-24">
      <AppHeader
        title="Menu Management"
        actions={
          <div className="flex gap-2">
            <button onClick={fetchMenu} className="p-2 hover:bg-muted rounded-full">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Button size="sm" onClick={() => setIsAdding(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </div>
        }
      />

      <div className="px-4 py-4 space-y-4">
        {/* Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Filters</p>
            <button
              onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
              className="flex items-center gap-2 text-xs font-bold text-foreground"
            >
              {showOnlyAvailable ? 'Showing Available' : 'Showing All Items'}
              {showOnlyAvailable ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 ${selectedCategory === category
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                    : 'bg-card border-transparent text-muted-foreground hover:border-muted'
                  }`}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Add Item Form Overlay */}
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <Card className="w-full max-w-md border-none shadow-2xl animate-in zoom-in-95 duration-200">
              <CardBody className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black">Add New Dish</h3>
                  <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-muted rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleAddItem} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground uppercase">Dish Name</label>
                    <input
                      required
                      className="w-full px-4 py-3 bg-muted border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      value={newItem.name}
                      onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                      placeholder="e.g. Paneer Butter Masala"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-muted-foreground uppercase">Price (₹)</label>
                      <input
                        required
                        type="number"
                        className="w-full px-4 py-3 bg-muted border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                        value={newItem.price}
                        onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                        placeholder="299"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-black text-muted-foreground uppercase">Icon/Emoji</label>
                      <input
                        required
                        className="w-full px-4 py-3 bg-muted border-none rounded-xl text-center text-xl focus:ring-2 focus:ring-primary outline-none"
                        value={newItem.image}
                        onChange={e => setNewItem({ ...newItem, image: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-muted-foreground uppercase">Category</label>
                    <select
                      required
                      className="w-full px-4 py-3 bg-muted border-none rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      value={newItem.category}
                      onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    >
                      {formCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                    <span className="font-bold text-sm">Vegetarian</span>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, veg: !newItem.veg })}
                      className="transition-all"
                    >
                      {newItem.veg ? <ToggleRight className="w-8 h-8 text-primary" /> : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
                    </button>
                  </div>

                  <Button type="submit" className="w-full h-12 text-lg font-black">
                    SAVE TO MENU
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Menu Items List */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">
            <RefreshCw className="w-10 h-10 mx-auto mb-2 animate-spin" />
            <p>Loading your menu...</p>
          </div>
        ) : (
          items
            .filter(item => selectedCategory === 'All' || item.category === selectedCategory)
            .filter(item => !showOnlyAvailable || item.is_available)
            .map((item) => (
              <Card key={item.id} className={`${!item.is_available ? 'opacity-60 bg-muted/30' : ''} border-none shadow-sm`}>
                <CardBody className="p-4">
                  <div className="flex gap-4">
                    <div className="text-5xl drop-shadow-sm">{item.image}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-foreground">{item.name}</h4>
                            {item.veg ? <VegBadge /> : <div className="inline-flex items-center justify-center w-5 h-5 border-2 border-red-600 rounded"><div className="w-2 h-2 bg-red-600 rounded-full"></div></div>}
                          </div>
                          <p className="text-xs font-bold text-muted-foreground uppercase">{item.category}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => toggleAvailability(item)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
                          >
                            <span className={item.is_available ? 'text-green-600' : 'text-red-500'}>
                              {item.is_available ? 'Available' : 'Sold Out'}
                            </span>
                            {item.is_available ?
                              <ToggleRight className="w-6 h-6 text-green-600" /> :
                              <ToggleLeft className="w-6 h-6 text-red-500" />
                            }
                          </button>
                          <button
                            onClick={() => toggleSpecial(item)}
                            className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${item.is_special ? 'bg-yellow-50 border-yellow-200 text-yellow-600' : 'bg-muted/50 border-muted text-muted-foreground'
                              }`}
                          >
                            <Star className={`w-3 h-3 ${item.is_special ? 'fill-yellow-500' : ''}`} />
                            {item.is_special ? 'Special' : 'Mark Special'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-divider">
                        <span className="text-lg font-black text-primary">₹{item.price}</span>
                        <div className="flex gap-1">
                          <button className="p-2 hover:bg-muted rounded-xl transition-colors">
                            <Edit className="w-4 h-4 text-foreground" />
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="p-2 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}
