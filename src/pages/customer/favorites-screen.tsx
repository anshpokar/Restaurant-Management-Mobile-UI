import { useState } from 'react';
import { AppHeader } from '@/components/design-system/app-header';
import { Card, CardBody } from '@/components/design-system/card';
import { Button } from '@/components/design-system/button';
import { Badge } from '@/components/design-system/badge';
import { Heart, Trash2, UtensilsCrossed, Star } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { type Profile, type MenuItem } from '@/lib/supabase';
import { useFavorites } from '@/hooks/use-favorites';
import { COMMON_TEXT } from '@/constants/text';

export function FavoritesScreen() {
  const { profile } = useOutletContext<{ profile: Profile | null }>();
  const { favorites, loading, removeFromFavorites } = useFavorites(profile?.id || null);

  return (
    <div className="min-h-screen bg-background pb-4">
      <AppHeader title="My Favorites" />

      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="text-center py-10 text-muted-foreground">Loading favorites...</div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-10 bg-surface rounded-2xl border border-dashed">
            <Heart className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-20" />
            <p className="text-sm font-medium text-foreground">No favorites yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start adding dishes you love!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav: any) => {
              const item: MenuItem = fav.menu_items;
              return (
                <Card key={fav.id} className="overflow-hidden">
                  <CardBody className="p-4">
                    <div className="flex gap-4">
                      <div className="text-5xl">{item.image}</div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-bold text-foreground mb-1">{item.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.category}</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-secondary text-secondary" />
                                <span>{item.rating}</span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromFavorites(fav.id)}
                            className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Remove from favorites"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-divider">
                          <span className="text-lg font-bold text-primary">
                            {COMMON_TEXT.CURRENCY_SYMBOL}{item.price}
                          </span>
                          <Badge variant={item.veg ? 'success' : 'error'} size="sm">
                            {item.veg ? 'Veg' : 'Non-Veg'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
