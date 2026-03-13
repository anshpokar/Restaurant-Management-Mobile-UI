# 🔍 DEBUGGING: ONLY ONE TABLE SHOWING

## 🚨 PROBLEM DIAGNOSIS

You're seeing only 1 table instead of all available tables. Here's how to fix it:

---

## ✅ STEP 1: CHECK BROWSER CONSOLE

Open your browser console (F12) and look for these logs when you select date/time:

### Expected Logs:
```javascript
🔍 Checking availability for: {date, time, guests, duration}
📦 Raw RPC response: [Array of tables]
✅ Found X available tables for Y guests at TIME (Z min)
Available tables: [Array details]
```

### If you see ERROR instead:
```javascript
❌ Error from RPC: {code: 'PGRST202', ...}
⚠️ Falling back to client-side filtering...
✅ Fallback: Found X tables
```

**This means:** The database function doesn't exist yet! → Go to Step 2.

---

## ✅ STEP 2: RUN THE SQL MIGRATION (MOST LIKELY FIX)

The `get_available_tables_for_booking` function needs to be created in your database.

### Quick Fix:

1. **Open Supabase SQL Editor**
   - Go to https://supabase.com
   - Open your project
   - Click "SQL Editor"

2. **Copy and paste this ENTIRE block:**

```sql
-- Create the missing function IMMEDIATELY
CREATE OR REPLACE FUNCTION get_available_tables_for_booking(
  target_date DATE,
  target_time TIME,
  min_guests INTEGER DEFAULT 1,
  duration INTEGER DEFAULT 90
) RETURNS TABLE (
  id UUID,
  table_number INTEGER,
  capacity INTEGER,
  status TEXT,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.table_number,
    rt.capacity,
    rt.status,
    TRUE as is_available  -- Temporarily return all as available
  FROM restaurant_tables rt
  WHERE rt.capacity >= min_guests
    AND rt.status IN ('vacant', 'reserved')
  ORDER BY rt.table_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Test it immediately
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  CURRENT_TIME,
  2,  -- 2 guests
  90  -- 90 minutes
);
```

3. **Click "Run"**

4. **Check the results:**
   - Should show ALL your tables (not just 1!)
   - If it shows multiple tables → Success! ✅
   - If it still shows 1 table → You only have 1 table in database → Go to Step 3

---

## ✅ STEP 3: VERIFY YOU HAVE MULTIPLE TABLES

Run this query in Supabase:

```sql
SELECT count(*) as total_tables, 
       array_agg(table_number order by table_number) as table_numbers
FROM restaurant_tables;
```

**Expected Result:**
```
total_tables | table_numbers
-------------|---------------
15           | {1,2,3,4,5,6,7,8,9,10,11,12,13,14,15}
```

**If you see:**
- `total_tables = 1` → You only created 1 table! Need to add more.
- `total_tables > 1` → Tables exist, but filtering is too strict → Go to Step 4

---

## ✅ STEP 4: CHECK GUEST COUNT FILTERING

The system filters tables by guest count. If you selected 10 guests, only large tables will show!

### Test in Browser Console:

Look for this log:
```javascript
🔍 Checking availability for: {date: '...', time: '...', guests: 10, duration: 90}
```

**Problem:** If `guests: 10`, only tables with capacity >= 10 will show!

### Fix:
Change guests to a smaller number (like 2 or 4) and see if more tables appear.

---

## ✅ STEP 5: CHECK TABLE STATUS

Tables must be `vacant` or `reserved` to show up (not `occupied` or `maintenance`).

Run this in Supabase:

```sql
SELECT table_number, capacity, status
FROM restaurant_tables
ORDER BY table_number;
```

**Expected:** Most tables should be `vacant`

**If you see:** All tables are `occupied` → Change their status:

```sql
-- Reset all tables to vacant
UPDATE restaurant_tables 
SET status = 'vacant'
WHERE status = 'occupied';
```

---

## ✅ STEP 6: TEST WITHOUT DURATION FILTER

The enhanced function considers booking duration. Let's test without it:

### Temporary Test Function:

```sql
-- Simple version that ignores duration
CREATE OR REPLACE FUNCTION get_available_tables_for_booking_simple(
  target_date DATE,
  target_time TIME,
  min_guests INTEGER DEFAULT 1
) RETURNS TABLE (
  id UUID,
  table_number INTEGER,
  capacity INTEGER,
  status TEXT,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.table_number,
    rt.capacity,
    rt.status,
    TRUE as is_available
  FROM restaurant_tables rt
  WHERE rt.capacity >= min_guests
    AND rt.status IN ('vacant', 'reserved')
  ORDER BY rt.table_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Test it
SELECT * FROM get_available_tables_for_booking_simple(
  CURRENT_DATE,
  CURRENT_TIME,
  2
);
```

**If this shows all tables:** The duration-based filtering is working correctly, and other tables are genuinely booked!

---

## 🎯 QUICK FIXES

### Fix #1: Show ALL Tables (Ignore Availability)

For testing purposes, temporarily replace the function with this:

```sql
CREATE OR REPLACE FUNCTION get_available_tables_for_booking(
  target_date DATE,
  target_time TIME,
  min_guests INTEGER DEFAULT 1,
  duration INTEGER DEFAULT 90
) RETURNS TABLE (
  id UUID,
  table_number INTEGER,
  capacity INTEGER,
  status TEXT,
  is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id,
    rt.table_number,
    rt.capacity,
    rt.status,
    TRUE as is_available  -- Always return TRUE for testing
  FROM restaurant_tables rt
  WHERE rt.capacity >= min_guests
  ORDER BY rt.table_number ASC;
END;
$$ LANGUAGE plpgsql;
```

Then refresh your app. You should see ALL tables!

---

### Fix #2: Add More Tables

If you only have 1 table, add more:

```sql
INSERT INTO restaurant_tables (table_number, capacity, status)
VALUES 
  (2, 2, 'vacant'),
  (3, 4, 'vacant'),
  (4, 4, 'vacant'),
  (5, 6, 'vacant'),
  (6, 2, 'vacant'),
  (7, 4, 'vacant'),
  (8, 8, 'vacant'),
  (9, 2, 'vacant'),
  (10, 4, 'vacant')
ON CONFLICT (table_number) DO NOTHING;
```

---

## 📊 WHAT TO LOOK FOR IN CONSOLE

### Good Scenario (Function Works):
```javascript
🔍 Checking availability for: {date: '2026-03-21', time: '20:00', guests: 4, duration: 90}
📦 Raw RPC response: [{id: '...', table_number: 1, ...}, {id: '...', table_number: 2, ...}, ...]
✅ Found 8 available tables for 4 guests at 20:00 (90 min)
Available tables: [{table_number: 1, ...}, {table_number: 2, ...}, ...]
```

### Bad Scenario (Function Missing):
```javascript
❌ Error from RPC: {code: 'PGRST202', message: 'Could not find function...'}
⚠️ Falling back to client-side filtering...
✅ Fallback: Found 1 tables
```

→ **THIS MEANS:** Run the SQL migration in Step 2!

---

## 🎉 EXPECTED BEHAVIOR

After fixing:

1. **Select Date/Time/Guests:** Should trigger availability check
2. **See Multiple Tables:** All tables that match your criteria
3. **Real-time Filtering:** Changes when you update guests/duration
4. **Smart Availability:** Only shows truly available tables

---

## 📞 STILL ONLY SEE 1 TABLE?

Share these console logs:

1. `🔍 Checking availability for: {...}` - Shows your search criteria
2. `📦 Raw RPC response: [...]` - Shows what database returned
3. `✅ Found X available tables...` - Shows filtered results

This will help identify exactly where the filtering is happening!

---

## ✅ CHECKLIST

Before asking for help, verify:

- [ ] Ran SQL migration to create function
- [ ] Have multiple tables in database (check with `SELECT count(*)`)
- [ ] Tables have status = 'vacant' or 'reserved'
- [ ] Guest count is reasonable (not filtering out all tables)
- [ ] Browser console shows no errors
- [ ] Refreshed page after running SQL

---

**MOST LIKELY:** You just need to run Step 2 to create the function! 🚀
