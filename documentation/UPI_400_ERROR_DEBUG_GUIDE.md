# UPI Payment 400 Error - Debugging Guide

## Problem
Getting 400 errors when fetching UPI payments in admin dashboard.

## Root Cause Analysis

### Issue #1: Authentication Required
The RLS (Row Level Security) policies require an authenticated admin user to access `upi_payments` table.

**Check:**
1. Are you logged in as an **admin** user?
2. Is the auth session persisting correctly?

### Issue #2: JOIN Query Complexity
Complex JOIN queries with RLS can sometimes fail with 400 errors.

## Solution Implemented

### Code Changes Made:

1. **Better Error Handling**
   - Added detailed console logging
   - Separate order data fetching to isolate issues
   - Null-safety for missing order data

2. **Authentication Verification**
   - Check if user is logged in
   - Verify user has 'admin' role
   - Show appropriate error messages

3. **Query Strategy Change**
   - Fetch UPI payments first (without JOIN)
   - Fetch order details separately for each payment
   - Combine data in application code

## How to Test

### Step 1: Verify You're Logged In as Admin

Open browser console and run:
```javascript
const stored = localStorage.getItem('userProfile');
const user = stored ? JSON.parse(stored) : null;
console.log('Stored User:', user);
console.log('User Role:', user?.role);
```

**Expected Output:**
- `user.role` should be `'admin'`
- `user.id` should be a valid UUID

### Step 2: Check Browser Console Logs

After opening the admin UPI verification screen, check console for:
```
Current user ID: [UUID]
User profile: { id, email, role: 'admin', ... }
User role: admin
```

### Step 3: Verify Database Access

In Supabase SQL Editor, run this FIRST to authenticate:
```sql
-- This will show NULL if you're not authenticated in the SQL editor
SELECT auth.uid() as current_user_id;
```

If it returns NULL, you need to:
1. Go to Supabase Dashboard → Authentication → Users
2. Sign in with an admin account
3. Then run the test queries

### Step 4: Test UPI Payments Query

Run this in Supabase SQL Editor (after authenticating):
```sql
-- Simple query without JOIN
SELECT * FROM upi_payments 
ORDER BY created_at DESC 
LIMIT 10;

-- If above works, try with JOIN
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
```

## Common Issues & Fixes

### Issue: "No authenticated user"
**Fix:** Log in with admin credentials at `/login`

### Issue: "User is not an admin"
**Fix:** Update user's role in database:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### Issue: "Relation upi_payments does not exist"
**Fix:** Run the table creation script:
```bash
# In Supabase SQL Editor, run CREATE_UPI_PAYMENTS_TABLE.sql
```

### Issue: Still getting 400 errors
**Debug Steps:**
1. Check Supabase project URL and API key in `.env`
2. Verify RLS policies are set up correctly
3. Check if `upi_payments` table exists:
   ```sql
   SELECT * FROM pg_tables WHERE tablename = 'upi_payments';
   ```

## Quick Fix Commands

### Reset RLS Policies:
```sql
-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Users can create UPI payments for their orders" ON upi_payments;
DROP POLICY IF EXISTS "Admins can view all UPI payments" ON upi_payments;
DROP POLICY IF EXISTS "Admins can verify UPI payments" ON upi_payments;

-- Recreate admin policy
CREATE POLICY "Admins can view all UPI payments"
ON upi_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

### Check Table Structure:
```sql
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'upi_payments'
ORDER BY ordinal_position;
```

## Success Criteria

✅ No 400 errors in browser console
✅ UPI payments load successfully
✅ Can see order details for each payment
✅ Can verify/reject payments
✅ Real-time updates work

## Next Steps

If still having issues after following this guide:
1. Share the browser console output
2. Share the Supabase SQL Editor query results from TEST_UPI_PAYMENTS_QUERY.sql
3. Check if there are any network errors in the Network tab
