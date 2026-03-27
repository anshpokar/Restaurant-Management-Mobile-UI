# ✅ CORRECT SQL SYNTAX FOR RLS POLICIES

## ❌ WRONG (PostgreSQL doesn't support this):

```sql
CREATE POLICY IF NOT EXISTS "policy_name"  -- ❌ SYNTAX ERROR!
ON profiles FOR SELECT
TO authenticated
USING (true);
```

**Error:** `syntax error at or near "NOT"`

---

## ✅ CORRECT (Drop first, then create):

```sql
-- Drop if exists first
DROP POLICY IF EXISTS "policy_name" ON profiles;

-- Then create
CREATE POLICY "policy_name"
ON profiles FOR SELECT
TO authenticated
USING (true);
```

**This works!** ✅

---

## 📋 WHY?

PostgreSQL's `CREATE POLICY` statement **does not support** `IF NOT EXISTS`.

Unlike `CREATE TABLE` or `CREATE INDEX`, you must:
1. Drop the policy first (if it might exist)
2. Then create it fresh

---

## 🎯 PATTERN TO USE

### For Idempotent Scripts (can run multiple times):

```sql
DO $$ BEGIN
  -- Drop all variations of the policy
  DROP POLICY IF EXISTS "policy_name" ON profiles;
  DROP POLICY IF EXISTS "Policy Name" ON profiles;  -- Case variations
  DROP POLICY IF EXISTS "POLICY_NAME" ON profiles;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Create fresh
CREATE POLICY "policy_name"
ON profiles FOR SELECT
TO authenticated
USING (true);
```

---

## 🚀 QUICK REFERENCE

### Common Policy Patterns:

#### 1. View Own Profile
```sql
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
CREATE POLICY "Users view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);
```

#### 2. Update Own Profile
```sql
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

#### 3. View All Profiles (for waiters)
```sql
DROP POLICY IF EXISTS "Authenticated users view all profiles" ON profiles;
CREATE POLICY "Authenticated users view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);
```

#### 4. Insert Own Profile (signup)
```sql
DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
```

---

## 🔍 DEBUGGING TIPS

### If you get syntax error:

**Check for:**
- ❌ `CREATE POLICY IF NOT EXISTS` → Remove `IF NOT EXISTS`
- ❌ Missing `ON table_name` → Add it
- ❌ Missing `TO role` → Add `TO authenticated`
- ❌ Missing `USING (...)` → Add condition

### Correct Structure:

```sql
CREATE POLICY "policy_name"           -- Name
ON table_name                          -- Table
FOR SELECT | INSERT | UPDATE | DELETE -- Operation
TO authenticated                       -- Role
USING (...)                            -- Condition
[WITH CHECK (...)]                     -- For UPDATE/INSERT
```

---

## 📝 EXAMPLES FROM YOUR PROJECT

### ✅ Good: Waiter Can View Profiles
```sql
DROP POLICY IF EXISTS "Allow waiters to view profiles" ON profiles;
CREATE POLICY "Allow waiters to view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);  -- Simple, no recursion
```

### ❌ Bad: Causes Recursion
```sql
DROP POLICY IF EXISTS "Allow waiters to view profiles" ON profiles;
CREATE POLICY "Allow waiters to view profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p2  -- ❌ Self-reference = recursion!
    WHERE p2.id = auth.uid()
    AND p2.role = 'waiter'
  )
);
```

---

## 🎯 BEST PRACTICES

1. **Always drop before create** when writing migration scripts
2. **Use simple USING conditions** to avoid recursion
3. **Test policies** after creating them
4. **Document what each policy does**
5. **Keep policies idempotent** (safe to run multiple times)

---

## 🧪 TESTING POLICIES

After creating policies, test them:

```sql
-- Test as authenticated user
SET ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'user-uuid-here';

-- Should work
SELECT * FROM profiles WHERE id = current_setting('request.jwt.claims.sub')::uuid;

-- Reset
RESET ROLE;
```

---

## ✅ SUMMARY

**Do This:**
```sql
DROP POLICY IF EXISTS "name" ON table;
CREATE POLICY "name" ON table FOR ...;
```

**Not This:**
```sql
CREATE POLICY IF NOT EXISTS "name" ON table FOR ...;  -- ❌ Doesn't work!
```

**Remember:** PostgreSQL `CREATE POLICY` ≠ `CREATE TABLE`  
No `IF NOT EXISTS` support!

---

**Status:** Syntax corrected in all files! ✅
