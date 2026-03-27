-- =====================================================
-- FUNCTION: Update Session Orders to COD
-- Called when customer selects COD for dine-in session
-- =====================================================

CREATE OR REPLACE FUNCTION update_session_orders_cod(p_session_id uuid)
RETURNS void AS $$
BEGIN
  -- Update all orders in the session to COD
  UPDATE orders
  SET 
    payment_method = 'cod',
    payment_status = 'pending',
    is_paid = false,
    notes = CONCAT(notes, ' | COD Payment Selected')
  WHERE 
    order_type = 'dine_in'
    AND notes LIKE CONCAT('%Dine-in Session: ', p_session_id, '%');
END;
$$ LANGUAGE plpgsql;

-- Test the function (optional - comment out before running in production)
-- SELECT update_session_orders_cod('your-session-id-here');
