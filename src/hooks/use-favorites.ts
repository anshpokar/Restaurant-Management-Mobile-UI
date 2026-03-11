import { useState, useEffect } from 'react';
import { supabase, type Favorite } from '@/lib/supabase';

export function useFavorites(userId: string | null) {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (userId) {
            fetchFavorites();
        }
    }, [userId]);

    const fetchFavorites = async () => {
        if (!userId) return;
        
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('favorites')
                .select(`
                    *,
                    menu_items (*)
                `)
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFavorites(data || []);
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoading(false);
        }
    };

    const addToFavorites = async (menuItemId: number) => {
        if (!userId) return;

        try {
            const { data, error } = await supabase
                .from('favorites')
                .insert([{ user_id: userId, menu_item_id: menuItemId }])
                .select()
                .single();

            if (error) throw error;
            setFavorites(prev => [data!, ...prev]);
            return data;
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                console.log('Already in favorites');
            } else {
                console.error('Error adding to favorites:', error);
                throw error;
            }
        }
    };

    const removeFromFavorites = async (favoriteId: string) => {
        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('id', favoriteId);

            if (error) throw error;
            setFavorites(prev => prev.filter(f => f.id !== favoriteId));
        } catch (error) {
            console.error('Error removing from favorites:', error);
            throw error;
        }
    };

    const isFavorite = (menuItemId: number) => {
        return favorites.some(f => f.menu_item_id === menuItemId);
    };

    return {
        favorites,
        loading,
        fetchFavorites,
        addToFavorites,
        removeFromFavorites,
        isFavorite
    };
}
