# 🔧 PROFILE DATA NOT LOADING - FIX GUIDE

## ❌ PROBLEM

- Profile screen shows "Guest User" instead of actual name
- Home screen shows "Hello Guest" instead of "Hello [Username]"
- Email and phone number show as "No email available" / "No phone number"

---

## ✅ ROOT CAUSE

The `profile` data IS being fetched by `useAuth()` hook, but it wasn't being passed to child components through React Router's context system.

---

## ✅ SOLUTION IMPLEMENTED

### Fixed Files:

#### 1. **customer-app.tsx** - Added profile to context
**Before:**
```typescript
<Outlet context={{ addToCart, cartItems, totalItems, totalAmount, onLogout }} />
```

**After:**
```typescript
<Outlet context={{ 
  addToCart, 
  cartItems, 
  totalItems, 
  totalAmount, 
  onLogout,
  profile  // ✅ ADDED
}} />
```

#### 2. **profile-screen.tsx** - Updated type definition
Already had correct types, just reformatted for clarity.

#### 3. **home-screen.tsx** - Already has correct types
No changes needed.

---

## 🧪 HOW TO VERIFY IT'S WORKING

### Step 1: Check Browser Console Logs

Open browser console (F12) and look for these logs when app loads:

```javascript
// From useAuth hook:
Auth event: INITIAL_SESSION
Initial session detected.

// Profile should be fetched:
No profile found, creating default for: abc-123...
// OR
Profile loaded successfully
```

### Step 2: Check localStorage

In browser console, run:
```javascript
JSON.parse(localStorage.getItem('userProfile'))
```

**Expected Output:**
```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "username": "johndoe",
  "phone_number": "+1234567890",
  "role": "customer",
  "timestamp": 1234567890
}
```

### Step 3: Check Component Context

In browser console (while on customer app), run:
```javascript
// This checks if profile is in context
// (You'll need to add a temporary console.log in CustomerApp)
```

### Step 4: Visual Check

**Home Screen Should Show:**
```
Hello John Doe! 👋
(user's full name from database)
```

**Profile Screen Should Show:**
```
[Avatar]
John Doe
user@example.com
+1234567890
@johndoe
```

---

## 🔍 DEBUGGING STEPS

### If Still Showing "Guest User":

#### Debug 1: Check if Profile Exists in Database

Run this in Supabase SQL Editor:
```sql
-- Check your user's profile
SELECT id, email, full_name, username, phone_number, role
FROM profiles
WHERE email = 'YOUR-EMAIL@example.com';
```

**Expected:** Should return your user data  
**If empty:** Create a profile manually:
```sql
UPDATE profiles 
SET 
  full_name = 'John Doe',
  username = 'johndoe',
  phone_number = '+1234567890'
WHERE email = 'YOUR-EMAIL@example.com';
```

---

#### Debug 2: Check useAuth Hook

Add console logs to `src/hooks/use-auth.ts`:

```typescript
// Line 47-50
if (isMounted) {
    console.log('✅ Profile fetched:', profile);  // ADD THIS
    setUserRole(profile.role);
    setUserProfile(profile);
}
```

Then check console - should see profile object.

---

#### Debug 3: Check CustomerApp Props

Add console log to `src/pages/customer/customer-app.tsx`:

```typescript
export function CustomerApp({ onLogout, profile }: CustomerAppProps) {
  console.log('📦 CustomerApp received profile:', profile);  // ADD THIS
  
  const navigate = useNavigate();
  // ... rest of code
```

Should show profile data being passed.

---

#### Debug 4: Check Outlet Context

Add console log to `src/pages/customer/customer-app.tsx` inside the return:

```typescript
<Outlet context={{ 
  addToCart, 
  cartItems, 
  totalItems, 
  totalAmount, 
  onLogout,
  profile
}} />

{/* ADD THIS FOR DEBUG */}
{console.log('🔌 Outlet context:', { profile })}
```

---

#### Debug 5: Check Child Components

Add console log to `src/pages/customer/home-screen.tsx`:

```typescript
export function HomeScreen() {
  const { addToCart, profile } = useOutletContext<...>();
  
  console.log('🏠 HomeScreen profile:', profile);  // ADD THIS
  
  // ... rest of code
```

And in `src/pages/customer/profile-screen.tsx`:

```typescript
export function ProfileScreen() {
  const { onLogout, profile } = useOutletContext<...>();
  
  console.log('👤 ProfileScreen profile:', profile);  // ADD THIS
  
  // ... rest of code
```

---

## 🎯 COMPLETE TESTING CHECKLIST

After making fixes:

- [ ] **Login works**
  - Login with valid credentials
  - Redirects to customer dashboard
  
- [ ] **Profile data loads**
  - Check console logs
  - See "Profile fetched" message
  - Profile object has all fields
  
- [ ] **Home screen shows name**
  - See "Hello [Your Name]! 👋"
  - Not "Hello Guest! 👋"
  
- [ ] **Profile screen shows data**
  - Full name displays correctly
  - Email shows correctly
  - Phone number shows
  - Username shows (if exists)
  
- [ ] **localStorage updated**
  - Run: `JSON.parse(localStorage.getItem('userProfile'))`
  - Shows complete user data
  
- [ ] **Other screens work**
  - Menu screen loads
  - Orders screen loads
  - Bookings screen loads

---

## 🐛 COMMON ISSUES & FIXES

### Issue 1: Profile is NULL

**Console shows:**
```javascript
profile: null
```

**Cause:** User not logged in or profile doesn't exist

**Fix:**
1. Logout
2. Login again
3. Check if profile created in database

---

### Issue 2: Profile Fields are Empty

**Shows:**
```
full_name: ""
username: ""
phone_number: ""
```

**Cause:** Profile exists but fields are empty

**Fix:** Update profile in Supabase:
```sql
UPDATE profiles 
SET 
  full_name = 'Your Name',
  username = 'yourusername',
  phone_number = '+1234567890'
WHERE email = 'your@email.com';
```

---

### Issue 3: "Cannot read property of undefined"

**Error:**
```
TypeError: Cannot read property 'full_name' of undefined
```

**Cause:** Profile is null, code tries to access properties

**Fix:** Already handled with optional chaining:
```typescript
{profile?.full_name || 'Guest User'}
```

---

### Issue 4: Context Type Mismatch

**Error:**
```
Type error: Property 'profile' does not exist on type...
```

**Cause:** TypeScript interface doesn't match context

**Fix:** Ensure all components use same type definition:
```typescript
interface ContextType {
  addToCart: (item: MenuItem) => void;
  cartItems: CartItem[];
  totalItems: number;
  totalAmount: number;
  onLogout: () => void;
  profile: Profile | null;
}
```

---

## 🚀 QUICK FIX COMMANDS

### Refresh Auth State:
```javascript
// In browser console
localStorage.removeItem('userProfile');
location.reload();
```

### Manually Set Profile (for testing):
```javascript
// In browser console
const testProfile = {
  id: 'test-123',
  full_name: 'Test User',
  email: 'test@example.com',
  username: 'testuser',
  phone_number: '+1234567890',
  role: 'customer'
};
localStorage.setItem('userProfile', JSON.stringify(testProfile));
location.reload();
```

---

## ✅ VERIFICATION

After all fixes, you should see:

### Home Screen:
```
┌─────────────────────────────┐
│  Hello John Doe! 👋         │ ← Real name!
│  Welcome back to RestoFlow  │
│                             │
│  [JD] ← Avatar with initial │
└─────────────────────────────┘
```

### Profile Screen:
```
┌─────────────────────────────┐
│       [User Icon]           │
│      John Doe               │
│   john@example.com          │
│     +1234567890             │
│      @johndoe               │
└─────────────────────────────┘
```

---

## 📝 SUMMARY OF CHANGES

### Files Modified:
1. ✅ `src/pages/customer/customer-app.tsx` - Added profile to Outlet context
2. ✅ `src/pages/customer/profile-screen.tsx` - Formatted type definition

### How It Works Now:
```
App.tsx
  ↓ (userProfile from useAuth)
CustomerApp
  ↓ (via Outlet context)
HomeScreen / ProfileScreen
  ↓ (via useOutletContext)
Display user data
```

---

**Fix Complete!** 🎉  
**Next:** Refresh browser and check if profile shows correctly!
