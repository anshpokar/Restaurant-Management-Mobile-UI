-- =====================================================
-- UPI PAYMENTS - FIX EXISTING TABLE
-- Run this to add missing columns/indexes if table exists
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  -- Add vpa column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upi_payments' AND column_name = 'vpa') THEN
    ALTER TABLE upi_payments ADD COLUMN vpa text NOT NULL DEFAULT 'anshjpokar@oksbi';
  END IF;

  -- Add qr_expires_at if expires_at exists but qr_expires_at doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upi_payments' AND column_name = 'expires_at') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upi_payments' AND column_name = 'qr_expires_at') THEN
    ALTER TABLE upi_payments RENAME COLUMN expires_at TO qr_expires_at;
  END IF;

  -- Add verification_notes if notes exists but verification_notes doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upi_payments' AND column_name = 'notes') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upi_payments' AND column_name = 'verification_notes') THEN
    ALTER TABLE upi_payments RENAME COLUMN notes TO verification_notes;
  END IF;

  -- Add beneficiary_name if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'upi_payments' AND column_name = 'beneficiary_name') THEN
    ALTER TABLE upi_payments ADD COLUMN beneficiary_name text;
  END IF;

  -- Add verification_requested status check if not exists
  -- (This is handled by the CHECK constraint already)
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_upi_payments_order_id ON upi_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_upi_payments_status ON upi_payments(status);
CREATE INDEX IF NOT EXISTS idx_upi_payments_transaction_id ON upi_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_upi_payments_created_at ON upi_payments(created_at DESC);

-- Enable RLS if not enabled
ALTER TABLE upi_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to recreate them cleanly)
DROP POLICY IF EXISTS "Users can view their own UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Users can create UPI payments for their orders" ON upi_payments;
DROP POLICY IF EXISTS "Users can update their own UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Admins can view all UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Admins can verify UPI payments" ON upi_payments;

-- Recreate RLS Policies
CREATE POLICY "Users can view their own UPI payments"
ON upi_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = upi_payments.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create UPI payments for their orders"
ON upi_payments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = upi_payments.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own UPI payments"
ON upi_payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = upi_payments.order_id
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all UPI payments"
ON upi_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can verify UPI payments"
ON upi_payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Trigger to auto-update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_upi_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_upi_payment_updated_at ON upi_payments;
CREATE TRIGGER trg_update_upi_payment_updated_at
BEFORE UPDATE ON upi_payments
FOR EACH ROW
EXECUTE FUNCTION update_upi_payment_updated_at();

-- ============================================
-- VERIFICATION: Show table structure
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'upi_payments'
ORDER BY ordinal_position;

-- Show indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'upi_payments';

-- Show policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'upi_payments';
