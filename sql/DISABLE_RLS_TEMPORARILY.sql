-- =====================================================
-- NUCLEAR OPTION: COMPLETELY DISABLE RLS TEMPORARILY
-- =====================================================
-- This will confirm if RLS is the issue
-- =====================================================

-- Option 1: Disable RLS entirely (for testing only!)
ALTER TABLE dine_in_sessions DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  relname,
  relrowsecurity,
  relforcerowsecurity
FROM pg_class
WHERE relname = 'dine_in_sessions';

-- TEST: Should now definitely return results
/*
SELECT * FROM dine_in_sessions WHERE session_status = 'active';
*/

-- After testing, you can re-enable RLS with proper policies:
/*
ALTER TABLE dine_in_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_access"
ON dine_in_sessions FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
*/
