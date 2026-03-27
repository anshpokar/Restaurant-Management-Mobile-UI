# 🔍 Debug Guide - userProfile is null

## ❓ Why You're Seeing `null` or `undefined`

When you run:
```javascript
console.log(JSON.parse(localStorage.getItem('userProfile')));
```

And get `null`, it means:

### **Possible Reasons:**

1. **You haven't logged in yet** ⚠️
   - The userProfile only exists after successful login
   - Solution: Login first!

2. **localStorage was cleared** 🗑️
   - Browser cache/cookies cleared
   - Incognito/private mode
   - Solution: Login again

3. **Different browser/device** 💻📱
   - localStorage is per-browser
   - Solution: Login on this browser too

4. **Login didn't complete** ❌
   - Auth flow interrupted
   - Solution: Try logging in again

---

## ✅ Quick Fix Steps

### **Option 1: Login Normally (Recommended)**

1. Go to http://localhost:5174/login
2. Enter your email and password
3. Click "Sign In"
4. After redirect, run in console:
   ```javascript
   console.log(JSON.parse(localStorage.getItem('userProfile')));
   ```
5. Should see your user data! ✅

---

### **Option 2: Check Current Auth Status**

Run this in console to see if you're already logged in:

```javascript
// Check Supabase session
const { data, error } = await supabase.auth.getSession();
console.log('Session:', data?.session);
console.log('User:', data?.session?.user);
console.log('Error:', error);
```

**If you have a session but no localStorage:**
- The auth hook should automatically populate it
- Wait a moment and check again

**If no session:**
- You need to login

---

### **Option 3: Manual Test (Force Store Data)**

If you want to test the system works, manually store test data:

```javascript
// Get current user from Supabase
const { data } = await supabase.auth.getSession();

if (data?.session?.user) {
  // Create user data object
  const userData = {
    id: data.session.user.id,
    email: data.session.user.email || 'test@example.com',
    full_name: data.session.user.user_metadata?.full_name || 'Test User',
    username: data.session.user.user_metadata?.username || 'testuser',
    phone_number: data.session.user.user_metadata?.phone_number || '+91 9876543210',
    role: 'customer'
  };
  
  // Store in localStorage
  localStorage.setItem('userProfile', JSON.stringify(userData));
  
  console.log('✅ Manually stored user data!');
  console.log('Verify:', JSON.parse(localStorage.getItem('userProfile')));
} else {
  console.log('❌ No active Supabase session. Please login first.');
}
```

Then refresh and check if features work!

---

## 🎯 Expected Behavior

### **After Successful Login:**

Console output should be:
```javascript
{
  id: "abc123-def456-ghi789",
  email: "your@email.com",
  full_name: "Your Name",
  username: "yourname",
  phone_number: "+91 9876543210",
  role: "customer"
}
```

### **Before Login:**

Console output:
```javascript
null  // This is normal!
```

---

## 🔧 Troubleshooting

### **Issue: "I logged in but still getting null"**

**Check these:**

1. **Did login complete successfully?**
   ```javascript
   const { data } = await supabase.auth.getSession();
   console.log('Has session?', !!data?.session);
   ```

2. **Is localStorage working?**
   ```javascript
   try {
     localStorage.setItem('test', 'value');
     console.log('localStorage works:', localStorage.getItem('test'));
     localStorage.removeItem('test');
   } catch (e) {
     console.error('localStorage blocked:', e);
   }
   ```

3. **Are you in incognito mode?**
   - Incognito clears localStorage on close
   - Use normal browsing mode

4. **Browser settings blocking storage?**
   - Check if 3rd party cookies are blocked
   - Enable localStorage in browser settings

---

## 📊 Test All Features

Once you see valid user data in localStorage, test everything:

### **Test 1: Profile Display**
Go to Profile screen → Should show your name, email, phone ✅

### **Test 2: Save Address**
Profile → Saved Addresses → Add address → Should save ✅

### **Test 3: Favorites**
Should load without errors ✅

### **Test 4: Notifications**
Should show notification count ✅

---

## 🐛 Common Scenarios

### **Scenario A: Fresh Start**
```
Status: Never logged in
Solution: Just login normally
Expected: userProfile appears after login
```

### **Scenario B: Cleared Cache**
```
Status: Was logged in, cleared browser data
Solution: Login again
Expected: userProfile recreated
```

### **Scenario C: Multiple Browsers**
```
Status: Logged in Chrome, checking Firefox
Solution: Login in each browser separately
Expected: Each browser has its own localStorage
```

### **Scenario D: Session Expired**
```
Status: Old session, came back later
Solution: Re-login
Expected: New userProfile created
```

---

## ✨ Success Indicators

You'll know everything is working when:

✅ `localStorage.getItem('userProfile')` returns valid JSON string  
✅ `JSON.parse(...)` shows your actual user data  
✅ Profile screen displays your information  
✅ Can save addresses successfully  
✅ Favorites load and work  
✅ Notifications show count  

---

## 🆘 Still Getting Null?

If you've tried everything and still getting null:

1. **Open DevTools Console (F12)**
2. **Run complete diagnostic:**
   ```javascript
   console.group('Auth Diagnostic');
   console.log('1. localStorage keys:', Object.keys(localStorage));
   console.log('2. userProfile value:', localStorage.getItem('userProfile'));
   
   const { data } = await supabase.auth.getSession();
   console.log('3. Has Supabase session:', !!data?.session);
   console.log('4. User ID:', data?.session?.user?.id);
   console.log('5. User email:', data?.session?.user?.email);
   console.groupEnd();
   ```

3. **Share the output** - I can help diagnose further!

---

## 🎯 Quick Reference

| Output | Meaning | Action |
|--------|---------|--------|
| `null` | Not logged in or cleared | Login |
| `{...}` with data | Working correctly | ✅ All good |
| `undefined` | Code error | Check console for errors |
| Parse error | Corrupted data | Clear and login again |

---

**Remember:** The app now auto-clears stale localStorage when there's no active session, so you should always have valid data when logged in! 🚀
