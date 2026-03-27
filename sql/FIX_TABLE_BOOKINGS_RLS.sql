-- =====================================================
-- FIX TABLE_BOOKINGS RLS POLICIES
-- =====================================================
-- This script fixes Row Level Security policies to allow
-- authenticated users (especially admins) to update bookings
-- =====================================================

-- Step 1: Enable RLS on table_bookings (if not already enabled)
ALTER TABLE table_bookings ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing restrictive policies (if any)
DROP POLICY IF EXISTS "Enable read access for all users" ON table_bookings;
DROP POLICY IF EXISTS "Enable update for users based on id" ON table_bookings;
DROP POLICY IF EXISTS "Users can view own bookings" ON table_bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON table_bookings;
DROP POLICY IF EXISTS "Admins can update all bookings" ON table_bookings;

-- Step 3: Create comprehensive policies

-- Policy 1: Allow anyone to INSERT their own bookings
CREATE POLICY "Allow users to create bookings"
ON table_bookings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Allow users to view their own bookings
CREATE POLICY "Allow users to view own bookings"
ON table_bookings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 3: Allow users to update their own bookings (cancel)
CREATE POLICY "Allow users to update own bookings"
ON table_bookings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Allow admins to view ALL bookings
CREATE POLICY "Allow admins to view all bookings"
ON table_bookings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 5: Allow admins to update ALL bookings (confirm/cancel/complete)
CREATE POLICY "Allow admins to update all bookings"
ON table_bookings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (true);

-- Policy 6: Allow admins to delete bookings if needed
CREATE POLICY "Allow admins to delete bookings"
ON table_bookings FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
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
WHERE tablename = 'table_bookings'
ORDER BY policyname;

-- Step 5: Test the policies
-- Run this as an admin user to verify it works:
/*
UPDATE table_bookings 
SET status = 'confirmed' 
WHERE id = 'YOUR-TEST-BOOKING-ID';
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This should fix the "status not updating" issue
-- The admin can now confirm/cancel/complete any booking
-- =====================================================
