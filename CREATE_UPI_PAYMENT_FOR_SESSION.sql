-- =====================================================
-- FUNCTION: Create UPI Payment for Dine-in Sessions
-- Generates QR code for dine-in session payments
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_upi_payment_for_session TO authenticated;
