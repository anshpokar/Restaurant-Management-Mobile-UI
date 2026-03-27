-- =====================================================
-- VERIFY RLS POLICIES FOR dine_in_sessions
-- =====================================================
-- Check current policies and test access
-- =====================================================

-- 1. VIEW ALL CURRENT POLICIES
SELECT 
  policyname,
  roles,
  cmd,
  definition
FROM pg_policies
WHERE tablename = 'dine_in_sessions'
ORDER BY cmd, policyname;

-- 2. CHECK IF SELECT POLICY EXISTS (THIS IS THE KEY ONE!)
SELECT 
  policyname,
  roles,
  cmd,
  definition
FROM pg_policies
WHERE tablename = 'dine_in_sessions'
AND cmd = 'SELECT';

-- Expected result should show at least one SELECT policy like:
-- "Enable all authenticated users to view sessions" | {authenticated} | SELECT | USING (true)

-- 3. TEST QUERY AS WAITER
-- Run this after logging in as a waiter user to verify access:
/*
SELECT 
  ds.id,
  ds.session_name,
  ds.session_status,
  ds.payment_status,
  ds.table_id,
  rt.table_number,
  ds.user_id,
  ds.created_at
FROM dine_in_sessions ds
LEFT JOIN restaurant_tables rt ON ds.table_id = rt.id
WHERE ds.session_status = 'active'
ORDER BY ds.started_at DESC;
*/

-- 4. IF NO SELECT POLICY EXISTS, CREATE IT NOW:
/*
DROP POLICY IF EXISTS "Enable all authenticated users to view sessions" ON dine_in_sessions;

CREATE POLICY "Enable all authenticated users to view sessions"
ON dine_in_sessions FOR SELECT
TO authenticated
USING (true);
*/

-- 5. DEBUG: Check your current user's role
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
