# 🚨 CRITICAL: RUN SQL SCRIPTS FIRST!

## ⚠️ ERROR EXPLAINED

**Error Message:**
```
POST https://.../rpc/get_available_tables_for_booking 404 (Not Found)
Could not find the function public.get_available_tables_for_booking
```

**Reason:** The database functions haven't been created yet in Supabase!

---

## ✅ SOLUTION: RUN THESE 3 SQL SCRIPTS

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com
2. Open your project: `ppjtecxvpjblisxfnztz`
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

---

### Step 2: Run Script #1 - Fix Bookings RLS

**File:** [`fix-table-bookings-rls.sql`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\fix-table-bookings-rls.sql)

**Actions:**
1. Open the file
2. Copy ALL content (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor
4. Click **"Run"** (or Ctrl+Enter)
5. Wait for success message

**What it does:** Creates 9 RLS policies for `table_bookings` table

---

### Step 3: Run Script #2 - Fix Sessions RLS

**File:** [`fix-table-sessions-rls.sql`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\fix-table-sessions-rls.sql)

**Actions:**
1. Open the file
2. Copy ALL content
3. Paste into SQL Editor
4. Click **"Run"**
5. Wait for success message

**What it does:** Creates 9 RLS policies for `table_sessions` table

---

### Step 4: Run Script #3 - Add Tables + Functions ⭐ MOST IMPORTANT

**File:** [`ENHANCED_TABLE_MANAGEMENT.sql`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\ENHANCED_TABLE_MANAGEMENT.sql)

**Actions:**
1. Open the file
2. Copy ALL content
3. Paste into SQL Editor
4. Click **"Run"**
5. Wait for success message

**What it creates:**
- ✅ Adds 10 new restaurant tables (total 15)
- ✅ Creates `is_table_available_for_booking()` function
- ✅ Creates `get_available_tables_for_booking()` function ⭐
- ✅ Creates `todays_booking_schedule` view

**THIS IS THE SCRIPT THAT FIXES YOUR ERROR!**

---

## 🔍 VERIFY SUCCESS

After running all 3 scripts, run this test query:

```sql
-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%available%';

-- Expected result:
-- is_table_available_for_booking     ← Should appear
-- get_available_tables_for_booking   ← Should appear (THIS ONE FIXES YOUR ERROR!)
```

If both functions appear, you're good to go! ✅

---

## 🧪 TEST THE FIX

### Test 1: Check Available Tables
```sql
SELECT * FROM get_available_tables_for_booking(
  DATE '2026-03-21',
  TIME '22:00',
  4
);
```

**Expected:** Returns list of available tables with `is_available` column

---

### Test 2: Check Specific Table
```sql
SELECT is_table_available_for_booking(
  (SELECT id FROM restaurant_tables WHERE table_number = 5),
  DATE '2026-03-21',
  TIME '22:00'
);
```

**Expected:** Returns `true` or `false`

---

### Test 3: Check Tables Count
```sql
SELECT count(*) FROM restaurant_tables;
```

**Expected:** Returns 15 or more

---

## 🎯 AFTER RUNNING SCRIPTS

### In Your App:
1. Refresh the browser page (F5)
2. Go to customer booking screen
3. Select date, time, guests
4. **Should now see available tables!** ✅
5. No more 404 error!

---

## 📋 QUICK COPY-PASTE VERSION

If you prefer, copy and paste this entire block into SQL Editor:

```sql
-- =====================================================
-- SCRIPT 1: TABLE_BOOKINGS RLS POLICIES
-- =====================================================

ALTER TABLE table_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all bookings" ON table_bookings;
CREATE POLICY "Admins can view all bookings"
    ON table_bookings FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view own bookings" ON table_bookings;
CREATE POLICY "Users can view own bookings"
    ON table_bookings FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Waiters can view all bookings" ON table_bookings;
CREATE POLICY "Waiters can view all bookings"
    ON table_bookings FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));

DROP POLICY IF EXISTS "Admins can update all bookings" ON table_bookings;
CREATE POLICY "Admins can update all bookings"
    ON table_bookings FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can update own bookings" ON table_bookings;
CREATE POLICY "Users can update own bookings"
    ON table_bookings FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Waiters can update all bookings" ON table_bookings;
CREATE POLICY "Waiters can update all bookings"
    ON table_bookings FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));

DROP POLICY IF EXISTS "Admins can delete any booking" ON table_bookings;
CREATE POLICY "Admins can delete any booking"
    ON table_bookings FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can delete own bookings" ON table_bookings;
CREATE POLICY "Users can delete own bookings"
    ON table_bookings FOR DELETE TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Waiters can delete bookings" ON table_bookings;
CREATE POLICY "Waiters can delete bookings"
    ON table_bookings FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));


-- =====================================================
-- SCRIPT 2: TABLE_SESSIONS RLS POLICIES
-- =====================================================

ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all sessions" ON table_sessions;
CREATE POLICY "Admins can view all sessions"
    ON table_sessions FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view own sessions" ON table_sessions;
CREATE POLICY "Users can view own sessions"
    ON table_sessions FOR SELECT TO authenticated
    USING (customer_email = (SELECT email FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Waiters can view all sessions" ON table_sessions;
CREATE POLICY "Waiters can view all sessions"
    ON table_sessions FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));

DROP POLICY IF EXISTS "Chefs can view active sessions" ON table_sessions;
CREATE POLICY "Chefs can view active sessions"
    ON table_sessions FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'chef'));

DROP POLICY IF EXISTS "Admins can create sessions" ON table_sessions;
CREATE POLICY "Admins can create sessions"
    ON table_sessions FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Waiters can create sessions" ON table_sessions;
CREATE POLICY "Waiters can create sessions"
    ON table_sessions FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));

DROP POLICY IF EXISTS "Admins can update all sessions" ON table_sessions;
CREATE POLICY "Admins can update all sessions"
    ON table_sessions FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Waiters can update all sessions" ON table_sessions;
CREATE POLICY "Waiters can update all sessions"
    ON table_sessions FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));

DROP POLICY IF EXISTS "Users can update own sessions" ON table_sessions;
CREATE POLICY "Users can update own sessions"
    ON table_sessions FOR UPDATE TO authenticated
    USING (customer_email = (SELECT email FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can delete any session" ON table_sessions;
CREATE POLICY "Admins can delete any session"
    ON table_sessions FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Waiters can delete sessions" ON table_sessions;
CREATE POLICY "Waiters can delete sessions"
    ON table_sessions FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));


-- =====================================================
-- SCRIPT 3: ADD TABLES + AVAILABILITY FUNCTIONS
-- =====================================================

-- Add 10 more tables (total 15)
INSERT INTO restaurant_tables (table_number, capacity, status)
VALUES 
  (6, 2, 'vacant'), (7, 2, 'vacant'), (8, 2, 'vacant'), (9, 2, 'vacant'),
  (10, 4, 'vacant'), (11, 4, 'vacant'), (12, 4, 'vacant'),
  (13, 6, 'vacant'), (14, 8, 'vacant'), (15, 10, 'vacant')
ON CONFLICT (table_number) DO NOTHING;

-- Create availability check function
CREATE OR REPLACE FUNCTION is_table_available_for_booking(
  target_table_id UUID,
  target_date DATE,
  target_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM table_bookings tb
  WHERE tb.table_id = target_table_id
    AND tb.booking_date = target_date
    AND tb.status IN ('confirmed', 'pending')
    AND (
      (target_time >= tb.booking_time::TIME AND target_time < (tb.booking_time::TIME + INTERVAL '90 minutes'))
      OR
      (tb.booking_time::TIME <= (target_time + INTERVAL '90 minutes') AND tb.booking_time::TIME > target_time)
      OR
      (target_time = tb.booking_time::TIME)
    );
  
  RETURN (conflict_count = 0);
END;
$$ LANGUAGE plpgsql;

-- Create get available tables function
CREATE OR REPLACE FUNCTION get_available_tables_for_booking(
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
    is_table_available_for_booking(rt.id, target_date, target_time) as is_available
  FROM restaurant_tables rt
  WHERE rt.capacity >= min_guests
    AND rt.status IN ('vacant', 'reserved')
  ORDER BY rt.capacity ASC, rt.table_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Create today's schedule view
CREATE OR REPLACE VIEW todays_booking_schedule AS
SELECT 
  rt.table_number,
  rt.capacity,
  tb.booking_time,
  tb.guests_count,
  COALESCE(tb.customer_name, 'Unknown') as customer_name,
  tb.phone_number,
  tb.status,
  tb.special_requests,
  tb.occasion
FROM restaurant_tables rt
LEFT JOIN table_bookings tb 
  ON rt.id = tb.table_id 
  AND tb.booking_date = CURRENT_DATE
  AND tb.status IN ('confirmed', 'pending')
ORDER BY rt.table_number, tb.booking_time;
```

---

## ✅ CHECKLIST

Before testing the app again, make sure:

- [ ] Ran `fix-table-bookings-rls.sql`
- [ ] Ran `fix-table-sessions-rls.sql`
- [ ] Ran `ENHANCED_TABLE_MANAGEMENT.sql`
- [ ] Verified functions exist with test query
- [ ] Refreshed browser page (F5)

---

## 🎉 RESULT

After running the scripts:

✅ No more 404 error
✅ `get_available_tables_for_booking()` function exists
✅ Smart availability checking works
✅ Customer sees only available tables
✅ 90-minute window protection active

**GO RUN THOSE SCRIPTS NOW!** 🚀
