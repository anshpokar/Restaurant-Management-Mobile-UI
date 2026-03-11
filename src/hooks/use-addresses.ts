import { useState, useEffect } from 'react';
import { supabase, type Address, type AddressInput, getStoredUser } from '@/lib/supabase';

export function useAddresses(userId: string | null) {
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [loading, setLoading] = useState(false);

    // Get userId from stored data if not provided
    const effectiveUserId = userId || getStoredUser()?.id || null;

    useEffect(() => {
        if (effectiveUserId) {
            fetchAddresses();
        }
    }, [effectiveUserId]);

    const fetchAddresses = async () => {
        if (!effectiveUserId) return;
        
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .eq('user_id', effectiveUserId)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAddresses(data || []);
        } catch (error) {
            console.error('Error fetching addresses:', error);
        } finally {
            setLoading(false);
        }
    };

    const addAddress = async (address: AddressInput) => {
        if (!effectiveUserId) return;

        try {
            // If this is set as default, unset other defaults
            if (address.is_default) {
                await supabase
                    .from('addresses')
                    .update({ is_default: false })
                    .eq('user_id', effectiveUserId);
            }

            const { data, error } = await supabase
                .from('addresses')
                .insert([{ ...address, user_id: effectiveUserId }])
                .select()
                .single();

            if (error) throw error;
            setAddresses(prev => [data!, ...prev]);
            return data;
        } catch (error) {
            console.error('Error adding address:', error);
            throw error;
        }
    };

    const updateAddress = async (id: string, updates: Partial<Address>) => {
        try {
            // If setting as default, unset other defaults
            if (updates.is_default) {
                await supabase
                    .from('addresses')
                    .update({ is_default: false })
                    .eq('user_id', effectiveUserId)
                    .neq('id', id);
            }

            const { data, error } = await supabase
                .from('addresses')
                .update(updates)
                .eq('id', id)
                .eq('user_id', effectiveUserId) // Ensure user owns this address
                .select()
                .single();

            if (error) throw error;
            setAddresses(prev => prev.map(a => a.id === id ? data! : a));
            return data;
        } catch (error) {
            console.error('Error updating address:', error);
            throw error;
        }
    };

    const deleteAddress = async (id: string) => {
        try {
            const { error } = await supabase
                .from('addresses')
                .delete()
                .eq('id', id)
                .eq('user_id', effectiveUserId); // Ensure user owns this address

            if (error) throw error;
            setAddresses(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Error deleting address:', error);
            throw error;
        }
    };

    const setDefaultAddress = async (id: string) => {
        await updateAddress(id, { is_default: true });
    };

    return {
        addresses,
        loading,
        fetchAddresses,
        addAddress,
        updateAddress,
        deleteAddress,
        setDefaultAddress
    };
}
