-- ============================================
-- FIX DUPLICATE PROFILES ISSUE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Check for duplicate usernames
SELECT username, COUNT(*) as count
FROM profiles
GROUP BY username
HAVING COUNT(*) > 1;

-- 2. Check for duplicate emails
SELECT email, COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- 3. Find all duplicates with details
SELECT id, email, username, created_at
FROM profiles
WHERE email IN (
  SELECT email
  FROM profiles
  GROUP BY email
  HAVING COUNT(*) > 1
)
ORDER BY email, created_at;

-- 4. Delete duplicate profiles (keep oldest)
-- ⚠️ BACKUP YOUR DATA FIRST!
-- This keeps the oldest profile and deletes newer duplicates

DELETE FROM profiles p1
USING profiles p2
WHERE p1.email = p2.email 
  AND p1.created_at > p2.created_at;

-- 5. Add unique constraints to prevent future duplicates
-- (Only if they don't already exist)

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- 6. Verify uniqueness
SELECT 'Usernames' as type, COUNT(*) as total, COUNT(DISTINCT username) as unique_count FROM profiles
UNION ALL
SELECT 'Emails' as type, COUNT(*) as total, COUNT(DISTINCT email) as unique_count FROM profiles;
