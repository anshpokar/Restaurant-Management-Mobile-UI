-- =====================================================
-- ADD session_name TO orders TABLE
-- =====================================================
-- This field is needed to link orders to dine-in sessions
-- =====================================================

-- Add session_name column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS session_name TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_orders_session_name ON orders(session_name);

-- Update existing dine-in orders to include session reference
UPDATE orders o
SET session_name = (
  SELECT ds.session_name
  FROM dine_in_sessions ds
  WHERE o.notes LIKE CONCAT('Dine-in Session: ', ds.id)
     OR o.notes LIKE CONCAT('%Session: ', ds.session_name, '%')
)
WHERE o.order_type = 'dine_in'
AND o.session_name IS NULL;

-- Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name = 'session_name';
