-- =====================================================
-- FIX: WAITER RLS POLICY FOR dine_in_sessions
-- =====================================================
-- This adds INSERT permission for waiters and admins
-- =====================================================

-- Drop the old restrictive INSERT policy if it exists
DROP POLICY IF EXISTS "Users can create own dine-in sessions" ON dine_in_sessions;

-- Create new comprehensive INSERT policy
-- Allows customers, waiters, and admins to create sessions
CREATE POLICY "Allow authenticated users to create dine-in sessions"
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

-- Also update the UPDATE policy to be more inclusive
DROP POLICY IF EXISTS "Staff can update all dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Users can update own dine-in sessions" ON dine_in_sessions;

CREATE POLICY "Allow users to update own dine-in sessions"
ON dine_in_sessions FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
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

-- Test: Try inserting as waiter (should work now)
-- Run this manually in a new query window after logging in as waiter:
/*
INSERT INTO dine_in_sessions (
  table_id,
  user_id,
  session_status,
  payment_status,
  total_amount,
  paid_amount,
  session_name,
  notes
) VALUES (
  (SELECT id FROM restaurant_tables WHERE table_number = 1 LIMIT 1),
  auth.uid(),
  'active',
  'pending',
  0,
  0,
  'Test Session',
  'RLS Policy Test'
);
*/
