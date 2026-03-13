# ⏰ TIME-SLOT TABLE RESERVATION SYSTEM - COMPLETE GUIDE

## 🎯 WHAT THIS DOES

### **BEFORE:**
```
Table #5 status: "available"
→ Always available (no time tracking)
→ No automatic release
→ Manual updates needed
```

### **AFTER:**
```
Table #5 status: "reserved"
→ Reserved from 7:00 PM to 9:00 PM
→ Auto-releases at 9:15 PM (grace period)
→ Other customers CANNOT book 7:00-9:00 PM slot
→ System automatically frees table after 9:15 PM! ✅
```

---

## ✅ NEW FEATURES ADDED

### **1. Time-Slot Columns in `restaurant_tables`**

```sql
is_reserved          BOOLEAN       -- Is table currently reserved?
reservation_start_time   TIME      -- When does reservation start?
reservation_end_time     TIME      -- When does reservation end?
auto_release_at    TIMESTAMP       -- When to auto-release the table
```

### **2. Automatic Functions**

#### Function 1: `reserve_table_for_time_slot(table_id, start, end, duration)`
Reserves a table for specific time window with auto-release.

```sql
-- Reserve Table #5 from 7:00 PM to 9:00 PM
SELECT reserve_table_for_time_slot(
  'table-5-id',
  TIME '19:00',
  TIME '21:00',
  120  -- 120 minutes
);
```

#### Function 2: `get_available_tables_for_booking(date, time, guests)`
Returns tables filtered by time-slot availability.

```sql
-- Show available tables at 8:00 PM
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  TIME '20:00',
  4
);

-- Returns:
-- Table #3: is_available = TRUE  ✅
-- Table #5: is_available = FALSE ❌ (reserved 7-9 PM)
-- Table #7: is_available = TRUE  ✅
```

#### Function 3: `auto_release_expired_tables()`
Automatically releases tables whose reservation time has passed.

Runs via trigger on every query - no manual intervention needed!

---

## 🔄 HOW IT WORKS

### Scenario 1: Customer Books Table

```
Customer A books Table #5 for 7:00 PM - 9:00 PM
↓
System executes:
SELECT reserve_table_for_time_slot(
  table_5_id,
  TIME '19:00',
  TIME '21:00',
  120
);
↓
Database updates:
- is_reserved = TRUE
- reservation_start_time = 19:00
- reservation_end_time = 21:00
- auto_release_at = Today 21:15 (end + 15 min grace)
- status = 'reserved'
↓
Result:
✅ Table #5 blocked for 7:00-9:00 PM
❌ Other customers CANNOT book this time slot
⏰ Auto-releases at 9:15 PM if not used
```

### Scenario 2: Customer Searches for Table

```
Customer B searches for table at 8:00 PM
↓
System calls:
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  TIME '20:00',
  2
);
↓
Database checks each table:
- Table #3: Not reserved → AVAILABLE ✅
- Table #5: Reserved 19:00-21:00 → NOT AVAILABLE ❌
- Table #7: Not reserved → AVAILABLE ✅
↓
Customer sees: Tables 3 and 7 only (Table 5 hidden)
```

### Scenario 3: Back-to-Back Bookings

```
Table #10 Schedule:
┌──────────────┬──────────────┬──────────────┐
│ 6:00-7:30    │ 7:30-9:00    │ 9:00-10:30   │
│ Customer A   │ Customer B   │ Customer C   │
└──────────────┴──────────────┴──────────────┘

How it works:
1. Customer A books → Reserve 18:00-19:30
2. Customer B books → Reserve 19:30-21:00 (no overlap!)
3. Customer C books → Reserve 21:00-22:30 (no overlap!)

All 3 bookings fit perfectly! ✅
```

### Scenario 4: Auto-Release (No-Show Protection)

```
Customer reserves Table #5 for 7:00 PM
Auto-release set for 7:15 PM (start + 15 min grace)

Customer doesn't show up by 7:15 PM
↓
Trigger automatically runs:
UPDATE restaurant_tables
SET is_reserved = FALSE,
    status = 'available'
WHERE auto_release_at <= NOW();
↓
Result:
✅ Table #5 becomes available again
✅ Can be booked by other customers
✅ No manual intervention needed!
```

---

## 🚀 SETUP INSTRUCTIONS

### Step 1: Run SQL Migration

**File:** [`ADD_TIME_SLOT_RESERVATIONS.sql`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\ADD_TIME_SLOT_RESERVATIONS.sql)

**Actions:**
1. Open Supabase SQL Editor
2. Copy ALL content from file
3. Paste into editor
4. Click "Run"
5. Verify success

**What it creates:**
- ✅ 4 new columns in `restaurant_tables`
- ✅ 3 main functions (reserve, check availability, auto-release)
- ✅ 2 views (tables_with_time_slots, current_table_reservations)
- ✅ Automatic triggers for real-time updates

---

### Step 2: Verify It Works

```sql
-- Check columns were added
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'restaurant_tables' 
  AND column_name LIKE '%reservation%';

-- Expected: 4 rows (reservation_start_time, reservation_end_time, etc.)

-- Test reserving a table
SELECT reserve_table_for_time_slot(
  (SELECT id FROM restaurant_tables WHERE table_number = 5 LIMIT 1),
  TIME '19:00',
  TIME '21:00',
  120
);

-- Result should be: TRUE (successfully reserved)

-- Check availability at 8:00 PM
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  TIME '20:00',
  2
);

-- Table #5 should show: is_available = FALSE
-- Other tables should show: is_available = TRUE
```

---

### Step 3: View Current Reservations

```sql
-- See all active reservations
SELECT * FROM current_table_reservations;

-- Example output:
| table_number | start | end | auto_release | status |
|--------------|-------|-----|--------------|--------|
| 5            | 19:00 | 21:00 | 21:15      | ACTIVE |
| 10           | 18:00 | 19:30 | 19:45      | ACTIVE |
```

---

## 📱 INTEGRATION WITH BOOKING SYSTEM

### When Customer Books Table:

```typescript
// In your booking submission code:
const handleBooking = async () => {
  // 1. Create booking record
  await supabase.from('table_bookings').insert({
    user_id: user.id,
    table_id: selectedTableId,
    booking_date: date,
    booking_time: time,
    booking_duration: duration,
    status: 'confirmed'
  });

  // 2. Reserve the table in restaurant_tables
  const endTime = calculateEndTime(time, duration);
  await supabase.rpc('reserve_table_for_time_slot', {
    p_table_id: selectedTableId,
    p_start_time: time,
    p_end_time: endTime,
    p_duration_minutes: duration
  });

  // 3. Table is now blocked for that time slot!
};
```

---

## 🎯 REAL-WORLD EXAMPLES

### Example 1: Lunch Rush (12:00 PM - 2:00 PM)

```
Table #3 Schedule:
12:00-1:00  → Customer A (quick lunch)
1:00-2:30   → Customer B (business meeting)
2:30-4:00   → Customer C (late lunch)

All managed automatically! ✅
```

### Example 2: Dinner Peak (6:00 PM - 10:00 PM)

```
Table #12 (VIP table):
18:00-20:00 → Party of 10 (birthday celebration)
20:00-22:00 → Date night couple
22:00-23:30 → Late dinner group

Maximum utilization! ✅
```

### Example 3: Mixed Duration Day

```
Table #7:
Morning:  9:00-10:00 (breakfast, 60 min)
Lunch:   12:00-13:30 (business lunch, 90 min)
Snack:   15:00-16:00 (coffee meeting, 60 min)
Dinner:  19:00-21:00 (anniversary, 120 min)

Perfect scheduling! ✅
```

---

## 🔍 ADMIN CONTROLS

### Manually Release a Table

```sql
-- If customer cancels or no-show
SELECT manually_release_table(
  (SELECT id FROM restaurant_tables WHERE table_number = 5)
);

-- Table immediately becomes available
```

### View All Reservations

```sql
-- See everything with time slots
SELECT * FROM tables_with_time_slots;

-- Shows:
-- Table number
-- Reservation window (e.g., "19:00 - 21:00")
-- Real-time status (AVAILABLE / RESERVED / EXPIRED)
```

### Auto-Release Expired Reservations

```sql
-- Manually trigger if needed (usually automatic)
SELECT auto_release_expired_tables();

-- Releases all tables where auto_release_at <= NOW()
```

---

## 📊 DATABASE SCHEMA

### `restaurant_tables` Table Structure:

```
┌─────────────────────────┬─────────────┬─────────────────────────┐
│ Column                  │ Type        │ Purpose                 │
├─────────────────────────┼─────────────┼─────────────────────────┤
│ id                      │ UUID        │ Primary key             │
│ table_number            │ INTEGER     │ Display number          │
│ capacity                │ INTEGER     │ Max guests              │
│ status                  │ TEXT        │ available/reserved      │
│ is_reserved             │ BOOLEAN     │ Currently reserved?     │
│ reservation_start_time  │ TIME        │ When reservation starts │
│ reservation_end_time    │ TIME        │ When reservation ends   │
│ auto_release_at         │ TIMESTAMP   │ Auto-free timestamp     │
│ created_at              │ TIMESTAMP   │ Creation time           │
└─────────────────────────┴─────────────┴─────────────────────────┘
```

---

## 🧪 TESTING SCENARIOS

### Test 1: Reserve and Check Availability

```sql
-- Reserve Table #5 for 7-9 PM
SELECT reserve_table_for_time_slot(
  (SELECT id FROM restaurant_tables WHERE table_number = 5),
  TIME '19:00',
  TIME '21:00',
  120
);

-- Try to book at 8:00 PM (should fail)
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  TIME '20:00',
  4
);
-- Table #5: is_available = FALSE ❌

-- Try to book at 6:00 PM (should succeed)
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  TIME '18:00',
  4
);
-- Table #5: is_available = TRUE ✅
```

### Test 2: Back-to-Back Reservations

```sql
-- Book 1: 6:00-7:30 PM
SELECT reserve_table_for_time_slot(table_id, TIME '18:00', TIME '19:30', 90);

-- Book 2: 7:30-9:00 PM (immediately after)
SELECT reserve_table_for_time_slot(table_id, TIME '19:30', TIME '21:00', 90);

-- Both should succeed (no overlap)! ✅
```

### Test 3: Auto-Release

```sql
-- Reserve with past time (for testing)
UPDATE restaurant_tables
SET 
  is_reserved = TRUE,
  reservation_start_time = TIME '10:00',
  reservation_end_time = TIME '11:00',
  auto_release_at = NOW() - INTERVAL '1 hour'  -- Already expired
WHERE table_number = 5;

-- Trigger should auto-detect and release
SELECT table_number, is_reserved, status
FROM restaurant_tables
WHERE table_number = 5;

-- Should show: is_reserved = FALSE, status = 'available'
```

---

## 🎉 BENEFITS

### For Customers:
- ✅ Accurate availability information
- ✅ No double-booking conflicts
- ✅ Guaranteed table when they arrive
- ✅ Clear time expectations

### For Restaurant:
- ✅ Maximum table utilization
- ✅ Automated time management
- ✅ Reduced no-show impact (auto-release)
- ✅ Better capacity planning
- ✅ Back-to-back booking optimization

### For Staff:
- ✅ Clear reservation windows
- ✅ Automatic table freeing
- ✅ Easy conflict detection
- ✅ Less manual coordination

---

## 📁 FILES CREATED

**SQL:**
1. ✅ [`ADD_TIME_SLOT_RESERVATIONS.sql`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\ADD_TIME_SLOT_RESERVATIONS.sql) - Complete migration

**Documentation:**
1. ✅ [`TIME_SLOT_RESERVATION_GUIDE.md`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\TIME_SLOT_RESERVATION_GUIDE.md) - This guide

---

## 🚀 NEXT STEPS

1. **Run the SQL migration** in Supabase
2. **Test reserving a table** with the function
3. **Check availability** at different times
4. **Verify auto-release** works
5. **Integrate with booking flow** in frontend code

**Your system now has intelligent time-slot management!** 🎯
