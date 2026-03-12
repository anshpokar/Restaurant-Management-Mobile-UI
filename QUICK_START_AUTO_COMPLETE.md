# 🚀 QUICK START: Install Auto-Complete Session Function

## ⚡ Step-by-Step Installation

### **Step 1: Run SQL in Supabase**

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire content from `CREATE_AUTO_COMPLETE_SESSION_FUNCTION.sql`
3. Paste into SQL Editor
4. Click **Run** ▶️

**Expected Output:**
```
✅ Function created: update_session_status_on_payment
✅ Trigger created: trg_update_session_status_on_payment  
✅ Function created: confirm_session_payment
✅ Function created: confirm_session_payment_by_name
```

---

### **Step 2: Test the Trigger**

**Run these commands in Supabase SQL Editor:**

```sql
-- Create test session (uses existing user from database)
INSERT INTO dine_in_sessions (table_id, user_id, session_name, payment_status, session_status)
VALUES (
  (SELECT id FROM restaurant_tables LIMIT 1),
  (SELECT id FROM profiles LIMIT 1),  -- Uses first available user
  'Test Auto-Complete Session',
  'pending',
  'active'
);

-- Update payment (trigger should fire automatically)
UPDATE dine_in_sessions 
SET payment_status = 'paid' 
WHERE session_name = 'Test Auto-Complete Session';

-- Check result
SELECT id, session_name, payment_status, session_status, completed_at
FROM dine_in_sessions 
WHERE session_name = 'Test Auto-Complete Session';
```

**Expected Result:**
| Column | Value |
|--------|-------|
| payment_status | `paid` ✅ |
| session_status | `completed` ✅ |
| completed_at | `[timestamp]` ✅ |

**If you see this → It works! 🎉**

---

### **Step 3: Test RPC Function**

```sql
-- Create another test session
INSERT INTO dine_in_sessions (table_id, user_id, session_name, payment_status, session_status)
VALUES (
  (SELECT id FROM restaurant_tables LIMIT 1),
  auth.uid(),
  'Test RPC Session',
  'pending',
  'active'
);

-- Use RPC function to confirm payment
SELECT confirm_session_payment_by_name('Test RPC Session');

-- Verify result
SELECT * FROM dine_in_sessions WHERE session_name = 'Test RPC Session';
```

**Expected:** Same as above - payment paid, session completed ✅

---

## 💻 How to Use in Code

### **Method 1: Direct Update (Trigger Fires Automatically)**

```typescript
// Simple update - trigger handles completion
await supabase
  .from('dine_in_sessions')
  .update({ payment_status: 'paid' })
  .eq('id', sessionId);

// Result:
// ✅ payment_status = 'paid'
// ✅ session_status = 'completed' (automatic!)
```

---

### **Method 2: RPC Function (Recommended for Admin Actions)**

```typescript
// Admin confirms COD payment
const { error } = await supabase.rpc('confirm_session_payment', {
  p_session_id: sessionId
});

if (error) {
  console.error('Error:', error);
} else {
  toast.success('Payment confirmed! Session completed.');
}
```

---

### **Method 3: By Session Name (For UPI Orders)**

```typescript
// When order has session_name instead of session_id
const { error } = await supabase.rpc('confirm_session_payment_by_name', {
  p_session_name: 'Session-ABC123',
  p_admin_id: adminId
});

if (error) {
  console.error('Error:', error);
} else {
  toast.success('Session payment confirmed!');
}
```

---

## 🔍 Troubleshooting

### **Error: "invalid input syntax for type uuid"**

**Cause:** Using placeholder text like `'your-session-id'` instead of real UUID

**Solution:** Always use actual UUIDs or variables:
```sql
-- ❌ WRONG
WHERE id = 'your-session-id';

-- ✅ CORRECT
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- ✅ ALSO CORRECT (using variable)
WHERE session_name = 'My Session';
```

---

### **Error: "function does not exist"**

**Cause:** SQL file wasn't run successfully

**Solution:**
1. Re-run `CREATE_AUTO_COMPLETE_SESSION_FUNCTION.sql`
2. Check for errors in output
3. Refresh Supabase SQL Editor

---

### **Trigger Not Firing**

**Check if trigger exists:**
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'dine_in_sessions'::regclass;
```

**Expected:** Should show `trg_update_session_status_on_payment` with `tgenabled = true`

**If missing:** Re-run the SQL file

---

## ✅ Verification Checklist

After installation, verify:

- [ ] All 4 functions created successfully
- [ ] Trigger is attached to `dine_in_sessions` table
- [ ] Test session auto-completes when payment updated
- [ ] RPC functions work without errors
- [ ] UPI verification integration ready

---

## 🎯 Real-World Usage Examples

### **Example 1: Admin COD Confirmation**

```typescript
// Admin dashboard - customer paid cash at counter
async function confirmCODPayment(sessionId: string) {
  // Method 1: Simple update (trigger fires automatically)
  const { error } = await supabase
    .from('dine_in_sessions')
    .update({ payment_status: 'paid' })
    .eq('id', sessionId);
  
  if (error) {
    toast.error('Failed to confirm payment');
  } else {
    toast.success('Cash payment confirmed! Session completed.');
  }
}
```

---

### **Example 2: UPI Payment Verification**

```typescript
// Already integrated in src/lib/upi-payment.ts
async function verifyUPIPayment(qrId: string, adminId: string) {
  // ... verify UPI transaction ...
  
  // Auto-complete session if order belongs to one
  if (orderHasSession) {
    await supabase.rpc('confirm_session_payment_by_name', {
      p_session_name: sessionName,
      p_admin_id: adminId
    });
  }
  
  return { success: true };
}
```

---

### **Example 3: Batch Payment Confirmation**

```typescript
// Confirm multiple sessions at once
async function bulkConfirmPayments(sessionIds: string[]) {
  for (const sessionId of sessionIds) {
    await supabase.rpc('confirm_session_payment', {
      p_session_id: sessionId
    });
  }
  
  toast.success(`${sessionIds.length} payments confirmed!`);
}
```

---

## 📊 State Transition Table

| Action | payment_status Before | payment_status After | session_status Before | session_status After |
|--------|----------------------|---------------------|----------------------|---------------------|
| Create session | `pending` | `pending` | `active` | `active` |
| Update to paid | `pending` | `paid` | `active` | `completed` 🔥 |
| RPC confirm | `pending` | `paid` | `active` | `completed` 🔥 |
| Update to partial | `pending` | `partial` | `active` | `active` (no change) |
| Update paid→pending | `paid` | `pending` | `completed` | `completed` (no change) |

🔥 = **Trigger fires and auto-completes session!**

---

## 🎉 Success Indicators

After proper installation:

✅ **Database:**
- Functions listed in Supabase → Database → Functions
- Trigger listed in Supabase → Database → Triggers
- Test queries work without errors

✅ **Code:**
- No TypeScript errors
- RPC calls work
- Sessions auto-complete when payment marked as paid

✅ **UI:**
- Sessions move from "Active" to "Completed" when paid
- Counts update correctly
- Status badges show correct state

---

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** ✅ Ready to Install!
