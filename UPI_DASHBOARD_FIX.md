# 🔧 UPI VERIFICATIONS NOT SHOWING - FIX GUIDE

## ❌ ERROR YOU'RE SEEING

```
Failed to load resource: server responded with 400
Error fetching UPI payments: [Object]
```

**What this means:** The dashboard is trying to query the `upi_payments` table but it either:
1. Doesn't exist yet
2. Has wrong column names
3. RLS policies are blocking access

---

## ✅ SOLUTION - 3 STEPS

### **STEP 1: Run Database Setup SQL** ⚠️ CRITICAL

The `upi_payments` table needs to be created first!

**Open Supabase Dashboard → SQL Editor → Run this:**

📄 **File:** [`FIX_UPI_PAYMENTS_TABLE.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/FIX_UPI_PAYMENTS_TABLE.sql)

Copy ENTIRE content and paste in SQL Editor, then click **RUN**.

This will:
- ✅ Create `upi_payments` table (if missing)
- ✅ Add correct columns (`vpa`, `qr_expires_at`, etc.)
- ✅ Create indexes
- ✅ Setup RLS policies for admin access
- ✅ Add auto-update trigger

---

### **STEP 2: Verify Table Created**

After running the SQL, verify:

```sql
-- Check if table exists
SELECT tablename 
FROM pg_tables 
WHERE tablename = 'upi_payments';

-- Should return: upi_payments ✅

-- Check columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'upi_payments'
ORDER BY ordinal_position;

-- Should show 13+ columns including:
-- id, order_id, vpa, amount, upi_link, 
-- transaction_id, status, qr_expires_at, etc.
```

---

### **STEP 3: Test Dashboard**

1. Refresh Admin Dashboard page
2. Scroll down to "Quick Actions" section
3. Should now see:
   - Pink "UPI Verifications" card
   - Count of pending verifications (or "No pending")
   - Badge if there are pending items

---

## 🐛 WHY THIS HAPPENED

The admin dashboard code tries to fetch data from `upi_payments` table:

```typescript
const { count: upiCount } = await supabase
  .from('upi_payments')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'verification_requested');
```

But if the table doesn't exist yet → **400 Error!**

---

## 🔍 DIAGNOSTIC STEPS

If still not working after running SQL, debug:

### **Check 1: Table Exists**

```sql
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename = 'upi_payments';
```

**Expected:** Should return 1 row with tablename = 'upi_payments'

**If empty:** Table wasn't created - run SQL again!

---

### **Check 2: RLS Policies**

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'upi_payments';
```

**Expected:** Should show 5 policies:
1. Users can view their own UPI payments
2. Users can create UPI payments for their orders
3. Users can update their own UPI payments
4. Admins can view all UPI payments
5. Admins can verify UPI payments

**If missing:** Run `FIX_UPI_PAYMENTS_TABLE.sql` again!

---

### **Check 3: Admin Role**

```sql
-- Check your user role
SELECT role FROM profiles WHERE id = auth.uid();
```

**Expected:** Should return `'admin'`

**If not admin:** You won't have permission to view all payments!

Fix:
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your-user-id';
```

---

### **Check 4: Column Names Match**

The dashboard queries for `status = 'verification_requested'`

Verify this status value exists:

```sql
-- Check what statuses exist in your table
SELECT DISTINCT status FROM upi_payments;
```

**Expected:** Should include `'verification_requested'`

If your table uses different status values, update the dashboard query:

```typescript
// In src/pages/admin/admin-dashboard.tsx
.eq('status', 'YOUR_STATUS_VALUE'); // e.g., 'pending_verification'
```

---

## 📊 COMPLETE DEBUGGING QUERY

Run this in Supabase SQL Editor to check everything:

```sql
-- 1. Table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'upi_payments'
ORDER BY ordinal_position;

-- 2. Sample data
SELECT * FROM upi_payments LIMIT 5;

-- 3. Status distribution
SELECT status, COUNT(*) as count
FROM upi_payments
GROUP BY status;

-- 4. RLS Policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'upi_payments';

-- 5. Your permissions
SELECT 
  auth.uid() as current_user_id,
  (SELECT role FROM profiles WHERE id = auth.uid()) as your_role;
```

---

## 🎯 AFTER RUNNING SQL

Your dashboard should show:

```
┌─────────────────────────────────────┐
│  ⚡ QUICK ACTIONS                   │
│  ┌───────────────────────────────┐ │
│  │ 💳 UPI Verifications          │ │
│  │                               │ │
│  │ No pending                    │ │ ← Gray text
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

When a customer submits a UTR:

```
┌─────────────────────────────────────┐
│  ⚡ QUICK ACTIONS                   │
│  ┌───────────────────────────────┐ │
│  │ 💳 UPI Verifications          │ │
│  │                               │ │
│  │ 1 pending              🕐 [1] │ │ ← Pink + badge
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🧪 TEST THE COMPLETE FLOW

### **Test Scenario:**

#### **1. Create Pending Verification**
```
1. Login as customer
2. Place order (₹10)
3. Go to payment screen
4. Pay ₹10 via UPI app
5. Note UTR number
6. Submit UTR in app
7. Status → "verification_requested"
```

#### **2. Check Dashboard**
```
1. Logout from customer
2. Login as admin
3. Go to Dashboard
4. See "Quick Actions" section
5. Should show:
   - Pink card
   - "1 pending" in pink bold
   - Badge with 🕐[1]
   - Pulse animation
```

#### **3. Click Card**
```
1. Click anywhere on pink card
2. Navigate to /admin/upi-verification
3. See payment in pending list
4. Verify details match
```

#### **4. Verify Payment**
```
1. Click "Verify Payment" button
2. Confirm verification
3. Status → "verified"
4. Return to dashboard
5. Card now shows: "No pending"
6. Badge disappeared
7. No more pulse
```

---

## 🚨 COMMON ISSUES & FIXES

### **Issue 1: Still Getting 400 Error After Running SQL**

**Possible causes:**
- SQL didn't run successfully
- Browser cache showing old error
- RLS still blocking

**Fix:**
```sql
-- Force refresh: drop and recreate table
DROP TABLE IF EXISTS upi_payments CASCADE;

-- Then run FIX_UPI_PAYMENTS_TABLE.sql again
```

---

### **Issue 2: Table Exists But Shows "0 pending"**

**Possible causes:**
- No payments with status 'verification_requested'
- Different status name used

**Debug:**
```sql
-- Check actual statuses
SELECT status, COUNT(*) FROM upi_payments GROUP BY status;

-- If using different name (e.g., 'pending_verification')
-- Update dashboard query to match:
```

In `src/pages/admin/admin-dashboard.tsx`:
```typescript
.eq('status', 'pending_verification'); // Change to match your schema
```

---

### **Issue 3: Card Shows But Navigation Doesn't Work**

**Check route exists:**
```typescript
// In src/routes/index.tsx
<Route path="upi-verification" element={<AdminUPIVerificationScreen />} />
```

If missing, add the route!

---

## 📝 CODE CHANGES MADE

I updated the dashboard to handle errors gracefully:

### **Before (Crashes on error):**
```typescript
const { count: upiCount } = await supabase
  .from('upi_payments')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'verification_requested');

setStats({
  pendingUpiVerifications: upiCount || 0
});
```

### **After (Handles errors safely):**
```typescript
try {
  const { count: upiCount, error: upiError } = await supabase
    .from('upi_payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'verification_requested');
  
  if (upiError) {
    console.warn('UPI payments table not accessible:', upiError.message);
  }
  
  setStats({
    pendingUpiVerifications: upiCount || 0
  });
} catch (error) {
  console.warn('Error fetching UPI verifications:', error);
  // Set to 0 if table doesn't exist
  setStats({
    pendingUpiVerifications: 0
  });
}
```

Now the dashboard won't crash even if the table is missing!

---

## ✅ VERIFICATION CHECKLIST

After running `FIX_UPI_PAYMENTS_TABLE.sql`:

- [ ] SQL executed without errors
- [ ] Table `upi_payments` exists
- [ ] Columns include: `vpa`, `qr_expires_at`, `verification_notes`
- [ ] RLS policies created (5 policies)
- [ ] Can query table in SQL editor
- [ ] Dashboard shows UPI Verifications card
- [ ] Card displays correct count
- [ ] Click navigates to verification screen
- [ ] No console errors

---

## 🎯 NEXT STEPS

1. **RIGHT NOW:** Run `FIX_UPI_PAYMENTS_TABLE.sql` in Supabase
2. **Verify:** Check table was created
3. **Test:** Place order and submit UTR
4. **Check:** Dashboard should show pending count
5. **Click:** Navigate to verification screen
6. **Verify:** Complete payment verification

---

## 📞 QUICK REFERENCE

**SQL File to Run:**  
[`FIX_UPI_PAYMENTS_TABLE.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/FIX_UPI_PAYMENTS_TABLE.sql)

**Dashboard File Updated:**  
[`src/pages/admin/admin-dashboard.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/admin/admin-dashboard.tsx)

**Verification Screen:**  
[`src/pages/admin/upi-verification-screen.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/admin/upi-verification-screen.tsx)

**Route Config:**  
[`src/routes/index.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/routes/index.tsx#L134)

---

**Status:** ⏳ Waiting for SQL execution  
**Priority:** HIGH - Required for UPI verifications to work  
**Time to Fix:** 5 minutes  

**After running SQL, the UPI Verifications card will appear on dashboard!** 🎉
