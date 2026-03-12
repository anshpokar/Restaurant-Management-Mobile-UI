-- =====================================================
-- ADD SESSION_NAME COLUMN TO EXISTING DINE_IN_SESSIONS TABLE
-- Run this if you already created the table earlier
-- =====================================================

-- Add session_name column if it doesn't exist
ALTER TABLE dine_in_sessions 
ADD COLUMN IF NOT EXISTS session_name text;

-- Add comment to document the column
COMMENT ON COLUMN dine_in_sessions.session_name IS 'Custom name given by customer to identify their dining session (e.g., "Lunch with Friends", "Birthday Party")';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'dine_in_sessions'
AND column_name = 'session_name';

-- Test: View all columns in the table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'dine_in_sessions'
ORDER BY ordinal_position;
