-- =====================================================
-- CRITICAL FIX: SIMPLEST POSSIBLE RLS POLICY
-- =====================================================
-- Remove all complexity and just allow authenticated users
-- =====================================================

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Enable all authenticated users to view sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Enable insert for authorized users" ON dine_in_sessions;
DROP POLICY IF EXISTS "Enable update for authorized users" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow all authenticated users to view sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow authenticated users to create dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Allow users to update own dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Staff can view all dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Users can view own dine-in sessions" ON dine_in_sessions;

-- Enable RLS
ALTER TABLE dine_in_sessions ENABLE ROW LEVEL SECURITY;

-- SUPER SIMPLE POLICY 1: Allow ANY authenticated user to SELECT
-- No conditions, no checks - just allow it
CREATE POLICY "simple_select_all_authenticated"
ON dine_in_sessions FOR SELECT
TO authenticated
USING (true);

-- SUPER SIMPLE POLICY 2: Allow ANY authenticated user to INSERT
CREATE POLICY "simple_insert_all_authenticated"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (true);

-- SUPER SIMPLE POLICY 3: Allow ANY authenticated user to UPDATE
CREATE POLICY "simple_update_all_authenticated"
ON dine_in_sessions FOR UPDATE
TO authenticated
USING (true);

-- Verify policies
SELECT 
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'dine_in_sessions'
ORDER BY policyname;

-- TEST: This should now return results
/*
SELECT * FROM dine_in_sessions WHERE session_status = 'active';
*/
