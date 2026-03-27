-- =====================================================
-- FIX UPI_PAYMENTS RLS POLICIES
-- Run this in Supabase SQL Editor to allow customer inserts
-- =====================================================

-- First, let's see current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'upi_payments';

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can create UPI payments for their orders" ON upi_payments;
DROP POLICY IF EXISTS "Users can view their own UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Users can update their own UPI payments" ON upi_payments;

-- Create new permissive policies that allow INSERT without checking orders first
-- This allows customers to create UPI payments for their orders/sessions

-- Policy 1: Allow authenticated users to INSERT UPI payments
CREATE POLICY "allow_customer_insert_upi_payments"
ON upi_payments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 2: Allow authenticated users to SELECT their own payments
CREATE POLICY "allow_customer_view_upi_payments"
ON upi_payments
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM orders WHERE orders.id = upi_payments.order_id
  )
  OR
  auth.uid() IN (
    SELECT user_id FROM dine_in_sessions WHERE dine_in_sessions.id = upi_payments.order_id
  )
);

-- Policy 3: Allow authenticated users to UPDATE their own payments
CREATE POLICY "allow_customer_update_upi_payments"
ON upi_payments
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM orders WHERE orders.id = upi_payments.order_id
  )
  OR
  auth.uid() IN (
    SELECT user_id FROM dine_in_sessions WHERE dine_in_sessions.id = upi_payments.order_id
  )
);

-- Policy 4: Admins can do everything
CREATE POLICY "allow_admin_full_access_upi_payments"
ON upi_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verify policies were created
SELECT policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'upi_payments'
ORDER BY policyname;
