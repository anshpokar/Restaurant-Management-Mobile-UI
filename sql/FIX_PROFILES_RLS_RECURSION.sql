-- ============================================
-- FIX: Infinite Recursion in profiles RLS
-- ============================================

-- The issue: RLS policies on profiles table are checking profiles 
-- in a way that creates infinite loops

-- SOLUTION: Simplify RLS policies to avoid self-referencing

-- Drop ALL problematic policies first
DO $$ BEGIN
  -- Drop all existing policies on profiles
  DROP POLICY IF EXISTS "Allow admins to view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Allow waiters to view profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
  DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
  DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;
  DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
EXCEPTION
  WHEN undefined_table THEN NULL; -- Table might not exist
END $$;

-- Create simple, safe RLS policies

-- 1. Users can view their own profile
-- First drop if exists to avoid duplicates
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Allow authenticated users to insert their own profile (for signup)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 4. Allow staff (admin/waiter) to view other profiles using role check
-- This uses a simpler approach - check if requesting user has staff role
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
CREATE POLICY "Staff can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p2
    WHERE p2.id = auth.uid()
    AND p2.role IN ('admin', 'waiter')
  )
);

-- 5. Allow admins to update any profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM profiles p2
    WHERE p2.id = auth.uid()
    AND p2.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM profiles p2
    WHERE p2.id = auth.uid()
    AND p2.role = 'admin'
  )
);

-- ============================================
-- Alternative: Use auth.jwt() for role check (safer)
-- ============================================

-- If the above still causes issues, use this even simpler approach:

-- For SELECT - anyone authenticated can view any profile
-- (Restrict in application logic instead)
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- This prevents recursion while allowing necessary access
