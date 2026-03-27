import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { VegBadge } from '@/components/design-system/badge';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, X, Star } from 'lucide-react';

import { supabase, type MenuItem } from '@/lib/supabase';
import { toast } from 'sonner';


export function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

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
      toast.success(`${item.name} is now ${!item.is_available ? 'Available' : 'Sold Out'}`);
    } catch (error) {
      toast.error('Failed to update availability');
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
      toast.success(`${item.name} ${!item.is_special ? 'marked as Special' : 'removed from Specials'}`);
    } catch (error) {
      toast.error('Failed to update special status');
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
      toast.success('Item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete item');
    }

  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: newItem.name,
            price: parseFloat(newItem.price),
            category: newItem.category,
            veg: newItem.veg,
            image: newItem.image
          })
          .eq('id', editingItem.id);

        if (error) throw error;
        setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...newItem, price: parseFloat(newItem.price) } : i));
        toast.success('Dish updated successfully!');
      } else {
        // Insert new item
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
        toast.success('Dish added to menu successfully!');
      }
      
      setIsAdding(false);
      setEditingItem(null);
      setNewItem({ name: '', price: '', category: 'Main Course', veg: true, image: '🍽️' });
    } catch (error) {
      toast.error(editingItem ? 'Failed to update item' : 'Failed to add item');
    }
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      veg: item.veg,
      image: item.image || '🍽️'
    });
    setIsAdding(true);
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
                  <h3 className="text-xl font-black">{editingItem ? 'Edit Dish' : 'Add New Dish'}</h3>
                  <button onClick={() => { setIsAdding(false); setEditingItem(null); }} className="p-2 hover:bg-muted rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveItem} className="space-y-4">
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
                    {editingItem ? 'UPDATE DISH' : 'SAVE TO MENU'}
                  </Button>
                </form>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Menu Items Grid */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">
            <RefreshCw className="w-10 h-10 mx-auto mb-2 animate-spin" />
            <p className="font-bold">Refreshing menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-8">
          {items
            .filter(item => selectedCategory === 'All' || item.category === selectedCategory)
            .filter(item => !showOnlyAvailable || item.is_available)
            .map((item) => (
              <Card key={item.id} className={`overflow-hidden border-none shadow-sm transition-all active:scale-95 ${!item.is_available ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                <CardBody className="p-3 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{item.category}</p>
                    {item.veg ? <VegBadge /> : <div className="inline-flex items-center justify-center w-4 h-4 border border-red-600 rounded bg-white"><div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div></div>}
                  </div>

                  <div className="flex-1 space-y-1 min-h-[60px]">
                    <h4 className="font-black text-xs text-foreground line-clamp-1">{item.name}</h4>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.category}</p>
                    <div className="flex items-center justify-between mt-1">
                       <span className="text-sm font-black text-primary">₹{item.price}</span>
                       <button
                         onClick={(e) => { e.stopPropagation(); toggleSpecial(item); }}
                         className={`p-1.5 rounded-lg border shadow-sm transition-all active:scale-90 ${item.is_special ? 'bg-yellow-50 border-yellow-200 text-yellow-600 shadow-yellow-100' : 'bg-muted/50 border-transparent text-muted-foreground'}`}
                         title={item.is_special ? "Remove from Specials" : "Mark as Special"}
                       >
                         <Star className={`w-3.5 h-3.5 ${item.is_special ? 'fill-yellow-500' : ''}`} />
                       </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-divider">
                    <button
                      onClick={() => toggleAvailability(item)}
                      className={`flex-1 flex items-center justify-center py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-colors ${
                        item.is_available ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-500'
                      }`}
                    >
                      {item.is_available ? 'AVAIL' : 'SOLD'}
                    </button>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => openEditModal(item)}
                        className="p-1.5 hover:bg-primary/10 hover:border-primary/30 rounded-lg transition-colors border border-border"
                      >
                        <Edit className="w-3 h-3 text-foreground" />
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors border border-red-100"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      )}
      </div>
    </div>
  );
}
