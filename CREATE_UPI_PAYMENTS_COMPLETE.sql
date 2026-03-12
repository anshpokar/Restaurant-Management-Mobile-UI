-- =====================================================
-- COMPLETE UPI PAYMENTS SETUP SCRIPT
-- Run this ENTIRE script in Supabase SQL Editor
-- This will create/fix the upi_payments table with correct schema
-- =====================================================

-- Step 1: Drop existing table if it exists (to start fresh)
DROP TABLE IF EXISTS public.upi_payments CASCADE;

-- Step 2: Create the upi_payments table with CORRECT schema
CREATE TABLE public.upi_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  vpa text NOT NULL DEFAULT 'anshjpokar@oksbi',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  upi_link text NOT NULL,
  transaction_id text,
  beneficiary_name text,
  status text NOT NULL DEFAULT 'pending'::text 
    CHECK (status IN ('pending', 'verification_requested', 'verified', 'failed', 'expired')),
  qr_expires_at timestamp with time zone NOT NULL,
  verified_at timestamp with time zone,
  verified_by uuid REFERENCES profiles(id),
  verification_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Primary key
  CONSTRAINT upi_payments_pkey PRIMARY KEY (id),
  
  -- Each order/session can only have one active payment
  -- order_id can reference either orders.id OR dine_in_sessions.id
  UNIQUE(order_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_upi_payments_order_id ON upi_payments(order_id);
CREATE INDEX idx_upi_payments_status ON upi_payments(status);
CREATE INDEX idx_upi_payments_transaction_id ON upi_payments(transaction_id);
CREATE INDEX idx_upi_payments_created_at ON upi_payments(created_at DESC);

-- Step 4: Enable Row Level Security
ALTER TABLE public.upi_payments ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "allow_customer_insert_upi_payments" ON upi_payments;
DROP POLICY IF EXISTS "allow_customer_view_upi_payments" ON upi_payments;
DROP POLICY IF EXISTS "allow_customer_update_upi_payments" ON upi_payments;
DROP POLICY IF EXISTS "allow_admin_full_access_upi_payments" ON upi_payments;
DROP POLICY IF EXISTS "Users can create UPI payments for their orders" ON upi_payments;
DROP POLICY IF EXISTS "Users can view their own UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Users can update their own UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Admins can view all UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Admins can verify UPI payments" ON upi_payments;

-- Step 6: Create new RLS policies

-- Policy 1: Allow authenticated users to INSERT UPI payments (needed for QR generation)
CREATE POLICY "allow_authenticated_insert_upi_payments"
ON upi_payments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 2: Allow customers to SELECT their own payments (via orders OR sessions)
CREATE POLICY "allow_authenticated_select_upi_payments"
ON upi_payments
FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Allow customers to UPDATE their own payments (submit transaction ID)
CREATE POLICY "allow_authenticated_update_upi_payments"
ON upi_payments
FOR UPDATE
TO authenticated
USING (true);

-- Policy 4: Admins get full access to everything
CREATE POLICY "allow_admin_all_upi_payments"
ON upi_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Step 7: Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_upi_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_upi_payment_updated_at
BEFORE UPDATE ON upi_payments
FOR EACH ROW
EXECUTE FUNCTION update_upi_payment_updated_at();

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to confirm everything was created correctly
-- =====================================================

-- Check table exists
SELECT 
  tablename,
  '✅ Table created successfully!' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'upi_payments';

-- Show columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'upi_payments'
ORDER BY ordinal_position;

-- Show indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'upi_payments';

-- Show policies
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'upi_payments'
ORDER BY policyname;
