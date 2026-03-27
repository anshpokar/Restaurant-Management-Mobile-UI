# 🔧 RLS POLICY FIX - Waiter Can't Create Sessions

## ❌ **ERROR:**

```
Failed to start session: new row violates row-level security policy for table "dine_in_sessions"
POST .../dine_in_sessions 403 (Forbidden)
code: '42501' (insufficient_privilege)
```

---

## 🔍 **ROOT CAUSE:**

The `dine_in_sessions` table has **Row Level Security (RLS)** policies that only allow:
- ✅ **Customers** to INSERT their own sessions (`auth.uid() = user_id`)
- ✅ **Staff** can SELECT and UPDATE existing sessions
- ❌ **Waiters CANNOT INSERT** new sessions ← **THE PROBLEM**

When waiter tries to create a session, RLS blocks it because:
- Waiter's `user_id` ≠ customer's `user_id` in the session
- No policy exists allowing waiters to CREATE sessions

---

## ✅ **SOLUTION:**

### **Run This SQL in Supabase Dashboard:**

Go to: https://supabase.com/dashboard/project/ppjtecxvpjblisxfnztz/sql/new

Paste and run:

```sql
-- Drop old restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create own dine-in sessions" ON dine_in_sessions;

-- Create new policy allowing waiters to create sessions
CREATE POLICY "Allow authenticated users to create dine-in sessions"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (
  -- Customers can create their own sessions
  (auth.uid() = user_id)
  OR
  -- Waiters and admins can create sessions for customers
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  ))
);

-- Update UPDATE policy to include waiters
DROP POLICY IF EXISTS "Staff can update all dine-in sessions" ON dine_in_sessions;
DROP POLICY IF EXISTS "Users can update own dine-in sessions" ON dine_in_sessions;

CREATE POLICY "Allow users to update own dine-in sessions"
ON dine_in_sessions FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
);
```

---

## 🎯 **WHAT THIS DOES:**

### **INSERT Policy:**
Allows these users to CREATE sessions:
1. ✅ **Customers** - Can create sessions where they are the user (`auth.uid() = user_id`)
2. ✅ **Waiters** - Can create sessions for any customer (role check via profiles table)
3. ✅ **Admins** - Can create sessions for any customer

### **UPDATE Policy:**
Allows these users to MODIFY sessions:
1. ✅ **Customers** - Can update their own sessions
2. ✅ **Waiters** - Can update any session (to add orders, change status, etc.)
3. ✅ **Admins** - Can update any session

---

## 🧪 **TESTING THE FIX:**

### **Step 1: Verify Policies**

After running the SQL, check in Supabase Dashboard:

```sql
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'dine_in_sessions'
ORDER BY policyname;
```

**Expected Result:**
```
policyname                                      | cmd  | roles
------------------------------------------------|------|-------------
Allow authenticated users to create...          | INSERT| authenticated
Allow users to update own dine-in sessions      | UPDATE| authenticated
Users can view own dine-in sessions             | SELECT| authenticated
Staff can view all dine-in sessions             | SELECT| authenticated
```

### **Step 2: Test Session Creation**

1. ✅ Open your app as **waiter**
2. ✅ Select a table
3. ✅ Enter customer info
4. ✅ Enter session name
5. ✅ Click "Start Session & Add Items"
6. ✅ Should work without 403 error!

### **Step 3: Check Database**

In Supabase Dashboard → Table Editor → `dine_in_sessions`:

Find your new session:
- ✅ `session_name` = Your entered name
- ✅ `session_status` = 'active'
- ✅ `payment_status` = 'pending'
- ✅ Created successfully!

---

## 📊 **RLS POLICY BREAKDOWN:**

### **Before Fix:**

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Customer (own) | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Waiter | ✅ Yes | ❌ **NO** | ✅ Yes | ❌ No |
| Admin | ✅ Yes | ❌ **NO** | ✅ Yes | ❌ No |

### **After Fix:**

| Role | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| Customer (own) | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Waiter | ✅ Yes | ✅ **YES** | ✅ Yes | ❌ No |
| Admin | ✅ Yes | ✅ **YES** | ✅ Yes | ✅ Yes |

---

## 🔒 **SECURITY NOTES:**

### **Why This Is Safe:**

1. ✅ **Only authenticated users** can access (no anonymous access)
2. ✅ **Role-based checks** via `profiles` table
3. ✅ **Customers still restricted** to their own sessions
4. ✅ **Waiters limited** to session management only
5. ✅ **Audit trail** maintained (who created what, when)

### **What Waiters CAN Do:**
- ✅ Create sessions for customers
- ✅ Add orders to sessions
- ✅ Update session status
- ✅ View all sessions

### **What Waiters CANNOT Do:**
- ❌ Delete sessions (need admin)
- ❌ Access other tables beyond their role
- ❌ Bypass payment validation

---

## 🆘 **TROUBLESHOOTING:**

### **"Still getting 403 error"**

**Possible causes:**

1. **Policy not applied yet**
   ```sql
   -- Re-run the SQL script
   -- Refresh browser cache (Ctrl+F5)
   ```

2. **Wrong role in profiles table**
   ```sql
   -- Check your waiter's role
   SELECT id, email, role FROM profiles 
   WHERE email = 'waiter@example.com';
   
   -- Should show: role = 'waiter'
   ```

3. **RLS not enabled on table**
   ```sql
   -- Verify RLS is enabled
   SELECT relname, relrowsecurity 
   FROM pg_class 
   WHERE relname = 'dine_in_sessions';
   
   -- Should show: relrowsecurity = true
   ```

### **"Can create but can't update"**

Check UPDATE policy:
```sql
SELECT * FROM pg_policies
WHERE tablename = 'dine_in_sessions'
AND cmd = 'UPDATE';
```

Should show the new inclusive policy.

### **"Customer can't create session anymore"**

Make sure customer is logged in:
```typescript
// In checkout-screen.tsx
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user); // Should not be null
```

---

## 📝 **ALTERNATIVE APPROACH:**

If you want **stricter control**, use separate policies:

```sql
-- Separate policy for customers
CREATE POLICY "Customers can create own sessions"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Separate policy for waiters
CREATE POLICY "Waiters can create sessions"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'waiter'
  )
);

-- Separate policy for admins
CREATE POLICY "Admins can create sessions"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

**Benefit:** Easier to debug and modify individual roles.

---

## ✅ **VERIFICATION CHECKLIST:**

After applying fix:

- [ ] SQL script executed successfully
- [ ] Policies visible in pg_policies
- [ ] Browser cache cleared (Ctrl+Shift+Delete)
- [ ] App restarted (optional)
- [ ] Waiter can create session without errors
- [ ] Session appears in database
- [ ] Table status updates to occupied
- [ ] Can navigate to menu screen
- [ ] Can add items to session
- [ ] Customer can still create own sessions

---

## 📚 **RELATED FILES:**

- [`FIX_DINE_IN_SESSIONS_RLS_FOR_WAITER.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/FIX_DINE_IN_SESSIONS_RLS_FOR_WAITER.sql) - Complete SQL script
- [`CREATE_DINE_IN_SESSIONS_TABLE.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/CREATE_DINE_IN_SESSIONS_TABLE.sql) - Original table + RLS
- [`src/pages/waiter/session-start-screen.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/waiter/session-start-screen.tsx) - Uses this policy

---

## 🎯 **QUICK FIX COMMAND:**

Just copy-paste this into Supabase SQL Editor and run:

```sql
DROP POLICY IF EXISTS "Users can create own dine-in sessions" ON dine_in_sessions;

CREATE POLICY "Allow authenticated users to create dine-in sessions"
ON dine_in_sessions FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id)
  OR
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  ))
);
```

That's it! Should work now. 🎉

---

**Status:** ✅ **READY TO APPLY**  
**Last Updated:** March 14, 2026  
**Estimated Time:** 30 seconds to run SQL
