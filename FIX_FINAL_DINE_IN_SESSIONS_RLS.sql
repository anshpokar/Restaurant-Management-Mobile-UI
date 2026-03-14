-- =====================================================
-- FINAL RLS FIX FOR dine_in_sessions
-- =====================================================
-- This ensures waiters can actually VIEW sessions
-- =====================================================

-- First, let's see what policies exist
SELECT 
  policyname,
  roles,
  cmd,
  definition
FROM pg_policies
WHERE tablename = 'dine_in_sessions'
ORDER BY cmd, policyname;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to create dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow users to update own dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Staff can view all dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Users can view own dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow public to view dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Enable read access for all users" ON dine_in_sessions;

-- Enable RLS
ALTER TABLE dine_in_sessions ENABLE ROW LEVEL SECURITY;

-- SIMPLE POLICY 1: Allow ANY authenticated user to SELECT (simplest approach)
CREATE POLICY "Allow all authenticated users to view sessions"
ON dine_in_sessions FOR SELECT
TO authenticated
USING (true);

-- SIMPLE POLICY 2: Allow ANY authenticated user to INSERT
CREATE POLICY "Allow all authenticated users to create sessions"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (true);

-- SIMPLE POLICY 3: Allow ANY authenticated user to UPDATE
CREATE POLICY "Allow all authenticated users to update sessions"
ON dine_in_sessions FOR UPDATE
TO authenticated
USING (true);

-- Verify the new policies
SELECT 
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'dine_in_sessions'
ORDER BY policyname;

-- TEST: Try querying as any authenticated user
-- This should return results now!
/*
SELECT 
  ds.id,
  ds.session_name,
  ds.session_status,
  ds.table_id,
  rt.table_number
FROM dine_in_sessions ds
JOIN restaurant_tables rt ON ds.table_id = rt.id
WHERE ds.session_status = 'active';
*/
