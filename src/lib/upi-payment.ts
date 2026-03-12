/**
 * Dynamic UPI QR Payment System
 * Generates unique QR codes per order for secure UPI payments
 */

import { supabase } from './supabase';

/**
 * Generate UPI Payment Link (Dynamic QR)
 * Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=ORDER_ID
 */
export const generateUPILink = (
  orderId: string,
  amount: number,
  vpa: string = 'anshjpokar@oksbi', // ✅ Navratna Restaurant UPI ID
  restaurantName: string = 'Navratna Restaurant' // ✅ Your restaurant name
): string => {
  // Encode parameters properly
  const encodedName = encodeURIComponent(restaurantName);
  const transactionNote = `ORDER_${orderId}`;
  
  return `upi://pay?pa=${vpa}&pn=${encodedName}&am=${amount}&cu=INR&tn=${transactionNote}`;
};

/**
 * Create UPI Payment Record in Database
 */
export const createUPIPayment = async (
  orderId: string,
  vpa: string = 'anshjpokar@oksbi', // ✅ Navratna Restaurant UPI ID
  restaurantName: string = 'Navratna Restaurant', // ✅ Your restaurant name
  expiryMinutes: number = 5
) => {
  try {
    const { data, error } = await supabase.rpc('create_upi_payment', {
      p_order_id: orderId,
      p_vpa: vpa,
      p_restaurant_name: restaurantName,
      p_expiry_minutes: expiryMinutes
    });

    if (error) throw error;

    return {
      success: true,
      qrId: data?.qr_id,
      upiLink: data?.upi_link,
      amount: data?.amount,
      expiresAt: data?.expires_at
    };
  } catch (error: any) {
    console.error('Error creating UPI payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Submit UPI Transaction ID for Verification
 */
export const submitUPITransaction = async (
  qrId: string,
  transactionId: string,
  beneficiaryName?: string
) => {
  try {
    const { data, error } = await supabase
      .from('upi_payments')
      .update({
        transaction_id: transactionId,
        beneficiary_name: beneficiaryName || null,
        status: 'verification_requested',
        updated_at: new Date().toISOString()
      })
      .eq('id', qrId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      data
    };
  } catch (error: any) {
    console.error('Error submitting UPI transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify UPI Payment (Admin only)
 */
export const verifyUPIPayment = async (
  qrId: string,
  adminId: string,
  notes?: string
) => {
  try {
    // Get UPI payment details
    const { data: upiPayment, error: fetchError } = await supabase
      .from('upi_payments')
      .select('*, orders(user_id, total_amount)')
      .eq('id', qrId)
      .single();

    if (fetchError) throw fetchError;

    // Update UPI payment status
    const { data: updatedUPI, error: updateError } = await supabase
      .from('upi_payments')
      .update({
        status: 'verified',
        verified_by: adminId,
        verified_at: new Date().toISOString(),
        verification_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', qrId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update orders table
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        payment_id: upiPayment.transaction_id, // Store UTR in payment_id
        paid_at: new Date().toISOString(),
        is_paid: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', upiPayment.order_id);

    if (orderError) throw orderError;

    return {
      success: true,
      message: 'Payment verified successfully'
    };
  } catch (error: any) {
    console.error('Error verifying UPI payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if QR Code is Expired
 */
export const isQRExpired = (expiresAt: string): boolean => {
  const now = new Date();
  const expiry = new Date(expiresAt);
  return now > expiry;
};

/**
 * Regenerate QR Code if Expired
 */
export const regenerateQR = async (
  orderId: string,
  vpa: string = 'restaurant@upi',
  restaurantName: string = 'Restaurant'
) => {
  return await createUPIPayment(orderId, vpa, restaurantName, 5);
};

/**
 * Get UPI Payment Status
 */
export const getUpiPaymentStatus = async (orderId: string) => {
  try {
    const { data, error } = await supabase
      .from('upi_payments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) throw error;

    return {
      success: true,
      data
    };
  } catch (error: any) {
    console.error('Error fetching UPI payment status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Subscribe to UPI Payment Updates (Real-time)
 */
export const subscribeToUpiPayments = (
  qrId: string,
  callback: (data: any) => void
) => {
  const channel = supabase.channel(`upi-payment-${qrId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'upi_payments',
        filter: `id=eq.${qrId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
