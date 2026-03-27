-- =====================================================
-- DYNAMIC UPI QR PAYMENT SYSTEM - FINAL SQL
-- Navratna Restaurant Configuration
-- =====================================================
-- ✅ Ready to run in Supabase SQL Editor
-- ✅ Updated with actual UPI details
-- =====================================================

-- Drop existing functions first (to replace them)
DROP FUNCTION IF EXISTS generate_upi_link(uuid, numeric, text, text);
DROP FUNCTION IF EXISTS create_upi_payment(uuid, text, text, integer);
DROP FUNCTION IF EXISTS verify_upi_payment_db(uuid, uuid, text);

-- =====================================================
-- FUNCTION 1: Generate UPI Link
-- Creates dynamic UPI payment link for a specific order
-- =====================================================
CREATE OR REPLACE FUNCTION generate_upi_link(
  p_order_id uuid,
  p_amount numeric,
  p_vpa text DEFAULT 'anshjpokar@oksbi', -- ✅ Navratna Restaurant UPI ID
  p_restaurant_name text DEFAULT 'Navratna Restaurant' -- ✅ Your restaurant name
) RETURNS TEXT AS $$
DECLARE
  v_upi_link TEXT;
BEGIN
  -- Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=ORDER_ID
  v_upi_link := format(
    'upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=ORDER_%s',
    p_vpa, 
    replace(p_restaurant_name, ' ', '_'), -- Replace spaces with underscores
    p_amount::text, 
    p_order_id::text
  );
  
  RETURN v_upi_link;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION 2: Create UPI Payment Record
-- Creates/updates payment record in upi_payments table
-- =====================================================
CREATE OR REPLACE FUNCTION create_upi_payment(
  p_order_id uuid,
  p_vpa text DEFAULT 'anshjpokar@oksbi', -- ✅ Navratna Restaurant UPI ID
  p_restaurant_name text DEFAULT 'Navratna Restaurant', -- ✅ Your restaurant name
  p_expiry_minutes integer DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
  v_qr_id uuid;
  v_amount numeric;
  v_upi_link text;
  v_expires_at timestamptz;
BEGIN
  -- Get the order amount
  SELECT total_amount INTO v_amount
  FROM orders
  WHERE id = p_order_id;
  
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Generate expiration time
  v_expires_at := NOW() + (p_expiry_minutes * INTERVAL '1 minute');
  
  -- Generate UPI link using the function above
  v_upi_link := generate_upi_link(p_order_id, v_amount, p_vpa, p_restaurant_name);
  
  -- Insert or update the payment record
  INSERT INTO upi_payments (order_id, qr_id, amount, upi_link, expires_at, status)
  VALUES (p_order_id, gen_random_uuid(), v_amount, v_upi_link, v_expires_at, 'pending')
  ON CONFLICT (order_id) 
  DO UPDATE SET
    amount = v_amount,
    upi_link = v_upi_link,
    expires_at = v_expires_at,
    status = 'pending',
    transaction_id = NULL,
    verified_at = NULL,
    verified_by = NULL
  RETURNING qr_id INTO v_qr_id;
  
  -- Return JSON response
  RETURN jsonb_build_object(
    'qr_id', v_qr_id,
    'upi_link', v_upi_link,
    'amount', v_amount,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION 3: Verify UPI Payment (Database Version)
-- Admin verifies payment and updates order status
-- =====================================================
CREATE OR REPLACE FUNCTION verify_upi_payment_db(
  p_qr_id uuid,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order_id uuid;
  v_transaction_id text;
BEGIN
  -- Get the order ID and transaction ID from the QR code
  SELECT order_id, transaction_id INTO v_order_id, v_transaction_id
  FROM upi_payments
  WHERE qr_id = p_qr_id;
  
  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'Payment record not found';
  END IF;
  
  -- Update the payment record as verified
  UPDATE upi_payments
  SET status = 'verified',
      verified_at = NOW(),
      verified_by = p_admin_id,
      notes = p_notes
  WHERE qr_id = p_qr_id;
  
  -- Update the order payment status
  UPDATE orders
  SET payment_status = 'paid',
      payment_id = v_transaction_id, -- Store UTR in payment_id field
      updated_at = NOW()
  WHERE id = v_order_id;
  
  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Payment verified successfully',
    'order_id', v_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION: Test the Functions
-- =====================================================
-- Run these queries to verify the functions work correctly:

-- Test 1: Generate UPI Link
SELECT generate_upi_link(
  '00000000-0000-0000-0000-000000000001'::uuid,
  500,
  'anshjpokar@oksbi',
  'Navratna Restaurant'
) as result;

-- Expected output: 
-- upi://pay?pa=anshjpokar@oksbi&pn=Navratna_Restaurant&am=500&cu=INR&tn=ORDER_00000000-0000-0000-0000-000000000001

-- Test 2: Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('generate_upi_link', 'create_upi_payment', 'verify_upi_payment_db');

-- Should return all 3 function names

-- =====================================================
-- SUCCESS! 🎉
-- =====================================================
-- All functions are now configured with:
-- UPI ID: anshjpokar@oksbi
-- Restaurant: Navratna Restaurant
-- 
-- Next steps:
-- 1. ✅ Run this SQL in Supabase SQL Editor
-- 2. ✅ Test with a small payment (₹1-10)
-- 3. ✅ Verify money reaches correct bank account
-- =====================================================
