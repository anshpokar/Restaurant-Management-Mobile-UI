-- =====================================================
-- COMPLETE WAITER ACCESS FIX FOR dine_in_sessions
-- =====================================================
-- This fixes the RLS policy to properly allow waiters access
-- =====================================================

-- First, verify your waiter user has the correct role
SELECT 
  p.id,
  p.email,
  p.role,
  p.username
FROM profiles p
WHERE p.role = 'waiter'
LIMIT 5;

-- Drop ALL existing policies on dine_in_sessions
DROP POLICY IF EXISTS "Allow authenticated users to create dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow users to update own dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Staff can view all dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Users can view own dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow all authenticated users to view sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow all authenticated users to create sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow all authenticated users to update sessions" ON dine_in_sessions;

-- Enable RLS
ALTER TABLE dine_in_sessions ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Create a SIMPLE policy first to avoid recursion issues
-- Allow ANY authenticated user to SELECT (we'll restrict in app logic if needed)
CREATE POLICY "Enable all authenticated users to view sessions"
ON dine_in_sessions FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to INSERT if they are waiter/admin OR creating their own session
CREATE POLICY "Enable insert for authorized users"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (
  -- Simple check: either waiter/admin role OR creating own session
  (auth.uid() = user_id)
  OR
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'waiter')
  ))
);

-- Allow authenticated users to UPDATE if they are waiter/admin OR updating own session
CREATE POLICY "Enable update for authorized users"
ON dine_in_sessions FOR UPDATE
TO authenticated
USING (
  (auth.uid() = user_id)
  OR
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND p.role IN ('admin', 'waiter')
  ))
);

-- Verify policies were created successfully
SELECT 
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'dine_in_sessions'
ORDER BY cmd, policyname;

-- TEST QUERY: This should now return results for waiters
-- Run this after logging in as a waiter user:
/*
SELECT 
  ds.id,
  ds.session_name,
  ds.session_status,
  ds.payment_status,
  ds.table_id,
  rt.table_number,
  ds.user_id
FROM dine_in_sessions ds
LEFT JOIN restaurant_tables rt ON ds.table_id = rt.id
WHERE ds.session_status = 'active'
ORDER BY ds.started_at DESC;
*/

-- DEBUG: Check if profiles table has the right data
/*
SELECT 
  auth.uid() as current_user_id,
  p.id as profile_id,
  p.email,
  p.role,
  p.username
FROM profiles p
WHERE p.id = auth.uid();
*/
