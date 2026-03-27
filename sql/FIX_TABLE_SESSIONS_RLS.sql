-- =====================================================
-- FIX TABLE_SESSIONS RLS POLICIES
-- =====================================================
-- This script fixes Row Level Security policies to allow
-- inserting and managing table sessions
-- =====================================================

-- Step 1: Enable RLS on table_sessions (if not already enabled)
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON table_sessions;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON table_sessions;
DROP POLICY IF EXISTS "Enable select for all users" ON table_sessions;
DROP POLICY IF EXISTS "Admins can manage all sessions" ON table_sessions;

-- Step 3: Create comprehensive policies

-- Policy 1: Allow admins to INSERT new sessions (when confirming bookings)
CREATE POLICY "Allow admins to create sessions"
ON table_sessions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
);

-- Policy 2: Allow admins to view ALL sessions
CREATE POLICY "Allow admins to view all sessions"
ON table_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter', 'chef')
  )
);

-- Policy 3: Allow admins to UPDATE all sessions (mark as completed, etc.)
CREATE POLICY "Allow admins to update all sessions"
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

-- Policy 4: Allow waiters to manage active sessions
CREATE POLICY "Allow waiters to manage sessions"
ON table_sessions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'waiter'
  )
)
WITH CHECK (true);

-- Policy 5: Allow chefs to view active sessions
CREATE POLICY "Allow chefs to view sessions"
ON table_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'chef'
  )
);

-- Step 4: Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'table_sessions'
ORDER BY policyname;

-- Step 5: Test the policies
-- Try inserting a session as admin:
/*
INSERT INTO table_sessions (table_id, started_at, status, payment_status, total_amount)
VALUES (
  (SELECT id FROM restaurant_tables LIMIT 1),
  NOW(),
  'active',
  'pending',
  0
);
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This allows the admin bookings screen to create sessions
-- when confirming table bookings
-- =====================================================
