# 🔧 SQL Installation Troubleshooting

## ❌ Common Errors & Solutions

---

### **Error 1: Invalid UUID Format**

**Error Message:**
```
ERROR: 22P02: invalid input syntax for type uuid: "your-session-id"
```

**Cause:** Using placeholder text instead of real UUID

**Solution:** ✅ **Already fixed!** The SQL now uses `(SELECT id FROM profiles LIMIT 1)` to get a valid user ID automatically.

---

### **Error 2: Null User ID (Most Common!)**

**Error Message:**
```
ERROR: 23502: null value in column "user_id" violates not-null constraint
DETAIL: Failing row contains (...null...)
```

**Cause:** `auth.uid()` returns NULL when running SQL directly in Supabase editor (you're not "logged in")

**Old Code (BROKEN):**
```sql
INSERT INTO dine_in_sessions (..., user_id, ...)
VALUES (..., auth.uid(), ...);  -- ❌ Returns NULL in SQL editor
```

**New Code (WORKS):**
```sql
INSERT INTO dine_in_sessions (..., user_id, ...)
VALUES (..., (SELECT id FROM profiles LIMIT 1), ...);  -- ✅ Uses existing user
```

**Solution:** ✅ **Already fixed!** The SQL now fetches an existing user from the `profiles` table.

---

### **Error 3: No Tables Found**

**Error Message:**
```
ERROR: 42P01: relation "dine_in_sessions" does not exist
```

**Cause:** Table hasn't been created yet

**Solution:**
1. First run the main database schema
2. Then run this auto-complete function file
3. Check Supabase → Database → Tables to verify table exists

---

### **Error 4: Function Already Exists**

**Error Message:**
```
ERROR: 42723: function update_session_status_on_payment already exists
```

**Cause:** Running the SQL file multiple times

**Solution:** Either:
- **Option A:** Drop and recreate functions first:
  ```sql
  DROP FUNCTION IF EXISTS update_session_status_on_payment() CASCADE;
  DROP FUNCTION IF EXISTS confirm_session_payment(uuid) CASCADE;
  DROP FUNCTION IF EXISTS confirm_session_payment_by_name(text, uuid) CASCADE;
  ```
  
- **Option B:** Just ignore the error - functions still work!

---

### **Error 5: Trigger Already Exists**

**Error Message:**
```
ERROR: 42710: trigger "trg_update_session_status_on_payment" already exists
```

**Cause:** Running SQL file multiple times

**Solution:** The SQL file already includes `DROP TRIGGER IF EXISTS` before creating, so this should be handled automatically. If you still get errors:

```sql
-- Manually drop trigger
DROP TRIGGER IF EXISTS trg_update_session_status_on_payment ON dine_in_sessions;

-- Then re-run the SQL file
```

---

## ✅ Complete Installation Steps

### **Step 1: Verify Prerequisites**

Check that required tables exist:
```sql
-- Should return list of tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Look for:
-- ✓ dine_in_sessions
-- ✓ restaurant_tables
-- ✓ profiles
```

If missing, create the tables first using your main schema file.

---

### **Step 2: Install Auto-Complete Functions**

1. Open Supabase → SQL Editor
2. Copy **entire** `CREATE_AUTO_COMPLETE_SESSION_FUNCTION.sql`
3. Paste and click **Run** ▶️

**Expected Output:**
```
✅ Function created: update_session_status_on_payment
✅ Trigger created: trg_update_session_status_on_payment
✅ Function created: confirm_session_payment
✅ Function created: confirm_session_payment_by_name
```

If you see errors, check the troubleshooting section above.

---

### **Step 3: Test Installation**

**Run This Test:**
```sql
-- Create test session
INSERT INTO dine_in_sessions (table_id, user_id, session_name, payment_status, session_status)
VALUES (
  (SELECT id FROM restaurant_tables LIMIT 1),
  (SELECT id FROM profiles LIMIT 1),
  'Test Auto-Complete',
  'pending',
  'active'
);

-- Update payment (should trigger auto-complete)
UPDATE dine_in_sessions 
SET payment_status = 'paid' 
WHERE session_name = 'Test Auto-Complete';

-- Verify result
SELECT 
  session_name, 
  payment_status, 
  session_status, 
  completed_at 
FROM dine_in_sessions 
WHERE session_name = 'Test Auto-Complete';
```

**Expected Result:**
```
session_name       | Test Auto-Complete
payment_status     | paid          ✅
session_status     | completed     ✅
completed_at       | [timestamp]   ✅
```

**If all three are correct → Installation successful! 🎉**

---

## 🔍 Verification Commands

### **Check Functions Exist:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND specific_schema = 'public'
  AND routine_name LIKE '%session%';

-- Should show:
-- ✓ update_session_status_on_payment
-- ✓ confirm_session_payment
-- ✓ confirm_session_payment_by_name
```

---

### **Check Trigger Exists:**
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'dine_in_sessions'::regclass;

-- Should show:
-- trg_update_session_status_on_payment | true
```

---

### **Check Trigger Function:**
```sql
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'update_session_status_on_payment';

-- Should return the PL/pgSQL function code
```

---

## 🚨 Still Having Issues?

### **Nuclear Option - Clean Reinstall:**

```sql
-- 1. Drop everything
DROP TRIGGER IF EXISTS trg_update_session_status_on_payment ON dine_in_sessions;
DROP FUNCTION IF EXISTS update_session_status_on_payment() CASCADE;
DROP FUNCTION IF EXISTS confirm_session_payment(uuid) CASCADE;
DROP FUNCTION IF EXISTS confirm_session_payment_by_name(text, uuid) CASCADE;

-- 2. Refresh the page

-- 3. Re-run CREATE_AUTO_COMPLETE_SESSION_FUNCTION.sql
```

---

## 💡 Tips for Success

1. **Run SQL in Order:**
   - Main schema first
   - Auto-complete functions second
   - Tests last

2. **Use SQL Editor:**
   - Don't run from command line
   - Supabase SQL Editor gives best error messages

3. **Check Permissions:**
   - Must be logged in as admin/owner
   - RLS policies might block operations

4. **Read Error Messages:**
   - Supabase errors are usually descriptive
   - Line numbers help locate issues

5. **One Step at a Time:**
   - Install functions
   - Test installation
   - Then integrate with code

---

## ✅ Success Checklist

After installation, you should have:

- [ ] All 4 functions created (check with query above)
- [ ] Trigger attached to `dine_in_sessions` table
- [ ] Test session auto-completes successfully
- [ ] RPC functions work without errors
- [ ] Ready to integrate with TypeScript code

---

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** ✅ Troubleshooting Guide Ready!
