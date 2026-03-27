import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { VegBadge } from '@/components/design-system/badge';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw, X, Star } from 'lucide-react';

import { supabase, type MenuItem } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';


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
          <div className="flex gap-3">
            <button 
              onClick={fetchMenu} 
              className="p-2.5 hover:bg-muted rounded-2xl transition-all group"
              title="Refresh Menu"
            >
              <RefreshCw className={`w-5 h-5 text-brand-maroon ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            </button>
            <Button 
              size="sm" 
              onClick={() => setIsAdding(true)}
              className="rounded-2xl bg-brand-maroon hover:bg-brand-maroon/90 shadow-lg shadow-brand-maroon/20 font-black px-4"
            >
              <Plus className="w-4 h-4 mr-2" /> ADD DISH
            </Button>
          </div>
        }
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 py-6 space-y-8 max-w-[1400px] mx-auto"
      >
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
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black whitespace-nowrap transition-all border-2 tracking-widest ${selectedCategory === category
                    ? 'bg-brand-maroon border-brand-maroon text-white shadow-xl shadow-brand-maroon/20 scale-105'
                    : 'bg-white border-transparent text-muted-foreground hover:bg-muted/50 hover:border-muted'
                  }`}
              >
                {category.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Add Item Form Overlay */}
        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-md"
              >
                <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
                  <div className="bg-brand-maroon p-6 text-white flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">{editingItem ? 'Edit Dish' : 'Add New Dish'}</h3>
                      <p className="text-[10px] font-bold opacity-75 uppercase tracking-widest mt-1">Menu Management System</p>
                    </div>
                    <button 
                      onClick={() => { setIsAdding(false); setEditingItem(null); }} 
                      className="p-2 hover:bg-white/20 rounded-2xl transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <CardBody className="p-8 space-y-6">
                    <form onSubmit={handleSaveItem} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Dish Name</label>
                        <input
                          required
                          className="w-full px-6 py-4 bg-muted/50 border-none rounded-2xl focus:ring-2 focus:ring-brand-maroon/20 outline-none font-bold transition-all"
                          value={newItem.name}
                          onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                          placeholder="e.g. Paneer Butter Masala"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Price (₹)</label>
                          <input
                            required
                            type="number"
                            className="w-full px-6 py-4 bg-muted/50 border-none rounded-2xl focus:ring-2 focus:ring-brand-maroon/20 outline-none font-black transition-all"
                            value={newItem.price}
                            onChange={e => setNewItem({ ...newItem, price: e.target.value })}
                            placeholder="299"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-center block">Icon</label>
                          <input
                            required
                            className="w-full px-6 py-4 bg-muted/50 border-none rounded-2xl text-center text-2xl focus:ring-2 focus:ring-brand-maroon/20 outline-none transition-all"
                            value={newItem.image}
                            onChange={e => setNewItem({ ...newItem, image: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Category</label>
                        <select
                          required
                          className="w-full px-6 py-4 bg-muted/50 border-none rounded-2xl focus:ring-2 focus:ring-brand-maroon/20 outline-none font-bold appearance-none transition-all"
                          value={newItem.category}
                          onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                        >
                          {formCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-dashed border-muted-foreground/20">
                        <div>
                          <p className="font-black text-xs uppercase tracking-tight">Vegetarian Only</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">Toggle dietary preference</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewItem({ ...newItem, veg: !newItem.veg })}
                          className="transition-all active:scale-90"
                        >
                          {newItem.veg ? <ToggleRight className="w-10 h-10 text-brand-maroon" /> : <ToggleLeft className="w-10 h-10 text-muted-foreground/50" />}
                        </button>
                      </div>

                      <Button type="submit" className="w-full h-16 text-sm font-black tracking-[0.2em] bg-brand-maroon hover:bg-brand-maroon/90 shadow-xl shadow-brand-maroon/20 rounded-2xl">
                        {editingItem ? 'UPDATE TRANSACTION' : 'CONFIRM TO MENU'}
                      </Button>
                    </form>
                  </CardBody>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu Items Grid */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground animate-pulse">
            <RefreshCw className="w-10 h-10 mx-auto mb-2 animate-spin" />
            <p className="font-bold">Refreshing menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
            <AnimatePresence mode="popLayout">
              {items
                .filter(item => selectedCategory === 'All' || item.category === selectedCategory)
                .filter(item => !showOnlyAvailable || item.is_available)
                .map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Card className={`overflow-hidden border-none shadow-lg shadow-black/5 transition-all group rounded-[2rem] h-full flex flex-col hover:shadow-2xl hover:shadow-brand-maroon/5 ${!item.is_available ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                      <CardBody className="p-5 flex flex-col h-full space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${item.is_available ? 'bg-muted/50' : 'bg-red-50'}`}>
                            {item.image || '🍽️'}
                          </div>
                          {item.veg ? <VegBadge /> : <div className="inline-flex items-center justify-center w-5 h-5 border-2 border-red-600 rounded bg-white"><div className="w-2 h-2 bg-red-600 rounded-full"></div></div>}
                        </div>

                        <div className="flex-1 space-y-1">
                          <h4 className="font-black text-sm text-foreground leading-tight group-hover:text-brand-maroon transition-colors">{item.name}</h4>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{item.category}</p>
                          <div className="flex items-center justify-between mt-3">
                             <span className="text-xl font-black text-brand-maroon">₹{item.price}</span>
                             <button
                               onClick={(e) => { e.stopPropagation(); toggleSpecial(item); }}
                               className={`p-2 rounded-xl border transition-all active:scale-90 ${item.is_special ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-lg shadow-amber-100' : 'bg-muted/30 border-transparent text-muted-foreground'}`}
                               title={item.is_special ? "Remove from Specials" : "Mark as Special"}
                             >
                               <Star className={`w-4 h-4 ${item.is_special ? 'fill-amber-500' : ''}`} />
                             </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-auto pt-4 border-t border-dashed border-border">
                          <button
                            onClick={() => toggleAvailability(item)}
                            className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all active:scale-95 ${
                              item.is_available 
                                ? 'bg-green-50 border-green-100 text-green-600 hover:bg-green-100' 
                                : 'bg-red-50 border-red-100 text-red-500 hover:bg-red-100'
                            }`}
                          >
                            {item.is_available ? 'AVAILABLE' : 'SOLD OUT'}
                          </button>
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => openEditModal(item)}
                              className="p-2.5 hover:bg-brand-maroon/5 hover:border-brand-maroon/20 rounded-xl transition-all border border-border group/btn"
                            >
                              <Edit className="w-4 h-4 text-muted-foreground group-hover/btn:text-brand-maroon" />
                            </button>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-2.5 hover:bg-red-50 hover:border-red-200 rounded-xl transition-all border border-border group/del"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground group-hover/del:text-red-500" />
                            </button>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
