-- =====================================================
-- AUTO-COMPLETE SESSION WHEN PAYMENT IS CONFIRMED
-- =====================================================
-- This function automatically updates session_status to 'completed'
-- when payment_status changes to 'paid'
-- =====================================================

-- Create a function to auto-complete sessions when payment is paid
CREATE OR REPLACE FUNCTION update_session_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment_status is changing to 'paid' and session_status is 'active' or 'completed'
  -- then set session_status to 'completed' and set completed_at timestamp
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    NEW.session_status := 'completed';
    NEW.completed_at := timezone('utc'::text, now());
    
    -- Log the update for debugging
    RAISE NOTICE 'Session % auto-completed: payment confirmed', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on dine_in_sessions table
DROP TRIGGER IF EXISTS trg_update_session_status_on_payment ON dine_in_sessions;
CREATE TRIGGER trg_update_session_status_on_payment
  BEFORE UPDATE OF payment_status ON dine_in_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_on_payment();

-- =====================================================
-- MANUAL FUNCTION FOR EXPLICIT UPDATES
-- =====================================================
-- Use this function when you want to explicitly mark payment as paid
-- and have the session auto-complete
-- =====================================================

-- Function to confirm payment and auto-complete session
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

-- Function to confirm payment by session_name (for UPI verification integration)
CREATE OR REPLACE FUNCTION confirm_session_payment_by_name(
  p_session_name text,
  p_admin_id uuid DEFAULT auth.uid()
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
  WHERE session_name = p_session_name
    AND payment_status = 'pending';
  
  -- Raise notice if no rows were updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found or payment already confirmed: %', p_session_name;
  END IF;
  
  RAISE NOTICE 'Session with name "%" payment confirmed and auto-completed by admin %', 
    p_session_name, p_admin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TESTING
-- =====================================================

-- Test the trigger (run in Supabase SQL Editor):
-- Step 1: Create a test session with pending payment
-- Note: Replace 'YOUR-USER-ID' with your actual user ID from profiles table
INSERT INTO dine_in_sessions (table_id, user_id, session_name, payment_status, session_status)
VALUES (
  (SELECT id FROM restaurant_tables LIMIT 1),
  (SELECT id FROM profiles LIMIT 1),  -- Uses existing user from database
  'Test Auto-Complete Session',
  'pending',
  'active'
);

-- Step 2: Update payment to paid - trigger should fire
UPDATE dine_in_sessions 
SET payment_status = 'paid' 
WHERE session_name = 'Test Auto-Complete Session';

-- Step 3: Verify session_status is now 'completed'
SELECT id, session_name, payment_status, session_status, completed_at
FROM dine_in_sessions 
WHERE session_name = 'Test Auto-Complete Session';

-- Expected result:
-- payment_status = 'paid'
-- session_status = 'completed'
-- completed_at IS NOT NULL

-- =====================================================
-- ADMIN INTEGRATION
-- =====================================================

-- In your admin payment verification screen, when confirming payment:

-- Before (manual):
-- await supabase
--   .from('dine_in_sessions')
--   .update({ payment_status: 'paid' })
--   .eq('id', sessionId);

-- After (automatic with function):
-- const { error } = await supabase.rpc('confirm_session_payment', {
--   p_session_id: sessionId
-- });

-- Benefits:
-- ✅ Automatic session_status update
-- ✅ Automatic completed_at timestamp
-- ✅ Error handling built-in
-- ✅ Consistent behavior across app
