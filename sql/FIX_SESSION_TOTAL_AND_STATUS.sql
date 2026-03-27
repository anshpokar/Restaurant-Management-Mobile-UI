-- =====================================================
-- FIX SESSION TOTAL AMOUNT & PAYMENT STATUS
-- =====================================================
-- This script ensures:
-- 1. Session total_amount auto-updates from orders
-- 2. Payment status shows correctly as "Pending" until admin confirms
-- 3. COD payments show proper status
-- =====================================================

-- 1. Drop old constraint if exists
ALTER TABLE dine_in_sessions DROP CONSTRAINT IF EXISTS dine_in_sessions_payment_status_check;

-- 2. Add correct constraint with all valid values
ALTER TABLE dine_in_sessions 
ADD CONSTRAINT dine_in_sessions_payment_status_check 
CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'partial'::text]));

-- 3. Create function to update session total from orders
CREATE OR REPLACE FUNCTION update_session_total_from_orders()
RETURNS TRIGGER AS $$
DECLARE
    v_session_id UUID;
    v_session_name TEXT;
    v_notes TEXT;
BEGIN
    -- Determine which session to update based on the order
    -- Case 1: Order has session reference in notes
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_notes := NEW.notes;
        
        -- Try to extract session ID from notes (format: "Dine-in Session: {uuid}")
        IF v_notes LIKE 'Dine-in Session: %' THEN
            -- Extract just the UUID part (first 36 chars after the prefix)
            v_session_id := SUBSTRING(v_notes FROM 'Dine-in Session: ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
        END IF;
        
        -- If no session ID, try session name
        IF v_session_id IS NULL AND NEW.session_name IS NOT NULL THEN
            v_session_name := NEW.session_name;
        END IF;
    END IF;
    
    -- Case 2: Order was deleted
    IF TG_OP = 'DELETE' THEN
        v_notes := OLD.notes;
        
        -- Try to extract session ID from notes
        IF v_notes LIKE 'Dine-in Session: %' THEN
            v_session_id := SUBSTRING(v_notes FROM 'Dine-in Session: ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
        END IF;
        
        IF v_session_id IS NULL AND OLD.session_name IS NOT NULL THEN
            v_session_name := OLD.session_name;
        END IF;
    END IF;
    
    -- Update session by ID if found
    IF v_session_id IS NOT NULL THEN
        UPDATE dine_in_sessions
        SET 
            total_amount = (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM orders
                WHERE notes LIKE CONCAT('Dine-in Session: ', v_session_id, '%')
            ),
            updated_at = NOW()
        WHERE id = v_session_id;
        
        RETURN NEW;
    END IF;
    
    -- Update session by name if ID not found
    IF v_session_name IS NOT NULL THEN
        UPDATE dine_in_sessions
        SET 
            total_amount = (
                SELECT COALESCE(SUM(total_amount), 0)
                FROM orders
                WHERE session_name = v_session_name
                  AND order_type = 'dine_in'
            ),
            updated_at = NOW()
        WHERE session_name = v_session_name;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on orders table
DROP TRIGGER IF EXISTS trg_update_session_total ON orders;
CREATE TRIGGER trg_update_session_total
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_session_total_from_orders();

-- 5. Update all existing sessions with correct totals
UPDATE dine_in_sessions ds
SET total_amount = (
    SELECT COALESCE(SUM(o.total_amount), 0)
    FROM orders o
    WHERE o.notes LIKE CONCAT('Dine-in Session: ', ds.id)
       OR (ds.session_name IS NOT NULL AND o.session_name = ds.session_name AND o.order_type = 'dine_in')
)
WHERE session_status IN ('active', 'completed');

-- 6. Fix any sessions with invalid payment_status
UPDATE dine_in_sessions
SET payment_status = 'pending'
WHERE payment_status NOT IN ('pending', 'paid', 'partial')
  AND session_status = 'completed';

-- 7. Ensure COD orders have pending payment status
UPDATE orders o
SET payment_status = 'pending'
WHERE payment_method = 'cod'
  AND payment_status != 'paid'
  AND order_type = 'dine_in';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check session totals
SELECT 
    ds.id,
    ds.session_name,
    ds.session_status,
    ds.payment_status,
    ds.total_amount as session_total,
    COUNT(o.id) as order_count,
    COALESCE(SUM(o.total_amount), 0) as calculated_orders_total
FROM dine_in_sessions ds
LEFT JOIN orders o ON (
    o.notes LIKE CONCAT('Dine-in Session: ', ds.id) 
    OR (o.session_name = ds.session_name AND o.order_type = 'dine_in')
)
WHERE ds.session_status IN ('active', 'completed')
GROUP BY ds.id, ds.session_name, ds.session_status, ds.payment_status, ds.total_amount
ORDER BY ds.started_at DESC;

-- Check triggers exist
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_update_session_total';

-- Check function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'update_session_total_from_orders';
