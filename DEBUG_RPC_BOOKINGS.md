# 🔍 DEBUGGING RPC FUNCTION OUTPUT - "undefined" booking ID

## 📋 PROBLEM

The admin bookings screen is showing:
```
❌ Invalid booking ID: undefined
```

This means the RPC functions are not returning data with the expected structure.

---

## 🎯 DIAGNOSTIC STEPS

### Step 1: Check Console Logs

Open browser console (F12) and look for these logs when loading `/admin/bookings`:

```javascript
📦 Fetched bookings: 5
📋 First booking sample: {...}
🔑 First booking ID: undefined  ← PROBLEM!
🏷️ First booking keys: [...]
```

**What to check:**
- Is `booking.id` actually present?
- What keys does the object have?
- Is the data structure different than expected?

---

### Step 2: Test RPC Functions Directly in Supabase SQL Editor

Run these queries to see what the functions return:

```sql
-- Test 1: Get all bookings
SELECT * FROM get_all_bookings_with_details() LIMIT 3;

-- Check if 'id' column exists
-- Expected: Should show UUID values
```

```sql
-- Test 2: Check column names
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'get_all_bookings_with_details';
```

```sql
-- Test 3: Check function definition
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'get_all_bookings_with_details';
```

---

### Step 3: Verify Function Returns Proper Structure

The function should return a table with these columns:

```sql
RETURNS TABLE (
  id UUID,                    ← MUST EXIST
  user_id UUID,
  table_id UUID,
  booking_date DATE,
  booking_time TIME,
  guests_count INTEGER,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  phone_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  occasion TEXT,
  special_requests TEXT,
  booking_duration INTEGER,
  restaurant_table JSONB
)
```

If `id` is missing from the RETURNS TABLE definition, that's the problem!

---

## 🔧 LIKELY CAUSES & FIXES

### Cause 1: RPC Function Not Created Yet

**Symptom:** Error says function doesn't exist or returns empty array

**Fix:**
1. Run `CREATE_BOOKINGS_RPC_FUNCTIONS.sql` in Supabase SQL Editor
2. Verify with: `SELECT * FROM get_all_bookings_with_details();`

---

### Cause 2: Function Returns Different Structure

**Symptom:** Data comes back but without `id` field

**Check:**
```sql
-- See actual returned structure
SELECT jsonb_each(to_jsonb(get_all_bookings_with_details())) 
LIMIT 5;
```

**Fix:** Recreate function with proper RETURNS TABLE clause including `id UUID`

---

### Cause 3: RLS Policy Blocking Access

**Symptom:** Empty array returned or permission error

**Check:**
```sql
-- Try as postgres superuser (should work)
-- If this works but app doesn't, it's RLS
SELECT * FROM get_all_bookings_with_details();
```

**Fix:** Add RLS policy:

```sql
-- Enable RLS on table_bookings
ALTER TABLE table_bookings ENABLE RLS;

-- Allow authenticated users to view bookings
CREATE POLICY "Allow authenticated users to view bookings"
ON table_bookings FOR SELECT
TO authenticated
USING (true);

-- Allow admins to update bookings
CREATE POLICY "Allow admins to update bookings"
ON table_bookings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
```

---

### Cause 4: Function Name Mismatch

**Symptom:** Calling wrong function name

**Check what's being called:**
```typescript
// In admin-bookings-screen.tsx line ~46
query = supabase.rpc('get_all_bookings_with_details');
```

**Verify function exists:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_all_bookings_with_details';
```

**If returns 0 rows:** Function doesn't exist - run the SQL script!

---

## 🧪 TESTING WORKFLOW

### Test 1: Direct SQL Call
```sql
-- Should return booking data with id field
SELECT id, customer_name, status 
FROM get_all_bookings_with_details() 
LIMIT 5;
```

✅ **Expected:** Rows with UUIDs  
❌ **If fails:** Function issue

---

### Test 2: Browser Console Test
```javascript
// In browser console after page loads
const { data } = await supabase.rpc('get_all_bookings_with_details');
console.log('Data:', data);
console.log('First ID:', data[0]?.id);
```

✅ **Expected:** Valid UUID  
❌ **If undefined:** Data structure issue

---

### Test 3: Component Rendering
```javascript
// Look for these logs in console:
📦 Fetched bookings: 5          ← Should show count
📋 First booking sample: {...}   ← Should show object
🔑 First booking ID: uuid-here  ← Should show UUID
🏷️ First booking keys: [...]    ← Should include 'id'
```

✅ **All logs present:** Working  
❌ **Missing/undefined:** Debug further

---

## 📊 EXPECTED DATA STRUCTURE

When RPC function works correctly:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "table_id": "770e8400-e29b-41d4-a716-446655440002",
  "booking_date": "2026-03-15",
  "booking_time": "19:00:00",
  "guests_count": 4,
  "status": "pending",
  "created_at": "2026-03-14T10:30:00Z",
  "updated_at": "2026-03-14T10:30:00Z",
  "phone_number": "+1234567890",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "occasion": "birthday",
  "special_requests": "Window seat please",
  "booking_duration": 90,
  "restaurant_table": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "table_number": 5,
    "capacity": 4,
    "status": "reserved"
  }
}
```

**Key points:**
- ✅ `id` field exists and is a valid UUID
- ✅ All other fields present
- ✅ `restaurant_table` is JSONB object

---

## 🎯 QUICK FIX SCRIPT

If nothing works, recreate everything:

```sql
-- Drop existing functions
DROP FUNCTION IF EXISTS get_all_bookings_with_details();
DROP FUNCTION IF EXISTS get_todays_bookings();
DROP FUNCTION IF EXISTS get_upcoming_bookings();
DROP FUNCTION IF EXISTS get_pending_bookings_count();
DROP FUNCTION IF EXISTS get_bookings_statistics();

-- Recreate from CREATE_BOOKINGS_RPC_FUNCTIONS.sql
-- (Copy entire content and run)
```

Then verify:
```sql
SELECT id, customer_name, status 
FROM get_all_bookings_with_details() 
LIMIT 1;
```

Should return one row with valid UUID.

---

## 🔍 CONSOLE LOG INTERPRETATION

### Good Output:
```javascript
📦 Fetched bookings: 3
📋 First booking sample: {
  id: "abc-123-def",
  customer_name: "John Doe",
  status: "pending",
  ...
}
🔑 First booking ID: abc-123-def
🏷️ First booking keys: ["id", "user_id", "table_id", ...]
```
**Action:** Everything working! ✅

---

### Bad Output #1 - Empty Array:
```javascript
📦 Fetched bookings: 0
```
**Cause:** No bookings exist or RLS blocking  
**Fix:** Create test booking or fix RLS policies

---

### Bad Output #2 - Missing ID:
```javascript
📦 Fetched bookings: 3
📋 First booking sample: {
  customer_name: "John Doe",
  status: "pending",
  // NO id FIELD!
}
🔑 First booking ID: undefined
🏷️ First booking keys: ["customer_name", "status", ...]
```
**Cause:** Function RETURNS TABLE missing `id` column  
**Fix:** Recreate function with `id UUID` in RETURNS TABLE

---

### Bad Output #3 - Permission Error:
```javascript
❌ Error fetching bookings: {
  message: "permission denied for function get_all_bookings_with_details"
}
```
**Cause:** RLS policy too restrictive  
**Fix:** Grant execute permission to authenticated users

---

## ✅ SUCCESS CRITERIA

Booking confirmation works when:

1. ✅ RPC function returns data with `id` field
2. ✅ Console shows valid UUID (not undefined)
3. ✅ Click "Confirm" button updates status
4. ✅ Table session created successfully
5. ✅ Alert shows "Booking confirmed successfully!"

---

## 📞 DEBUGGING CHECKLIST

Use this checklist when debugging:

- [ ] RPC functions exist in database
- [ ] Functions return data (not empty array)
- [ ] Returned objects have `id` field
- [ ] `id` field is valid UUID (not null/undefined)
- [ ] RLS policies allow access
- [ ] Console logs show correct structure
- [ ] Booking cards render with data
- [ ] Confirm button passes valid ID
- [ ] Update query succeeds
- [ ] Table session created

---

## 🎯 NEXT STEPS AFTER READING CONSOLE

Based on what you see in console:

### If `📦 Fetched bookings: 0`:
→ No bookings exist → Create test booking from customer app

### If `🔑 First booking ID: undefined`:
→ RPC function structure wrong → Recreate function with proper RETURNS TABLE

### If permission error:
→ RLS issue → Add permissive policies

### If `❌ Invalid booking ID: undefined` on button click:
→ Check how onClick is calling handleUpdateBooking
→ Should be: `onClick={() => handleUpdateBooking(booking.id, 'confirmed')}`
→ Add log before onClick to see what booking.id is

---

**Debug your way to success!** 🔍  
**Remember:** The console logs now show exactly what's happening at each step!
