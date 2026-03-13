# ⚡ QUICK FIX: SYNTAX ERROR WITH TRIGGERS

## 🚨 PROBLEM:

PostgreSQL **does NOT support** `BEFORE SELECT` triggers!

```sql
-- ❌ THIS DOESN'T WORK:
CREATE TRIGGER trg_check_table_status
  BEFORE SELECT OR UPDATE ON restaurant_tables  -- SYNTAX ERROR!
  FOR EACH ROW
  EXECUTE FUNCTION check_table_availability_status();
```

---

## ✅ SOLUTION:

### **Option 1: Manual Release (Simple)**

Just call the release function when needed:

```sql
-- Run this to release all expired tables
SELECT release_expired_table_reservations();

-- Returns: Number of tables released
```

**When to run it:**
- Before checking availability
- At start of each day
- Periodically via cron job

---

### **Option 2: Supabase Scheduled Function (Recommended)**

Use Supabase's built-in scheduler:

```sql
-- Create the function (already in your SQL)
CREATE OR REPLACE FUNCTION release_expired_table_reservations()
RETURNS INTEGER AS $$
-- ... function body ...
$$ LANGUAGE plpgsql;
```

Then set up a schedule in Supabase Dashboard:
1. Go to **Database** → **Functions**
2. Find `release_expired_table_reservations`
3. Click **"Schedule"**
4. Set to run every **5-15 minutes**

**Result:** Automatic cleanup! ✅

---

### **Option 3: Call Before Availability Check**

Modify your frontend code to call release first:

```typescript
// Before checking availability
const releaseExpiredTables = async () => {
  await supabase.rpc('release_expired_table_reservations');
};

const checkAvailability = async (date, time, guests) => {
  // First, release expired tables
  await releaseExpiredTables();
  
  // Then check availability
  const { data } = await supabase.rpc('get_available_tables_for_booking', {
    target_date: date,
    target_time: time,
    min_guests: guests
  });
  
  return data;
};
```

---

## 🎯 UPDATED FILES:

The following have been fixed:

✅ [`ADD_TIME_SLOT_RESERVATIONS.sql`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\ADD_TIME_SLOT_RESERVATIONS.sql) - Removed invalid trigger

**Changes:**
- ❌ Removed: `trg_check_table_status` trigger (invalid syntax)
- ✅ Added: `release_expired_table_reservations()` function
- ✅ Updated: View shows real-time status including expired
- ✅ Updated: Availability function ignores expired reservations

---

## 📊 HOW IT WORKS NOW:

### **Automatic Expiration Detection:**

```sql
-- View automatically calculates if reservation is expired
SELECT * FROM tables_with_time_slots;

-- Shows:
| table_number | reservation_window | real_time_status        |
|--------------|-------------------|-------------------------|
| 5            | 19:00 - 21:00     | RESERVED                | ← Not expired yet
| 7            | 18:00 - 19:00     | EXPIRED (auto-releasing)| ← Past end time
| 10           | Available anytime | AVAILABLE               | ← No reservation
```

### **Availability Check (Automatic):**

```sql
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  TIME '20:00',
  2
);

-- Automatically treats expired reservations as available! ✅
```

---

## 🚀 RECOMMENDED WORKFLOW:

### **For Now (Manual):**

```sql
-- 1. Reserve tables as needed
SELECT reserve_table_for_time_slot(
  table_id,
  TIME '19:00',
  TIME '21:00',
  120
);

-- 2. Before checking availability, release expired
SELECT release_expired_table_reservations();

-- 3. Check availability
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  TIME '20:00',
  2
);
```

### **Later (Automated with Supabase Edge Functions):**

Set up scheduled function:

```bash
# Install Supabase CLI
npm install -g supabase

# Create scheduled function
supabase functions new release-tables

# Deploy with schedule
supabase functions deploy release-tables --schedule "*/15 * * * *"
```

This runs every 15 minutes automatically! ⏰

---

## 🧪 TEST IT NOW:

```sql
-- Test 1: Reserve a table for PAST time (for testing)
UPDATE restaurant_tables
SET 
  is_reserved = TRUE,
  reservation_start_time = TIME '10:00',
  reservation_end_time = TIME '11:00',
  auto_release_at = NOW() - INTERVAL '1 hour'  -- Already expired!
WHERE table_number = 5;

-- Test 2: Check view (should show EXPIRED)
SELECT table_number, reservation_window, real_time_status
FROM tables_with_time_slots
WHERE table_number = 5;

-- Expected:
-- | 5 | 10:00 - 11:00 | EXPIRED (auto-releasing) |

-- Test 3: Manually release
SELECT release_expired_table_reservations();

-- Should release table #5

-- Test 4: Verify released
SELECT table_number, is_reserved, status
FROM restaurant_tables
WHERE table_number = 5;

-- Expected:
-- | 5 | FALSE | available |
```

---

## ✅ SUMMARY:

**What Changed:**
- ❌ Removed invalid `BEFORE SELECT` trigger
- ✅ Added manual `release_expired_table_reservations()` function
- ✅ Views and functions automatically detect expired reservations
- ✅ You control when to clean up (manual or scheduled)

**How to Use:**
1. Run the updated SQL file
2. Call `release_expired_table_reservations()` periodically
3. Or set up Supabase scheduled function
4. Availability checks work automatically!

**Files Updated:**
- ✅ [`ADD_TIME_SLOT_RESERVATIONS.sql`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\ADD_TIME_SLOT_RESERVATIONS.sql)
- ✅ This guide: [`QUICK_FIX_TRIGGER_ERROR.md`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\QUICK_FIX_TRIGGER_ERROR.md)

**RUN THE UPDATED SQL FILE NOW!** 🚀
