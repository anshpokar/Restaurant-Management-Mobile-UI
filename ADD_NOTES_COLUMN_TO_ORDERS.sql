-- =====================================================
-- ADD NOTES COLUMN TO ORDERS TABLE
-- Required for dine-in session tracking
-- =====================================================

-- Add notes column if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS notes text;

-- Add comment to document the column
COMMENT ON COLUMN orders.notes IS 'Additional order information (e.g., Dine-in Session ID, special instructions)';

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name = 'notes';

-- View all columns in orders table
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;
