-- =====================================================
-- FIX: Add updated_at to orders table
-- This fixes the 400 error when verifying UPI payments
-- =====================================================

-- Add updated_at column to orders table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc'::text, now());
    
    -- Add comment
    COMMENT ON COLUMN orders.updated_at IS 'Last update timestamp';
  END IF;
END $$;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_orders_updated_at();

-- Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('created_at', 'updated_at')
ORDER BY column_name;
