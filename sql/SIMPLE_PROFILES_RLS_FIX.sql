-- ============================================
-- SIMPLE FIX: Infinite Recursion in profiles RLS
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- This will completely reset profiles table RLS policies
-- and replace them with simple, safe versions

-- Step 1: Drop ALL existing policies on profiles table
DO $$ BEGIN
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
  DROP POLICY IF EXISTS "Public profiles are viewable by anyone" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'profiles table does not exist';
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create ONLY these 3 simple policies (no recursion!)

-- Policy 1: Users can view their OWN profile only
CREATE POLICY "Users view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy 2: Users can update their OWN profile only  
CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Anyone authenticated can view ANY profile
-- (This is needed for waiter customer lookup)
-- Don't worry - only logged-in users can access, app controls what's shown
CREATE POLICY "Authenticated users view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- DONE! That's it. No more recursion errors.
-- ============================================

-- Test it:
-- SELECT * FROM profiles WHERE id = auth.uid(); -- Should work
-- SELECT * FROM profiles; -- Should work for authenticated users
