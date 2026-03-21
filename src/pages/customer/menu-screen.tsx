import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { VegBadge } from '@/components/design-system/badge';
import { ItemCustomizationModal } from '@/components/customer/ItemCustomizationModal';
import { Search, SlidersHorizontal, Star, Plus, RefreshCw, ShoppingBag, Minus } from 'lucide-react';
import { supabase, type MenuItem } from '@/lib/supabase';
import { useCart } from '@/contexts/cart-context';

export function MenuScreen() {
  const navigate = useNavigate();
  const { addToCart, cartItems, getTotalItems, getTotalAmount, updateQuantity } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const categories = ['All', 'Starters', 'Main Course', 'Biryani', 'Breads', 'Desserts'];

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
      setMenuItems(data || []);
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader
        title="Menu"
        actions={
          <div className="flex gap-1">
            {cartItems.length > 0 && (
              <button
                onClick={() => navigate('/customer/checkout')}
                className="relative p-2 text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <ShoppingBag className="w-5 h-5" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </button>
            )}
            <button onClick={fetchMenu} className="p-2 text-foreground hover:bg-muted rounded-full transition-colors">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button className="p-2 text-foreground hover:bg-muted rounded-full transition-colors">
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
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
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === category
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
          {loading ? (
            <div className="py-20 text-center text-muted-foreground">
              <RefreshCw className="w-10 h-10 mx-auto mb-4 animate-spin opacity-20" />
              <p className="font-medium">Loading delicious items...</p>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <p className="font-medium">No menu items found.</p>
            </div>
          ) : (
            menuItems
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
                          {item.is_available ? (
                            (() => {
                              const cartItem = cartItems.find(i => i.menu_item_id === item.id);
                              if (cartItem && cartItem.quantity > 0) {
                                return (
                                  <div className="flex items-center gap-2 bg-primary/10 rounded-xl p-1">
                                    <button
                                      onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                                      className="w-8 h-8 bg-white text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center justify-center"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-black text-primary min-w-[2rem] text-center">
                                      {cartItem.quantity}
                                    </span>
                                    <button
                                      onClick={() => addToCart(item, cartItem.special_instructions, cartItem.spice_level)}
                                      className="w-8 h-8 bg-white text-primary rounded-lg font-bold hover:bg-primary hover:text-white transition-all active:scale-95 flex items-center justify-center"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setModalOpen(true);
                                    }}
                                    className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:opacity-90 active:scale-95 transition-all"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add
                                  </button>
                                );
                              }
                            })()
                          ) : (
                            <span className="text-xs font-black text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100 uppercase tracking-tighter">
                              Sold Out
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))
          )}
        </div>

        {/* Customization Modal */}
        {selectedItem && (
          <ItemCustomizationModal
            isOpen={modalOpen}
            itemName={selectedItem.name}
            onClose={() => {
              setModalOpen(false);
              setSelectedItem(null);
            }}
            onConfirm={(specialInstructions, spiceLevel) => {
              if (selectedItem) {
                addToCart?.(selectedItem, specialInstructions, spiceLevel);
              }
              setModalOpen(false);
              setSelectedItem(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
