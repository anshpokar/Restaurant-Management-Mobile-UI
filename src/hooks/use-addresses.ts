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
            console.log('Fetching addresses for userId:', effectiveUserId);
            
            const { data, error } = await supabase
                .from('addresses')
                .select('*')
                .eq('user_id', effectiveUserId)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Fetch error:', error);
                throw error;
            }
            
            console.log('Fetched addresses:', data);
            console.log('Default addresses count:', data?.filter(a => a.is_default).length || 0);
            
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
            console.log('Adding address:', address);
            
            // If this is set as default, unset other defaults FIRST
            if (address.is_default) {
                console.log('Unsetting all other defaults...');
                const { error: updateError } = await supabase
                    .from('addresses')
                    .update({ is_default: false })
                    .eq('user_id', effectiveUserId);
                
                if (updateError) {
                    console.error('Error unsetting defaults:', updateError);
                }
            }

            // Insert the new address
            const { data, error } = await supabase
                .from('addresses')
                .insert([{ ...address, user_id: effectiveUserId }])
                .select()
                .single();

            if (error) {
                console.error('Insert error:', error);
                throw error;
            }
            
            console.log('Address added successfully:', data);
            setAddresses(prev => [data!, ...prev]);
            
            // Refresh to ensure we have latest data
            await fetchAddresses();
            
            return data;
        } catch (error) {
            console.error('Error adding address:', error);
            throw error;
        }
    };

    const updateAddress = async (id: string, updates: Partial<Address>) => {
        try {
            console.log('Updating address:', id, updates);
            
            // If setting as default, unset other defaults FIRST
            if (updates.is_default) {
                console.log('Unsetting all other defaults...');
                const { error: updateError } = await supabase
                    .from('addresses')
                    .update({ is_default: false })
                    .eq('user_id', effectiveUserId)
                    .neq('id', id); // Don't unset the one we're updating
                
                if (updateError) {
                    console.error('Error unsetting defaults:', updateError);
                }
            }

            // Update this address
            const { data, error } = await supabase
                .from('addresses')
                .update(updates)
                .eq('id', id)
                .eq('user_id', effectiveUserId)
                .select()
                .single();

            if (error) {
                console.error('Update error:', error);
                throw error;
            }
            
            console.log('Address updated successfully:', data);
            setAddresses(prev => prev.map(a => a.id === id ? data! : a));
            
            // Refresh to ensure we have latest data
            await fetchAddresses();
            
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
