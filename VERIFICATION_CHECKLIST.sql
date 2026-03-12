-- =====================================================
-- UPI PAYMENT VERIFICATION CHECKLIST
-- Run these queries to verify everything is set up correctly
-- =====================================================

-- 1. Check upi_payments table exists with correct columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'upi_payments'
ORDER BY ordinal_position;

-- Expected columns: id, order_id, vpa, amount, upi_link, transaction_id, 
-- beneficiary_name, status, qr_expires_at, verified_at, verified_by, 
-- verification_notes, created_at, updated_at

-- 2. Check RLS policies exist
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename = 'upi_payments'
ORDER BY policyname;

-- Expected: At least 4 policies (INSERT, SELECT, UPDATE for customers, ALL for admins)

-- 3. Check real-time is enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE tablename = 'upi_payments';

-- Should return at least one row if real-time is enabled

-- 4. Check recent UPI payments and their status
SELECT 
  up.id,
  up.order_id,
  CASE 
    WHEN o.id IS NOT NULL THEN 'ORDER'
    WHEN ds.id IS NOT NULL THEN 'SESSION'
    ELSE 'NOT FOUND'
  END as type,
  up.amount,
  up.status,
  up.transaction_id,
  COALESCE(o.payment_status, ds.payment_status) as linked_status,
  up.created_at
FROM upi_payments up
LEFT JOIN orders o ON o.id = up.order_id
LEFT JOIN dine_in_sessions ds ON ds.id = up.order_id
ORDER BY up.created_at DESC
LIMIT 10;

-- 5. Check for any orphaned payments (no matching order or session)
SELECT 
  up.id,
  up.order_id,
  up.status,
  'ORPHANED' as issue
FROM upi_payments up
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = up.order_id)
  AND NOT EXISTS (SELECT 1 FROM dine_in_sessions ds WHERE ds.id = up.order_id);

-- Should return 0 rows if all payments are linked correctly

-- 6. Verify admin user has correct role
SELECT id, email, role
FROM profiles
WHERE role = 'admin';

-- Should return at least one admin user

-- 7. Check dine_in_sessions table has required columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'dine_in_sessions'
AND column_name IN ('payment_status', 'payment_method', 'session_status', 'paid_amount');

-- Expected: All 4 columns should exist
