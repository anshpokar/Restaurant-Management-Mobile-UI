-- =====================================================
-- FIX DINE-IN SESSIONS ISSUES
-- =====================================================
-- This script fixes:
-- 1. Invalid payment_status values (removes 'confirming_payment')
-- 2. Adds trigger to auto-update total_amount from orders
-- 3. Ensures proper session status flow
-- =====================================================

-- 1. Update the check constraint for payment_status
-- First, drop the old constraint
ALTER TABLE dine_in_sessions DROP CONSTRAINT IF EXISTS dine_in_sessions_payment_status_check;

-- Add new constraint with correct values
ALTER TABLE dine_in_sessions 
ADD CONSTRAINT dine_in_sessions_payment_status_check 
CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'partial'::text]));

-- 2. Create function to update session total from orders
CREATE OR REPLACE FUNCTION update_session_total_from_orders()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the session's total_amount based on all orders in the session
  UPDATE dine_in_sessions
  SET 
    total_amount = (
      SELECT COALESCE(SUM(total_amount), 0)
      FROM orders
      WHERE notes LIKE CONCAT('Dine-in Session: ', NEW.id)
         OR notes LIKE CONCAT('%Session: ', NEW.session_name, '%')
    ),
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to auto-update session total when orders change
DROP TRIGGER IF EXISTS trg_update_session_total ON orders;
CREATE TRIGGER trg_update_session_total
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_session_total_from_orders();

-- 4. Update existing sessions with correct totals
UPDATE dine_in_sessions ds
SET total_amount = (
  SELECT COALESCE(SUM(o.total_amount), 0)
  FROM orders o
  WHERE o.notes LIKE CONCAT('Dine-in Session: ', ds.id)
     OR (ds.session_name IS NOT NULL AND o.notes LIKE CONCAT('%Session: ', ds.session_name, '%'))
)
WHERE session_status = 'active';

-- 5. Fix any sessions stuck with invalid payment_status
UPDATE dine_in_sessions
SET payment_status = 'pending'
WHERE payment_status NOT IN ('pending', 'paid', 'partial');

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check constraint exists
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'dine_in_sessions'::regclass
AND conname LIKE '%payment_status%';

-- Check session totals
SELECT 
  id,
  session_name,
  session_status,
  payment_status,
  total_amount,
  paid_amount,
  started_at
FROM dine_in_sessions
ORDER BY started_at DESC;

-- Check if triggers exist
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname LIKE '%session%';
