-- =====================================================
-- CREATE FUNCTION: UPDATE SESSION ORDERS PAID
-- =====================================================
-- This function marks all orders in a session as paid
-- Used when admin confirms cash payment for COD sessions
-- =====================================================

CREATE OR REPLACE FUNCTION update_session_orders_paid(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Update orders linked by notes (session ID)
    UPDATE orders
    SET 
        payment_status = 'paid',
        is_paid = true,
        updated_at = NOW()
    WHERE 
        (notes LIKE CONCAT('Dine-in Session: ', p_session_id)
        OR session_name IN (
            SELECT session_name 
            FROM dine_in_sessions 
            WHERE id = p_session_id
        ))
        AND order_type = 'dine_in';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TEST THE FUNCTION
-- =====================================================
-- Uncomment and run this to test with a real session ID:
-- SELECT update_session_orders_paid('YOUR-SESSION-ID-HERE');

-- =====================================================
-- VERIFY FUNCTION EXISTS
-- =====================================================
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'update_session_orders_paid';
