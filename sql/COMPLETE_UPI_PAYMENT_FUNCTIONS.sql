-- =====================================================
-- COMPLETE UPI PAYMENT FUNCTIONS FOR SUPABASE
-- Run this ENTIRE script in Supabase SQL Editor
-- =====================================================

-- First, check if upi_payments table exists
CREATE TABLE IF NOT EXISTS public.upi_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  qr_id uuid NOT NULL UNIQUE,
  amount numeric NOT NULL DEFAULT 0,
  upi_link text NOT NULL,
  transaction_id text,
  beneficiary_name text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'verification_requested'::text, 'verified'::text, 'failed'::text])),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  verified_at timestamp with time zone,
  verified_by uuid,
  verification_notes text,
  CONSTRAINT upi_payments_pkey PRIMARY KEY (id),
  CONSTRAINT upi_payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- =====================================================
-- FUNCTION 1: Generate UPI Link (Helper Function)
-- =====================================================
CREATE OR REPLACE FUNCTION generate_upi_link(
  p_order_id uuid,
  p_amount numeric,
  p_vpa text DEFAULT 'anshjpokar@oksbi',
  p_restaurant_name text DEFAULT 'Navratna Restaurant'
) RETURNS text AS $$
DECLARE
  v_encoded_name text;
  v_transaction_note text;
BEGIN
  v_encoded_name := url_encode(p_restaurant_name);
  v_transaction_note := 'ORDER_' || p_order_id::text;
  
  RETURN format(
    'upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=%s',
    p_vpa,
    v_encoded_name,
    p_amount::text,
    v_transaction_note
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION 2: Create UPI Payment for Orders
-- =====================================================
CREATE OR REPLACE FUNCTION create_upi_payment(
  p_order_id uuid,
  p_vpa text DEFAULT 'anshjpokar@oksbi',
  p_restaurant_name text DEFAULT 'Navratna Restaurant',
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
-- FUNCTION 3: Create UPI Payment for Dine-in Sessions
-- THIS IS THE MISSING FUNCTION!
-- =====================================================
CREATE OR REPLACE FUNCTION create_upi_payment_for_session(
  p_session_id uuid,
  p_vpa text DEFAULT 'anshjpokar@oksbi',
  p_restaurant_name text DEFAULT 'Navratna Restaurant',
  p_expiry_minutes integer DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
  v_qr_id uuid;
  v_amount numeric;
  v_upi_link text;
  v_expires_at timestamptz;
BEGIN
  -- Get the session amount
  SELECT total_amount INTO v_amount
  FROM dine_in_sessions
  WHERE id = p_session_id;
  
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  
  -- Generate expiration time
  v_expires_at := NOW() + (p_expiry_minutes * INTERVAL '1 minute');
  
  -- Generate UPI link using order_id format (session_id in this case)
  v_upi_link := generate_upi_link(p_session_id, v_amount, p_vpa, p_restaurant_name);
  
  -- Insert or update the payment record
  INSERT INTO upi_payments (order_id, qr_id, amount, upi_link, expires_at, status)
  VALUES (p_session_id, gen_random_uuid(), v_amount, v_upi_link, v_expires_at, 'pending')
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_upi_payment TO authenticated;
GRANT EXECUTE ON FUNCTION create_upi_payment_for_session TO authenticated;
GRANT EXECUTE ON FUNCTION generate_upi_link TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to confirm functions were created
-- =====================================================
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('create_upi_payment', 'create_upi_payment_for_session', 'generate_upi_link');
