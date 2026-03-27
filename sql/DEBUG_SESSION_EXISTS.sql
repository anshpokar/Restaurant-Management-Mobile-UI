-- =====================================================
-- DEBUG: CHECK IF SESSION EXISTS AND PERMISSIONS
-- =====================================================

-- 1. Check if the specific session exists
SELECT 
  id,
  session_name,
  session_status,
  table_id,
  user_id,
  created_at
FROM dine_in_sessions
WHERE id = '184ee8fa-a364-4abe-8d44-b1ab3ea3ad09';

-- 2. List ALL sessions (active or not)
SELECT 
  id,
  session_name,
  session_status,
  table_id,
  user_id,
  created_at
FROM dine_in_sessions
ORDER BY created_at DESC
LIMIT 10;

-- 3. Count total sessions
SELECT COUNT(*) as total_sessions FROM dine_in_sessions;

-- 4. Check if the function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'get_session_by_id';

-- 5. Test the function directly
SELECT * FROM get_session_by_id('184ee8fa-a364-4abe-8d44-b1ab3ea3ad09');

-- 6. Check table privileges
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'dine_in_sessions';

-- 7. Check if RLS is really disabled
SELECT 
  relname,
  relrowsecurity,
  relforcerowsecurity
FROM pg_class
WHERE relname = 'dine_in_sessions';
