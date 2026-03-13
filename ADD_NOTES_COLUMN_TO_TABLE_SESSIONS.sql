-- ============================================
-- ADD NOTES COLUMN TO TABLE_SESSIONS
-- ============================================
-- This adds the missing 'notes' column that the waiter 
-- session management code expects
-- ============================================

-- Add notes column to table_sessions
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment to document the column
COMMENT ON COLUMN table_sessions.notes IS 'Additional notes or special instructions for the session';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'table_sessions'
  AND column_name = 'notes';

-- Optional: Add session_name column if you want custom session names
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS session_name TEXT;

COMMENT ON COLUMN table_sessions.session_name IS 'Custom name for the session (e.g., "Table 5 Dinner", "John''s Lunch")';

-- Verify all columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'table_sessions'
ORDER BY ordinal_position;
