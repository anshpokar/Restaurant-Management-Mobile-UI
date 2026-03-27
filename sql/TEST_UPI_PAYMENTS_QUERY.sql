-- =====================================================
-- UPI PAYMENTS - DEBUG QUERY TEST
-- Run this in Supabase SQL Editor to test queries
-- =====================================================

-- IMPORTANT: You must be logged in to Supabase to run these queries
-- If auth.uid() returns NULL, you need to authenticate first
-- Go to Supabase Dashboard -> Authentication -> Users and sign in with an admin account

-- 1. Check if table exists and has data
SELECT 
  'Table Structure' as test_name,
  count(*) as column_count
FROM information_schema.columns
WHERE table_name = 'upi_payments';

-- 2. List all columns in upi_payments
SELECT 
  'Columns' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'upi_payments'
ORDER BY ordinal_position;

-- 3. Check sample data (if any exists)
SELECT 
  'Sample Data' as test_name,
  id,
  order_id,
  amount,
  status,
  transaction_id,
  beneficiary_name,
  created_at
FROM upi_payments
LIMIT 5;

-- 4. Test the problematic query (with orders join)
-- This is what the admin dashboard is trying to do
SELECT 
  p.*,
  o.id as order_id_check,
  o.user_id,
  o.total_amount,
  o.order_type
  -- Try without customer_name/customer_email first
FROM upi_payments p
LEFT JOIN orders o ON o.id = p.order_id
ORDER BY p.created_at DESC
LIMIT 10;

-- 5. Test with customer_name/customer_email (if they exist in orders table)
SELECT 
  p.*,
  o.id as order_id_check,
  o.user_id,
  o.total_amount,
  o.order_type,
  o.customer_name,
  o.customer_email
FROM upi_payments p
LEFT JOIN orders o ON o.id = p.order_id
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. Check RLS policies on upi_payments
SELECT 
  'RLS Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'upi_payments';

-- 7. Check if RLS is enabled
SELECT 
  'RLS Enabled' as info,
  relname as table_name,
  relrowsecurity as row_level_security,
  relforcerowsecurity as force_row_security
FROM pg_class
WHERE relname = 'upi_payments';

-- 8. Count records by status
SELECT 
  'Status Distribution' as info,
  status,
  count(*) as count
FROM upi_payments
GROUP BY status
ORDER BY count DESC;

-- 9. Test admin access (replace with your admin user ID)
-- First, get your current user ID
SELECT 
  'Current User' as info,
  auth.uid() as current_user_id;

-- 10. Check if current user is admin
SELECT 
  'User Role Check' as info,
  p.id,
  p.email,
  p.role
FROM profiles p
WHERE p.id = auth.uid();
