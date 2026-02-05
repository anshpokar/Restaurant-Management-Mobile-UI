import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/app/components/design-system/app-header';
import { Card, CardBody } from '@/app/components/design-system/card';
import { Badge, VegBadge } from '@/app/components/design-system/badge';
import { MapPin, User, UtensilsCrossed, Calendar, Truck, Star, RefreshCw, Tag } from 'lucide-react';
import { supabase, type MenuItem, type Offer } from '@/lib/supabase';
import { type Profile } from '@/lib/supabase';

interface HomeScreenProps {
  onNavigate: (tab: any) => void;
  onAddToCart?: (item: MenuItem) => void;
  profile: Profile | null;
}

export function HomeScreen({ onNavigate, onAddToCart, profile }: HomeScreenProps) {
  const [bestsellers, setBestsellers] = useState<MenuItem[]>([]);
  const [specials, setSpecials] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [specialIndex, setSpecialIndex] = useState(0);
  const [offerIndex, setOfferIndex] = useState(0);

  useEffect(() => {
    fetchHomeData();
  }, []);

  // Auto-slide effect for specials and offers
  useEffect(() => {
    if (specials.length > 1) {
      const timer = setInterval(() => {
        setSpecialIndex((prev) => (prev + 1) % specials.length);
      }, 5000); // Change special every 5 seconds
      return () => clearInterval(timer);
    }
  }, [specials.length]);

  useEffect(() => {
    if (offers.length > 1) {
      const timer = setInterval(() => {
        setOfferIndex((prev) => (prev + 1) % offers.length);
      }, 7000); // Change offer every 7 seconds
      return () => clearInterval(timer);
    }
  }, [offers.length]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      // Fetch Bestsellers
      const { data: bestData } = await supabase
        .from('menu_items')
        .select('*')
        .order('rating', { ascending: false })
        .limit(5);

      // Fetch Today's Specials
      const { data: specialData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_special', true)
        .limit(3);

      // Fetch Active Offers
      const { data: offerData } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .limit(3);

      setBestsellers(bestData || []);
      setSpecials(specialData || []);
      setOffers(offerData || []);
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-background pb-10">
      <AppHeader 
        title="NAVRATNA"
        actions={
          <button 
            onClick={() => onNavigate('profile')}
            className="p-2 text-foreground hover:bg-muted rounded-full transition-colors relative"
          >
            <User className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-4 py-4 space-y-6">
        {/* User Greeting */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">
              Hello, {profile?.full_name?.split(' ')[0] || 'Guest'}! 👋
            </h2>
            <p className="text-muted-foreground text-sm">What would you like to eat today?</p>
          </div>
          <button className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold text-lg">
            {profile?.full_name?.[0] || '👤'}
          </button>
        </div>

        {/* Location Selector */}
        <button className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <MapPin className="w-5 h-5" />
          <div className="text-left">
            <p className="text-sm font-medium">Delivering to</p>
            <p className="text-xs text-muted-foreground">Connaught Place, New Delhi</p>
          </div>
        </button>

        {/* Hero Banner (Dynamic Animated Today's Special) */}
        {specials.length > 0 ? (
          <div className="relative overflow-hidden rounded-3xl shadow-xl">
            {specials.map((special, idx) => (
              <Card 
                key={special.id} 
                className={`overflow-hidden bg-gradient-to-br from-primary to-accent border-none transition-all duration-700 absolute inset-0 ${
                  idx === specialIndex ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-full z-0'
                }`}
              >
                <CardBody className="p-6 text-white relative h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 fill-secondary text-secondary" />
                    <Badge variant="warning" size="sm">Today's Special</Badge>
                  </div>
                  <h2 className="text-2xl font-black mb-1">{special.name}</h2>
                  <p className="text-white/90 mb-4 text-sm max-w-[200px]">Fresh from the kitchen! Limited availability.</p>
                  <button 
                    onClick={() => onNavigate('menu')}
                    className="bg-secondary text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition-all active:scale-95"
                  >
                    Order Now - ₹{special.price}
                  </button>
                  <div className="absolute top-6 right-6 text-7xl opacity-20">{special.image}</div>
                </CardBody>
              </Card>
            ))}
            {/* Height Spacer because cards are absolute */}
            <div className="invisible p-6 h-[180px]">
              <h2 className="text-2xl font-black mb-1">Spacer</h2>
            </div>
            
            {/* Pagination Dots */}
            {specials.length > 1 && (
              <div className="absolute bottom-4 right-6 z-20 flex gap-1.5">
                {specials.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === specialIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <Card className="overflow-hidden bg-gradient-to-br from-primary to-accent border-none shadow-xl">
            <CardBody className="p-6 text-white relative">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 fill-secondary text-secondary" />
                <Badge variant="warning" size="sm">Welcome Special</Badge>
              </div>
              <h2 className="text-2xl font-black mb-1">Navratna Korma</h2>
              <p className="text-white/90 mb-4 text-sm max-w-[200px]">Nine precious ingredients in a creamy cashew sauce</p>
              <button 
                onClick={() => onNavigate('menu')}
                className="bg-secondary text-white px-6 py-2 rounded-xl font-bold hover:opacity-90 transition-all active:scale-95"
              >
                Order Now - ₹349
              </button>
              <div className="absolute top-6 right-6 text-7xl opacity-20">🍛</div>
            </CardBody>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <Card onClick={() => onNavigate('menu')} className="cursor-pointer hover:shadow-lg transition-all border-none bg-surface active:scale-95">
            <CardBody className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-primary/10 rounded-2xl flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground">Order Food</p>
            </CardBody>
          </Card>

          <Card onClick={() => onNavigate('bookings')} className="cursor-pointer hover:shadow-lg transition-all border-none bg-surface active:scale-95">
            <CardBody className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-accent/10 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent" />
              </div>
              <p className="text-xs font-bold text-foreground">Book Table</p>
            </CardBody>
          </Card>

          <Card onClick={() => onNavigate('orders')} className="cursor-pointer hover:shadow-lg transition-all border-none bg-surface active:scale-95">
            <CardBody className="p-4 text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-secondary/10 rounded-2xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-xs font-bold text-foreground">Track Order</p>
            </CardBody>
          </Card>
        </div>

        {/* Categories Grid */}
        <div>
          <h3 className="text-xl font-black text-foreground mb-4">Categories</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { name: 'Starters', icon: '🥗', color: 'bg-red-100', category: 'Starters' },
              { name: 'Main', icon: '🍛', color: 'bg-yellow-100', category: 'Main Course' },
              { name: 'Breads', icon: '🫓', color: 'bg-orange-100', category: 'Breads' },
              { name: 'Desserts', icon: '🍨', color: 'bg-pink-100', category: 'Desserts' },
            ].map((category, index) => (
              <Card 
                key={index} 
                onClick={() => onNavigate('menu')}
                className="cursor-pointer hover:shadow-lg transition-all border-none bg-surface active:scale-95"
              >
                <CardBody className="p-3 text-center">
                  <div className={`w-12 h-12 mx-auto mb-2 ${category.color} rounded-2xl flex items-center justify-center text-2xl`}>
                    {category.icon}
                  </div>
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">{category.name}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* Bestsellers Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-foreground">Bestsellers</h3>
            <button onClick={() => onNavigate('menu')} className="text-sm text-primary font-bold hover:underline">See All</button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="min-w-[180px] h-[200px] bg-muted animate-pulse rounded-3xl" />
              ))
            ) : bestsellers.length === 0 ? (
              <p className="text-muted-foreground text-sm px-4">No items available yet.</p>
            ) : (
              bestsellers.map((item) => (
                <Card key={item.id} className="min-w-[180px] cursor-pointer hover:shadow-xl transition-all border-none bg-surface">
                  <CardBody className="p-4">
                    <div className="text-5xl mb-3 text-center drop-shadow-md">{item.image}</div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm text-foreground mb-1 leading-tight">{item.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 fill-secondary text-secondary" />
                          <span>{item.rating}</span>
                        </div>
                      </div>
                      {item.veg ? <VegBadge /> : <div className="inline-flex items-center justify-center w-5 h-5 border-2 border-red-600 rounded"><div className="w-2 h-2 bg-red-600 rounded-full"></div></div>}
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-black text-primary">₹{item.price}</span>
                      {item.is_available ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart?.(item);
                          }}
                          className="bg-primary text-white p-2 rounded-lg hover:opacity-90 active:scale-90 transition-all"
                        >
                          <UtensilsCrossed className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-black text-red-500 uppercase">Sold Out</span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Offers Banners (Animated) */}
        {offers.length > 0 ? (
          <div className="relative h-[90px]">
            {offers.map((offer, idx) => (
              <Card 
                key={offer.id} 
                className={`absolute inset-0 bg-secondary/10 border-dashed border-2 border-secondary/30 transition-all duration-500 ${
                  idx === offerIndex ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 z-0'
                }`}
              >
                <CardBody className="p-4 h-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-secondary mb-1 uppercase tracking-tight">🎉 {offer.title}</p>
                      <p className="text-xs text-muted-foreground">{offer.description}</p>
                    </div>
                    <div className="bg-white border-2 border-secondary/20 px-3 py-1 rounded-lg shadow-sm">
                      <p className="text-[10px] font-black text-secondary tracking-widest uppercase">{offer.discount_code}</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-secondary/10 border-dashed border-2 border-secondary/30">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-secondary mb-1">🎉 Flat 30% OFF</p>
                  <p className="text-xs text-muted-foreground">On your first 3 orders above ₹499</p>
                </div>
                <button className="bg-secondary text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90">
                  APPLY
                </button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
