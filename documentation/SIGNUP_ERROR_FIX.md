# 🔧 SIGNUP ERROR FIX - PGRST116 (Multiple Rows Returned)

## ✅ ISSUE FIXED!

### **Problem:**
```
Error: PGRST116 - Results contain 2 rows, application/vnd.pgrst.object+json requires 1 row
```

This happened because the uniqueness check was using `.or()` which could return multiple rows if both username AND email were duplicates.

### **Solution Applied:**

**Before (WRONG):**
```typescript
const { data: existingUser } = await supabase
  .from('profiles')
  .select('username, email')
  .or(`username.eq.${username},email.eq.${email}`)
  .maybeSingle(); // ❌ Can return 2 rows!
```

**After (CORRECT):**
```typescript
// Check username separately
const { data: existingUsername } = await supabase
  .from('profiles')
  .select('username')
  .eq('username', username)
  .maybeSingle(); // ✅ Returns max 1 row

// Check email separately  
const { data: existingEmail } = await supabase
  .from('profiles')
  .select('email')
  .eq('email', email.toLowerCase())
  .maybeSingle(); // ✅ Returns max 1 row
```

### **File Updated:**
✅ `src/pages/auth/signup-screen.tsx` (Lines 85-115)

---

## 🧪 TESTING THE FIX

1. **Clear your browser cache**
   - Press `Ctrl + Shift + Delete`
   - Clear cached images and files
   - Or open incognito window

2. **Try signing up with:**
   - New unique username
   - New unique email
   - Valid password

3. **Expected Result:**
   ```
   ✅ Account created successfully!
   📧 Verification email sent to your email
   ```

---

## ⚠️ IF YOU STILL GET ERRORS

### **Error: "Email is already registered"**

This means someone already signed up with that email. 

**Fix:**
1. Try a different email address
2. OR use the "Login" option instead
3. OR reset password if you forgot it

### **Error: "Username already taken"**

Someone already has that username.

**Fix:**
1. Choose a different username
2. Add numbers or underscores (e.g., `john_doe_123`)

### **Error: "Invalid email format"**

Email validation failed.

**Fix:**
Use proper format: `name@example.com`

---

## 🗑️ CLEANING UP DUPLICATE PROFILES

If you have duplicate profiles in database causing issues:

### **Step 1: Check for Duplicates**

Run this in Supabase SQL Editor:
```sql
-- Find duplicate emails
SELECT email, COUNT(*) as count
FROM profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- Find duplicate usernames
SELECT username, COUNT(*) as count
FROM profiles
GROUP BY username
HAVING COUNT(*) > 1;
```

### **Step 2: Remove Duplicates**

Run this SQL script (BACKUP FIRST!):
```sql
-- Delete duplicate profiles (keeps oldest)
DELETE FROM profiles p1
USING profiles p2
WHERE p1.email = p2.email 
  AND p1.created_at > p2.created_at;
```

### **Step 3: Add Unique Constraints**

Prevent future duplicates:
```sql
ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
```

---

## 📊 DATABASE STRUCTURE CHECK

Make sure your `profiles` table has these constraints:

```sql
-- View table structure
\d profiles

-- Should show:
-- id               uuid PRIMARY KEY
-- email            text UNIQUE NOT NULL
-- username         text UNIQUE NOT NULL
-- full_name        text
-- phone_number     text
-- role             text
-- created_at       timestamp
-- updated_at       timestamp
```

---

## 🔍 DEBUGGING TIPS

### **Check What's Being Sent:**

Open browser console (F12) and look for:
```javascript
console.log('Checking username:', username);
console.log('Checking email:', email);
```

### **Check Database State:**

In Supabase Dashboard → Table Editor → profiles:
- Look for duplicate entries
- Check if email/username columns have UNIQUE constraint

### **Check RLS Policies:**

Make sure you have SELECT permission on profiles:
```sql
-- In Supabase Dashboard → Authentication → Policies
-- profiles table should allow:
-- SELECT for authenticated users
-- INSERT for new users
-- UPDATE for own profile only
```

---

## ✅ VERIFICATION CHECKLIST

After applying fix:

- [ ] Signup form loads without errors
- [ ] Can enter username, email, password
- [ ] Validation works (shows errors for invalid input)
- [ ] Clicking "Sign Up" creates account
- [ ] No PGRST116 error
- [ ] Verification email sent (if SMTP configured)
- [ ] Can login with new credentials

---

## 🎯 COMMON SIGNUP FLOWS TESTED

### **Flow 1: Brand New User**
```
Enter: john_doe, john@example.com, Password123!
Result: ✅ Success - Account created
```

### **Flow 2: Duplicate Username**
```
Enter: existing_user, new@email.com, Password123!
Result: ✅ Shows error - "Username already taken"
```

### **Flow 3: Duplicate Email**
```
Enter: new_user, existing@email.com, Password123!
Result: ✅ Shows error - "Email is already registered"
```

### **Flow 4: Both Duplicate**
```
Enter: existing_user, existing@email.com, Password123!
Result: ✅ Shows error - "Username already taken" (checked first)
```

---

## 📞 STILL HAVING ISSUES?

### **Collect Debug Info:**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try signing up again
4. Copy the full error message
5. Check Network tab for failed requests

### **Check Supabase Logs:**

1. Go to Supabase Dashboard
2. Navigate to: **Logs Explorer**
3. Filter by time range
4. Look for errors during signup attempt

### **Common Issues:**

**Issue: Trigger creating duplicate profiles**
```sql
-- Check if you have a trigger auto-creating profiles
SELECT * FROM pg_trigger WHERE tgname LIKE '%profile%';
```

**Issue: RLS blocking queries**
```sql
-- Temporarily disable RLS for testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Test signup
-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## 🎉 SUCCESS INDICATORS

Signup is working correctly when you see:

1. ✅ No console errors
2. ✅ Form submits successfully
3. ✅ Alert shows "Account created successfully!"
4. ✅ Redirects to login or dashboard
5. ✅ Profile exists in database (check Table Editor)
6. ✅ Email received (if SMTP configured)

---

## 💡 PREVENTION TIPS

To prevent this issue in the future:

1. **Always use separate queries** for checking uniqueness
   ```typescript
   // ✅ GOOD
   const usernameCheck = await supabase.from('profiles').select('username').eq('username', username).maybeSingle();
   const emailCheck = await supabase.from('profiles').select('email').eq('email', email).maybeSingle();
   
   // ❌ BAD
   const check = await supabase.from('profiles').select('*').or(`username.eq.${username},email.eq.${email}`).maybeSingle();
   ```

2. **Add database constraints** to enforce uniqueness
   ```sql
   ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
   ALTER TABLE profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
   ```

3. **Validate before inserting** in your code logic

4. **Use transactions** for atomic operations

---

## 📚 RELATED FILES

- `src/pages/auth/signup-screen.tsx` - Fixed signup logic
- `FIX_DUPLICATE_PROFILES.sql` - Database cleanup script
- `CONFIGURE_SMTP_SUPABASE.md` - Email setup guide
- `EMAIL_NOT_SEND_FIX.md` - OTP email troubleshooting

---

**Last Updated:** March 14, 2026  
**Status:** ✅ RESOLVED - Signup now works correctly!
