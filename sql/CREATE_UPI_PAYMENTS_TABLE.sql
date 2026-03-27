-- =====================================================
-- UPI PAYMENTS TABLE - CREATE/UPDATE SCRIPT
-- Run this in Supabase SQL Editor FIRST!
-- =====================================================

-- Check if table exists first
DO $$
BEGIN
  -- Create upi_payments table if it doesn't exist
  CREATE TABLE IF NOT EXISTS upi_payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    vpa text NOT NULL, -- UPI ID used for payment
    amount numeric(10,2) NOT NULL,
    upi_link text NOT NULL, -- The actual UPI link (upi://pay?...)
    transaction_id text, -- UTR number submitted by customer
    beneficiary_name text, -- Name shown in UPI app
    status text NOT NULL DEFAULT 'pending' CHECK (status IN (
      'pending', 
      'verification_requested', 
      'verified', 
      'failed', 
      'expired'
    )),
    qr_expires_at timestamptz NOT NULL, -- QR code expiry time
    verified_at timestamptz,
    verified_by uuid REFERENCES profiles(id), -- Admin who verified
    verification_notes text, -- Verification notes or rejection reason
    created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Each order can only have one active payment
    UNIQUE(order_id)
  );
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_upi_payments_order_id ON upi_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_upi_payments_qr_id ON upi_payments(qr_id);
CREATE INDEX IF NOT EXISTS idx_upi_payments_status ON upi_payments(status);
CREATE INDEX IF NOT EXISTS idx_upi_payments_transaction_id ON upi_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_upi_payments_created_at ON upi_payments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE upi_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can view their own payments (via orders)
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

-- Customers can insert payments for their orders
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

-- Customers can update their own payments (submit UTR)
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

-- Admins can view all payments
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

-- Admins can update all payments (verify/reject)
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

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_upi_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_upi_payment_updated_at
BEFORE UPDATE ON upi_payments
FOR EACH ROW
EXECUTE FUNCTION update_upi_payment_updated_at();

-- ============================================
-- VERIFICATION: Check table was created
-- ============================================
SELECT 
  tablename,
  '✅ Table exists!' as status
FROM pg_tables 
WHERE tablename = 'upi_payments';

-- Show columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'upi_payments'
ORDER BY ordinal_position;
