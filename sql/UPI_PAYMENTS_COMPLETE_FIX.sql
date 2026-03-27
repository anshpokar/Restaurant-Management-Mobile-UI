-- =====================================================
-- UPI PAYMENTS - MISSING TRIGGERS AND INDEXES
-- This script adds missing database objects for complete functionality
-- =====================================================

-- =====================================================
-- PART 1: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on order_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_upi_payments_order_id ON upi_payments(order_id);

-- Index on status for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_upi_payments_status ON upi_payments(status);

-- Index on created_at for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_upi_payments_created_at ON upi_payments(created_at);

-- Composite index for common query pattern (order_id + status)
CREATE INDEX IF NOT EXISTS idx_upi_payments_order_status ON upi_payments(order_id, status);

-- =====================================================
-- PART 2: CREATE TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_upi_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on any change
DROP TRIGGER IF EXISTS trigger_update_upi_payments_timestamp ON upi_payments;
CREATE TRIGGER trigger_update_upi_payments_timestamp
  BEFORE UPDATE ON upi_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_upi_payments_updated_at();

-- =====================================================
-- PART 3: ENSURE REAL-TIME IS ENABLED
-- =====================================================

-- Add upi_payments to the supabase_realtime publication if not already included
DO $$
BEGIN
  -- Check if the table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'upi_payments'
  ) THEN
    -- Try to add it to the publication
    ALTER PUBLICATION supabase_realtime ADD TABLE upi_payments;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not modify publication. May need manual intervention.';
END $$;

-- =====================================================
-- PART 4: VERIFICATION QUERIES
-- =====================================================

-- Verify indexes were created
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'upi_payments'
ORDER BY indexname;

-- Verify triggers were created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table = 'upi_payments'
ORDER BY trigger_name;

-- Verify real-time is enabled
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE tablename = 'upi_payments';

-- =====================================================
-- PART 5: CLEANUP DUPLICATE PENDING PAYMENTS
-- =====================================================

-- Optional: Clean up duplicate pending payments
-- This removes pending payments that have a corresponding verified payment
-- Uncomment the following block if you want to clean up duplicates

/*
DELETE FROM upi_payments
WHERE status = 'pending'
AND order_id IN (
  SELECT order_id 
  FROM upi_payments 
  WHERE status = 'verified'
);

-- Verify cleanup
SELECT 
  status,
  COUNT(*) as count
FROM upi_payments
GROUP BY status;
*/

-- =====================================================
-- SUMMARY
-- =====================================================
-- This script has:
-- ✅ Created 4 performance indexes on upi_payments table
-- ✅ Created trigger function for auto-updating updated_at
-- ✅ Created trigger to call the function on updates
-- ✅ Verified/Enabled real-time for upi_payments table
-- ✅ Provided verification queries to confirm changes
-- ✅ Optional cleanup script for duplicate pending payments
--
-- Run the verification checklist again to confirm all issues are resolved.
