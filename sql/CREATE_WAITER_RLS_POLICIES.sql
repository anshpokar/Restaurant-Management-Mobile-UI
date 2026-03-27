-- ============================================
-- WAITER SESSION MANAGEMENT - RLS POLICIES
-- ============================================

-- Enable RLS on table_sessions
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Allow waiters to create sessions" ON table_sessions;
DROP POLICY IF EXISTS "Allow waiters to view all sessions" ON table_sessions;
DROP POLICY IF EXISTS "Allow waiters to update sessions" ON table_sessions;

-- Allow waiters to CREATE sessions for any table
CREATE POLICY "Allow waiters to create sessions"
ON table_sessions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
);

-- Allow waiters to VIEW all sessions
CREATE POLICY "Allow waiters to view all sessions"
ON table_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter', 'chef')
  )
);

-- Allow waiters to UPDATE sessions (add items, close, etc.)
CREATE POLICY "Allow waiters to update sessions"
ON table_sessions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
)
WITH CHECK (true);

-- ============================================
-- PROFILES TABLE - Simplified to avoid recursion
-- ============================================

-- Drop old policies that cause recursion
DROP POLICY IF EXISTS "Allow waiters to view profiles" ON profiles;

-- SIMPLE APPROACH: Allow all authenticated users to view profiles
-- This avoids recursion by not checking profiles.role in the policy
-- Application logic should restrict access instead
CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- OTP VERIFICATIONS TABLE - For email verification
-- ============================================

-- Create OTP verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'email_verification',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Allow anyone to insert OTP" ON otp_verifications;
DROP POLICY IF EXISTS "Allow staff to verify OTP" ON otp_verifications;

-- Allow staff to create OTP records
CREATE POLICY "Allow staff to insert OTP"
ON otp_verifications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
);

-- Allow staff to verify OTP (select and update)
CREATE POLICY "Allow staff to select OTP"
ON otp_verifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
);

-- Allow staff to mark OTP as used
CREATE POLICY "Allow staff to update OTP"
ON otp_verifications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
)
WITH CHECK (true);

-- ============================================
-- RESTAURANT TABLES - Update status
-- ============================================

-- Drop old policies
DROP POLICY IF EXISTS "Allow waiters to update tables" ON restaurant_tables;

-- Allow waiters to update table status
CREATE POLICY "Allow waiters to update tables"
ON restaurant_tables FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
)
WITH CHECK (true);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_table_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table_id ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_email ON otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_otp_verifications_expires_at ON otp_verifications(expires_at);
