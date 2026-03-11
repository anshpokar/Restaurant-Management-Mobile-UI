import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { TrendingUp, TrendingDown, ShoppingBag, DollarSign, Users, Calendar, Star, Tag, Plus, Trash2, RefreshCw } from 'lucide-react';
import { supabase, type MenuItem, type Offer } from '@/lib/supabase';

export function AdminDashboard() {
  const [specials, setSpecials] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({ title: '', description: '', discount_code: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Specials
      const { data: specialsData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_special', true);

      // Fetch Offers
      const { data: offersData } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      setSpecials(specialsData || []);
      setOffers(offersData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('offers')
        .insert([{ ...newOffer, is_active: true }])
        .select()
        .single();
      if (error) throw error;
      setOffers([data, ...offers]);
      setIsAddingOffer(false);
      setNewOffer({ title: '', description: '', discount_code: '' });
    } catch (error) {
      alert('Failed to add offer');
    }
  };

  const deleteOffer = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    try {
      await supabase.from('offers').delete().eq('id', id);
      setOffers(offers.filter(o => o.id !== id));
    } catch (error) {
      alert('Failed to delete offer');
    }
  };

  const toggleSpecial = async (item: MenuItem) => {
    try {
      await supabase
        .from('menu_items')
        .update({ is_special: !item.is_special })
        .eq('id', item.id);
      fetchData();
    } catch (error) {
      alert('Failed to update special status');
    }
  };
  const kpis = [
    { label: "Today's Orders", value: '47', change: '+12%', trend: 'up', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Revenue', value: '₹23,450', change: '+8%', trend: 'up', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Active Tables', value: '8/12', change: '4 vacant', trend: 'neutral', icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Bookings', value: '15', change: '+5 new', trend: 'up', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <AppHeader title="Admin Dashboard" />

      <div className="px-4 py-4 space-y-8">
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

        {/* Today's Specials Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Today's Specials
            </h3>
            <button onClick={fetchData} className="p-2 hover:bg-muted rounded-full">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-3">
            {specials.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No items set as Today's Special.</p>
            ) : (
              specials.map(item => (
                <Card key={item.id} className="border-none shadow-sm bg-yellow-50/30">
                  <CardBody className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.image}</span>
                      <div>
                        <p className="font-bold text-sm text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSpecial(item)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </CardBody>
                </Card>
              ))
            )}
            <p className="text-[10px] text-muted-foreground px-1 uppercase font-bold tracking-tighter mt-2">
              Manage specials from the "Menu Management" tab by clicking edit.
            </p>
          </div>
        </div>

        {/* Offers Management */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-foreground flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> Active Offers
            </h3>
            <Button size="sm" onClick={() => setIsAddingOffer(true)}>
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>

          <div className="space-y-3">
            {offers.map(offer => (
              <Card key={offer.id} className="border-dashed border-2 border-primary/20 bg-primary/5">
                <CardBody className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-black text-primary uppercase text-sm">{offer.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{offer.description}</p>
                    <div className="mt-2 inline-block px-2 py-1 bg-white border-2 border-primary/10 rounded-lg text-[10px] font-black tracking-widest uppercase">
                      CODE: {offer.discount_code}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteOffer(offer.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* New Offer Modal */}
        {isAddingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <Card className="w-full max-w-sm">
              <CardBody className="p-6 space-y-4">
                <h3 className="text-lg font-black">Create New Offer</h3>
                <form onSubmit={handleAddOffer} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Title</label>
                    <input
                      required
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary"
                      value={newOffer.title}
                      onChange={e => setNewOffer({ ...newOffer, title: e.target.value })}
                      placeholder="e.g. FLAT 30% OFF"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Description</label>
                    <input
                      required
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary"
                      value={newOffer.description}
                      onChange={e => setNewOffer({ ...newOffer, description: e.target.value })}
                      placeholder="e.g. On orders above ₹499"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Discount Code</label>
                    <input
                      required
                      className="w-full p-3 bg-muted rounded-xl border-none outline-none focus:ring-2 focus:ring-primary"
                      value={newOffer.discount_code}
                      onChange={e => setNewOffer({ ...newOffer, discount_code: e.target.value.toUpperCase() })}
                      placeholder="e.g. NAV30"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddingOffer(false)}>Cancel</Button>
                    <Button type="submit" className="flex-[2]">Create Offer</Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
