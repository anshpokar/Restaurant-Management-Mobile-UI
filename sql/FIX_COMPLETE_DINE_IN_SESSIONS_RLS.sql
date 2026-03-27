
-- =====================================================
-- COMPLETE RLS FIX FOR dine_in_sessions
-- =====================================================
-- This adds SELECT, INSERT, and UPDATE permissions for waiters
-- =====================================================

-- Drop all old restrictive policies
DROP POLICY IF EXISTS "Users can create own dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to create dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Staff can update all dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Users can update own dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Enable select access for all authenticated users" ON dine_in_sessions;
DROP POLICY IF EXISTS "Users can view own dine-in sessions" ON dine_in_sessions;

-- Enable RLS on the table
ALTER TABLE dine_in_sessions ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY: Allow customers, waiters, and admins to CREATE sessions
CREATE POLICY "Allow users to create dine-in sessions"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (
  -- Customers can create their own sessions
  (auth.uid() = user_id)
  OR
  -- Waiters and admins can create sessions for customers
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  ))
);

-- READ POLICY: Allow viewing sessions for tables that staff manages
CREATE POLICY "Allow staff to view all dine-in sessions"
ON dine_in_sessions FOR SELECT
TO authenticated
USING (
  -- Users can view their own sessions
  (auth.uid() = user_id)
  OR
  -- Staff can view all sessions
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter', 'chef')
  ))
);

-- UPDATE POLICY: Allow updating sessions
CREATE POLICY "Allow users to update dine-in sessions"
ON dine_in_sessions FOR UPDATE
TO authenticated
USING (
  -- Users can update their own sessions
  (auth.uid() = user_id)
  OR
  -- Staff can update all sessions
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  ))
);

-- DELETE POLICY: Only admins can delete sessions
CREATE POLICY "Allow admins to delete dine-in sessions"
ON dine_in_sessions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'dine_in_sessions'
ORDER BY policyname;

-- Test query: Check if waiter can access sessions
-- Run this after logging in as waiter:
/*
SELECT 
  ds.id,
  ds.session_name,
  ds.session_status,
  rt.table_number
FROM dine_in_sessions ds
JOIN restaurant_tables rt ON ds.table_id = rt.id
WHERE ds.session_status = 'active';
*/
