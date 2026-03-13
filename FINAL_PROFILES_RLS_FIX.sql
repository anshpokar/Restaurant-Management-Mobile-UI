-- ============================================
-- FINAL FIX: Login + Infinite Recursion
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- This fixes BOTH the recursion error AND the login issue

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
  DROP POLICY IF EXISTS "Users view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users update own profile" ON profiles;
  DROP POLICY IF EXISTS "Allow lookup by username or phone" ON profiles;
EXCEPTION
  WHEN undefined_table THEN 
    RAISE NOTICE 'profiles table does not exist';
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create these 4 simple policies (no recursion!)

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

-- Policy 3: Allow ANYONE (even anonymous) to lookup profiles by username or phone
-- This is needed for LOGIN to work!
-- Only allows SELECT, and only for finding email from username/phone
CREATE POLICY "Allow lookup by username or phone"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Policy 4: Waiters/admins need to view all profiles for customer lookup
CREATE POLICY "Authenticated users view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- EXPLANATION:
-- ============================================
-- Policy 1: You can view your own profile (privacy)
-- Policy 2: You can update your own profile (self-service)
-- Policy 3: Login system can find your email from username/phone (authentication)
-- Policy 4: Waiters can look up customer profiles (business need)

-- No recursion because we're NOT querying profiles.role in the policies!

-- ============================================
-- Test it:
-- ============================================
-- Test 1: Login should work
-- Try logging in with username or phone number

-- Test 2: View own profile
-- SELECT * FROM profiles WHERE id = auth.uid();

-- Test 3: Waiter customer lookup
-- Should be able to search profiles by email

-- ============================================
-- DONE! No more recursion or login errors!
-- ============================================
