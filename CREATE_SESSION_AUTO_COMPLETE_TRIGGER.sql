-- =====================================================
-- FIX: Auto-Complete Session When UPI Payment Verified
-- Creates trigger to automatically update session status
-- =====================================================

-- =====================================================
-- PART 1: CREATE TRIGGER FUNCTION
-- =====================================================

-- Function to auto-update session status when payment is confirmed
CREATE OR REPLACE FUNCTION update_session_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when payment_status changes TO 'paid'
  IF NEW.payment_status = 'paid' 
     AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    
    -- Set session as completed
    NEW.session_status := 'completed';
    
    -- Set completion timestamps
    NEW.completed_at := timezone('utc'::text, now());
    NEW.payment_completed_at := timezone('utc'::text, now());
    
    -- Log the change
    RAISE NOTICE 'Session % auto-completed: payment_status changed to paid', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_session_status_on_payment() IS 
'Automatically updates dine_in_sessions.session_status to "completed" when payment_status becomes "paid"';

-- =====================================================
-- PART 2: CREATE TRIGGER
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_session_status_on_payment ON dine_in_sessions;

-- Create the trigger
CREATE TRIGGER trg_update_session_status_on_payment
  BEFORE UPDATE OF payment_status ON dine_in_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_on_payment();

COMMENT ON TRIGGER trg_update_session_status_on_payment ON dine_in_sessions IS 
'Auto-completes session when payment status changes to paid';

-- =====================================================
-- PART 3: VERIFICATION QUERIES
-- =====================================================

-- Verify trigger was created
SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'A' THEN 'ALWAYS'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    ELSE 'UNKNOWN'
  END as status
FROM pg_trigger 
WHERE tgrelid = 'dine_in_sessions'::regclass
AND tgname = 'trg_update_session_status_on_payment';

-- Expected: One row showing trigger name and 'ALWAYS'

-- View trigger function code
SELECT prosrc as function_code
FROM pg_proc 
WHERE proname = 'update_session_status_on_payment';

-- =====================================================
-- PART 4: TEST THE TRIGGER
-- =====================================================

/*
-- Run this test to verify the trigger works:

-- Step 1: Create a test session
INSERT INTO dine_in_sessions (
  table_id, 
  user_id, 
  session_name, 
  payment_status, 
  session_status
) VALUES (
  (SELECT id FROM restaurant_tables LIMIT 1),
  auth.uid(),
  'Test Auto-Complete Trigger',
  'pending',
  'active'
);

-- Step 2: Update payment status to paid
UPDATE dine_in_sessions 
SET payment_status = 'paid' 
WHERE session_name = 'Test Auto-Complete Trigger';

-- Step 3: Verify the trigger fired correctly
SELECT 
  id,
  session_name,
  payment_status,
  session_status,
  completed_at,
  payment_completed_at
FROM dine_in_sessions 
WHERE session_name = 'Test Auto-Complete Trigger';

-- EXPECTED RESULT:
-- payment_status = 'paid'
-- session_status = 'completed'
-- completed_at IS NOT NULL (timestamp)
-- payment_completed_at IS NOT NULL (timestamp)

-- Step 4: Clean up test data
DELETE FROM dine_in_sessions 
WHERE session_name = 'Test Auto-Complete Trigger';
*/

-- =====================================================
-- PART 5: MANUAL OVERRIDE FUNCTIONS
-- =====================================================

-- Function to manually confirm session payment (if needed)
CREATE OR REPLACE FUNCTION confirm_session_payment(
  p_session_id uuid
)
RETURNS void AS $$
BEGIN
  -- Update the session: set payment to paid and auto-complete
  UPDATE dine_in_sessions
  SET 
    payment_status = 'paid',
    payment_completed_at = timezone('utc'::text, now()),
    session_status = 'completed',
    completed_at = timezone('utc'::text, now())
  WHERE id = p_session_id
    AND payment_status = 'pending';
  
  -- Raise notice if no rows were updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or payment already confirmed: %', p_session_id;
  END IF;
  
  RAISE NOTICE 'Session % payment confirmed and auto-completed', p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION confirm_session_payment(uuid) IS 
'Manually confirms session payment and auto-completes the session';

-- Function to confirm payment by session_name (for UPI integration)
CREATE OR REPLACE FUNCTION confirm_session_payment_by_name(
  p_session_name text,
  p_admin_id uuid DEFAULT auth.uid()
)
RETURNS void AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Get the session ID
  SELECT id INTO v_session_id
  FROM dine_in_sessions
  WHERE session_name = p_session_name
    AND payment_status = 'pending';
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Session not found or payment already confirmed: %', p_session_name;
  END IF;
  
  -- Update the session
  UPDATE dine_in_sessions
  SET 
    payment_status = 'paid',
    payment_completed_at = timezone('utc'::text, now()),
    session_status = 'completed',
    completed_at = timezone('utc'::text, now())
  WHERE id = v_session_id;
  
  RAISE NOTICE 'Session "%" payment confirmed by admin %', p_session_name, p_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION confirm_session_payment_by_name(text, uuid) IS 
'Confirms session payment using session name instead of ID';

-- =====================================================
-- SUMMARY
-- =====================================================
-- This script has:
-- ✅ Created trigger function: update_session_status_on_payment()
-- ✅ Created trigger: trg_update_session_status_on_payment
-- ✅ Added verification queries
-- ✅ Included test script (commented out)
-- ✅ Created manual override functions
--
-- HOW IT WORKS:
-- 1. When payment_status changes TO 'paid'
-- 2. Trigger automatically sets:
--    - session_status = 'completed'
--    - completed_at = NOW()
--    - payment_completed_at = NOW()
-- 3. No manual intervention needed!
--
-- BENEFITS:
-- ✅ Automatic session completion
-- ✅ Consistent behavior across app
-- ✅ Cannot forget to update status
-- ✅ Automatic timestamps
-- ✅ Works for ALL payment methods (UPI, COD, etc.)
