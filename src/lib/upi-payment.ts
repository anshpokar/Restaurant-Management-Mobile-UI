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
 * Supports both orders and dine-in sessions
 * Uses direct insert instead of RPC for reliability
 */
export const createUPIPayment = async (
  paymentId: string,
  vpa: string = 'anshjpokar@oksbi', // ✅ Navratna Restaurant UPI ID
  restaurantName: string = 'Navratna Restaurant', // ✅ Your restaurant name
  expiryMinutes: number = 5,
  isSession: boolean = false
) => {
  try {
    // ALWAYS use direct insert (more reliable than RPC)
    console.log('Creating UPI payment via direct insert:', { 
      paymentId, 
      isSession,
      amount: 0 // Will be updated later
    });
    
    const paymentRecordId = crypto.randomUUID();
    const encodedName = encodeURIComponent(restaurantName);
    const upiLink = `upi://pay?pa=${vpa}&pn=${encodedName}&am=0&cu=INR&tn=ORDER_${paymentId}`;
    const qrExpiresAt = new Date();
    qrExpiresAt.setMinutes(qrExpiresAt.getMinutes() + expiryMinutes);
    
    // First check if payment record already exists for this order/session
    const { data: existing } = await supabase
      .from('upi_payments')
      .select('*')
      .eq('order_id', paymentId)
      .single();
    
    if (existing) {
      // Update existing record
      console.log('Updating existing UPI payment record:', existing.id);
      
      const { data, error: updateError } = await supabase
        .from('upi_payments')
        .update({
          vpa: vpa,
          amount: 0,
          upi_link: upiLink,
          qr_expires_at: qrExpiresAt.toISOString(),
          status: 'pending',
          transaction_id: null,
          verified_at: null,
          verified_by: null,
          updated_at: new Date().toISOString()
        })
        .eq('order_id', paymentId)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      console.log('Updated UPI payment successfully:', data);
      
      return {
        success: true,
        qrId: data.id,
        upiLink: upiLink,
        amount: data.amount || 0,
        expiresAt: data.qr_expires_at
      };
    }
    
    // Insert new record
    const { data, error: insertError } = await supabase
      .from('upi_payments')
      .insert({
        id: paymentRecordId,
        order_id: paymentId,
        vpa: vpa,
        amount: 0, // Will be updated when amount is known
        upi_link: upiLink,
        qr_expires_at: qrExpiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();
    
    if (insertError) throw insertError;
    
    console.log('Direct insert successful, paymentId:', paymentRecordId, data);
    
    return {
      success: true,
      qrId: paymentRecordId, // Use the record ID as QR identifier
      upiLink: upiLink,
      amount: 0,
      expiresAt: qrExpiresAt.toISOString()
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
      .select('*, orders(user_id, total_amount, session_name)')
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

    // If order has a session_name, also update the dine_in_sessions table
    if (upiPayment.orders?.session_name) {
      // Use the RPC function to confirm payment and auto-complete session
      const { error: sessionError } = await supabase.rpc('confirm_session_payment_by_name', {
        p_session_name: upiPayment.orders.session_name,
        p_admin_id: adminId
      });

      if (sessionError) {
        console.warn('Could not update session:', sessionError.message);
        // Continue anyway - session can be updated manually if needed
      }
    }

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
