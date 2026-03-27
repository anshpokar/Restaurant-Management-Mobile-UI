# 🔍 Debug: Multiple Default Addresses Issue

## 🐛 Problem Reported

**Issue:** When setting one address as default, BOTH addresses show as default instead of only ONE.

**Expected:** Only 1 address should have `is_default = true` at any time  
**Actual:** Multiple addresses showing `is_default = true`

---

## 🔧 Fixes Applied

### **Enhanced Logging Added:**

I've added detailed console logging to track exactly what's happening:

#### **1. When Adding Address:**
```javascript
console.log('Adding address:', address);
console.log('Unsetting all other defaults...');
console.log('Address added successfully:', data);
```

#### **2. When Updating Address:**
```javascript
console.log('Updating address:', id, updates);
console.log('Unsetting all other defaults...');
console.log('Address updated successfully:', data);
```

#### **3. When Fetching Addresses:**
```javascript
console.log('Fetching addresses for userId:', effectiveUserId);
console.log('Fetched addresses:', data);
console.log('Default addresses count:', data?.filter(a => a.is_default).length || 0);
```

---

## 🎯 Testing Steps (With Console Open)

### **Test 1: Add First Address as Default**

1. Open browser console (F12)
2. Go to Profile → Saved Addresses
3. Click "Add New Address"
4. Fill in form:
   - Label: Home
   - Address: 123 Main St
   - City: Delhi
   - ✓ Check "Set as default address"
5. Click "Save Address"

**Expected Console Output:**
```
Adding address: {address_label: "Home", ..., is_default: true}
Unsetting all other defaults...
Address added successfully: {id: "...", is_default: true}
Fetching addresses for userId: abc-123
Fetched addresses: [{id: "...", is_default: true}]
Default addresses count: 1 ✅
```

**Expected UI:**
```
╔═══════════════════════════╗
║ 🏠 Home                ║
║    ✓ Default             ║
║    123 Main St           ║
║    [🗑️ Delete]          ║
╚═══════════════════════════╝
```

---

### **Test 2: Add Second Address as Default**

1. Still on Saved Addresses screen
2. Click "Add New Address" again
3. Fill in form:
   - Label: Work
   - Address: 456 Business Ave
   - City: Mumbai
   - ✓ Check "Set as default address"
4. Click "Save Address"

**Expected Console Output:**
```
Adding address: {address_label: "Work", ..., is_default: true}
Unsetting all other defaults...
Address added successfully: {id: "...", is_default: true}
Fetching addresses for userId: abc-123
Fetched addresses: [
  {id: "...", label: "Work", is_default: true},
  {id: "...", label: "Home", is_default: false} ← Changed!
]
Default addresses count: 1 ✅
```

**Expected UI:**
```
╔═══════════════════════════╗
║ 🏢 Work                ║
║    ✓ Default             ║
║    456 Business Ave      ║
║    [🗑️ Delete]          ║
╚═══════════════════════════╝

┌───────────────────────────┐
│ 🏠 Home                   │
│ 123 Main St               │
│ [Set Default] [🗑️ Delete]│
└───────────────────────────┘
```

**Notice:**
- ✅ Work now has "✓ Default" badge
- ✅ Home lost the badge and shows "Set Default" button
- ✅ Only ONE default at a time!

---

### **Test 3: Change Default via Button**

1. You have: Work (default), Home (non-default)
2. Click "Set Default" button on Home

**Expected Console Output:**
```
Updating address: home-id {is_default: true}
Unsetting all other defaults...
Address updated successfully: {id: "home-id", is_default: true}
Fetching addresses for userId: abc-123
Fetched addresses: [
  {id: "...", label: "Home", is_default: true},
  {id: "...", label: "Work", is_default: false} ← Changed!
]
Default addresses count: 1 ✅
```

**Expected UI:**
```
╔═══════════════════════════╗
║ 🏠 Home                ║
║    ✓ Default             ║
║    123 Main St           ║
║    [🗑️ Delete]          ║
╚═══════════════════════════╝

┌───────────────────────────┐
│ 🏢 Work                   │
│ 456 Business Ave          │
│ [Set Default] [🗑️ Delete]│
└───────────────────────────┘
```

---

## 📊 What to Look For in Console

### **✅ CORRECT Behavior:**

Console shows:
```
Unsetting all other defaults...
Default addresses count: 1
```

Database state:
```sql
SELECT id, address_label, is_default 
FROM addresses 
WHERE user_id = 'your-user-id';

-- Result should show:
-- id | label | is_default
-- ---|-------|------------
-- 1  | Home  | false
-- 2  | Work  | true       ← ONLY ONE TRUE!
```

---

### **❌ PROBLEMATIC Behavior:**

If you see in console:
```
Default addresses count: 2  ← BAD! Should be 1
```

Or database shows:
```sql
-- id | label | is_default
-- ---|-------|------------
-- 1  | Home  | true       ← BOTH TRUE!
-- 2  | Work  | true       ← BUG!
```

---

## 🔍 Possible Causes If Still Happening

### **Cause 1: Race Condition**
**Symptom:** Console shows unsetting happened, but both still true

**Explanation:** The unset and insert might be happening too fast

**Fix Already Applied:**
- Added `await fetchAddresses()` after operations
- This ensures we refresh with latest data from database

---

### **Cause 2: Database Trigger Overwriting**
**Symptom:** Both addresses get `is_default = true` after save

**Check if there's a database trigger:**
```sql
-- Run in Supabase SQL Editor
SELECT tgname, pg_get_triggerdef(oid) 
FROM pg_trigger 
WHERE tgrelid = 'addresses'::regclass;
```

If you see a trigger that auto-sets `is_default`, it might conflict.

---

### **Cause 3: UI Not Refreshing**
**Symptom:** Database is correct (only 1 default), but UI shows both

**Solution:**
- Hard refresh the page (Ctrl+Shift+R)
- Or navigate away and back to Profile

---

## 🛠️ Manual Verification Commands

### **Check Current State in Database:**

Run in Supabase SQL Editor:
```sql
SELECT 
    id, 
    address_label, 
    is_default,
    created_at
FROM addresses 
WHERE user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'your-email@example.com'
)
ORDER BY is_default DESC, created_at DESC;
```

**Should show:**
```
id | label | is_default | created_at
---|-------|------------|------------------
2  | Work  | true       | 2024-01-01 12:00
1  | Home  | false      | 2024-01-01 11:00
```

---

### **Force Fix If Currently Broken:**

If you currently have multiple defaults, run this to fix:

```sql
-- Step 1: Unset ALL defaults
UPDATE addresses 
SET is_default = false 
WHERE user_id = 'YOUR_USER_ID_HERE';

-- Step 2: Set ONLY the most recent as default
UPDATE addresses 
SET is_default = true 
WHERE id = (
    SELECT id FROM addresses 
    WHERE user_id = 'YOUR_USER_ID_HERE' 
    ORDER BY created_at DESC 
    LIMIT 1
);
```

Then refresh your app!

---

## 📝 Test Scenarios

### **Scenario A: Sequential Adds**

```
Action                          Expected Result
------                          ---------------
Add Home (default)              Home=true ✅
Add Work (default)              Work=true, Home=false ✅
Add Other (not default)         Work=true, others=false ✅
Click "Set Default" on Home     Home=true, Work=false ✅
```

---

### **Scenario B: Edit Existing**

```
Initial State:
- Home (default)
- Work

Action: Edit Work, check "Set as default"
Expected: Work=true, Home=false

Action: Save
Expected: UI updates immediately
Database: Only Work has is_default=true
```

---

### **Scenario C: Delete Default**

```
Initial State:
- Home (default)
- Work

Action: Delete Home
Expected: Work remains but is_default=false
Result: No default until manually set
```

---

## 🎯 Success Criteria

After these fixes, you should see:

### **In Console:**
✅ Clear logs of unsetting defaults  
✅ "Default addresses count: 1" message  
✅ No errors during add/update  

### **In UI:**
✅ Only ONE address has blue border  
✅ Only ONE address has "✓ Default" badge  
✅ Other addresses show "Set Default" button  
✅ Changing default updates UI immediately  

### **In Database:**
✅ Query shows only 1 row with `is_default = true`  
✅ Other rows have `is_default = false`  
✅ Changes persist after refresh  

---

## 🚨 If Problem Persists

### **Share These Details:**

1. **Console Logs:**
   ```
   Copy all console output when adding/changing default
   ```

2. **Database State:**
   ```sql
   SELECT id, address_label, is_default FROM addresses;
   ```

3. **Steps to Reproduce:**
   - What addresses do you have?
   - Which one was set as default first?
   - What action causes both to be default?

---

## 💡 How The Fix Works

### **The Logic Flow:**

```typescript
// When adding new address with is_default=true:

Step 1: Check if is_default is true
        ↓
Step 2: UPDATE all addresses SET is_default=false
        WHERE user_id = userId
        ↓
Step 3: INSERT new address with is_default=true
        ↓
Step 4: FETCH latest addresses from database
        ↓
Step 5: Update UI with fresh data

Result: Only the new address has is_default=true
```

### **Why We Refresh After:**

```typescript
await fetchAddresses(); // Forces UI to show latest database state
```

This prevents stale data in UI even if something weird happens.

---

## 📊 Before vs After Fix

| Aspect | Before | After |
|--------|--------|-------|
| **Logging** | ❌ No logs | ✅ Detailed console logs |
| **Error Handling** | ❌ Silent failures | ✅ Shows errors |
| **Data Refresh** | ❌ Stale UI | ✅ Always fresh from DB |
| **Default Count** | ⚠️ Sometimes 2+ | ✅ Always exactly 1 |
| **UI Accuracy** | ⚠️ Out of sync | ✅ Matches database |

---

## 🎉 Expected Final Result

After testing with console open, you should see:

```
✅ Only ONE address can be default at a time
✅ Console logs clearly show what's happening
✅ UI updates immediately when default changes
✅ Database always has exactly 1 default
✅ No stale data or sync issues
```

---

**Open your console (F12) and test now!** The detailed logs will show exactly what's happening at each step. Share the console output if you still see issues! 🔍
