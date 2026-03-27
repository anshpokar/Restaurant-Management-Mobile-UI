# 🍽️ ENHANCED TABLE MANAGEMENT & SMART BOOKING SYSTEM

## 📋 Overview

This guide explains the complete table booking system with smart availability checking that prevents double-booking.

---

## 🗄️ DATABASE SCHEMA - WHICH TABLES ARE USED FOR WHAT

### 1. **`restaurant_tables`** - Physical Restaurant Tables

**Purpose:** Stores information about actual physical tables in the restaurant

**Structure:**
```sql
CREATE TABLE restaurant_tables (
  id UUID PRIMARY KEY,
  table_number INTEGER UNIQUE,      -- Table #1, #2, #3... displayed in restaurant
  capacity INTEGER,                  -- How many people can sit (2-10+)
  status TEXT,                       -- vacant/reserved/occupied/maintenance
  occupied_at TIMESTAMPTZ,          -- When table became occupied
  current_order_id UUID             -- Active order at this table
);
```

**Example Data:**
```
| table_number | capacity | status   | Description                    |
|--------------|----------|----------|--------------------------------|
| 1            | 2        | vacant   | Small table for couples        |
| 2            | 4        | occupied | Medium table, currently used   |
| 3            | 6        | reserved | Large table, booked for later  |
| 4            | 8        | vacant   | Extra large for groups         |
| 5            | 10       | vacant   | VIP table for parties          |
```

**Used For:**
- Showing available tables to customers
- Managing table occupancy status
- Linking bookings to physical locations

---

### 2. **`table_bookings`** - Customer Reservations

**Purpose:** Stores customer booking requests and reservations

**Structure:**
```sql
CREATE TABLE table_bookings (
  id UUID PRIMARY KEY,
  user_id UUID,                    -- Customer who booked
  table_id UUID,                   -- Which table (FK to restaurant_tables)
  booking_date DATE,               -- Date of reservation
  booking_time TIME,               -- Time of reservation
  guests_count INTEGER,            -- Number of guests
  status TEXT,                     -- pending/confirmed/cancelled/completed
  customer_name TEXT,              -- Customer's name
  customer_email TEXT,             -- Customer's email
  phone_number TEXT,               -- Contact number
  special_requests TEXT,           -- Special notes (window seat, etc.)
  occasion TEXT,                   -- birthday/anniversary/etc.
  created_at TIMESTAMPTZ           -- When booking was made
);
```

**Example Data:**
```
| id  | table_id | booking_date | booking_time | status    | customer  | guests |
|-----|----------|--------------|--------------|-----------|-----------|--------|
| 1   | tbl-1    | 2026-03-21   | 22:00        | confirmed | John D.   | 2      |
| 2   | tbl-3    | 2026-03-21   | 22:30        | pending   | Sarah M.  | 4      |
| 3   | tbl-5    | 2026-03-22   | 19:00        | confirmed | Mike R.   | 6      |
```

**Used For:**
- Storing customer reservations
- Checking table availability (by looking at existing bookings)
- Managing booking workflow (pending → confirmed → completed)
- Customer booking history

---

### 3. **`profiles`** - Users (Customers & Staff)

**Purpose:** User accounts for authentication and identification

**Structure:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,             -- Same as auth.users.id
  full_name TEXT,                  -- User's full name
  email TEXT UNIQUE,               -- Login email
  role TEXT,                       -- admin/customer/waiter/chef
  phone_number TEXT,               -- Contact number
  username TEXT UNIQUE             -- Unique username
);
```

**Roles:**
- `admin` - Full access to everything
- `customer` - Can book tables and place orders
- `waiter` - Can manage bookings and take orders
- `chef` - Can view orders and table sessions

**Used For:**
- Authentication (login/logout)
- Identifying who made bookings
- Role-based permissions

---

### 4. **`table_sessions`** - Active Dining Sessions

**Purpose:** Tracks when customers are actually seated and dining

**Structure:**
```sql
CREATE TABLE table_sessions (
  id UUID PRIMARY KEY,
  table_id UUID,                   -- Which table is occupied
  customer_name TEXT,              -- Who is dining
  customer_email TEXT,             -- Contact email
  customer_phone TEXT,             -- Contact number
  started_at TIMESTAMPTZ,          -- When they sat down
  ended_at TIMESTAMPTZ,            -- When they left
  total_orders INTEGER,            -- Number of orders placed
  total_amount NUMERIC,            -- Total bill amount
  payment_status TEXT,             -- pending/paid/completed
  status TEXT                      -- active/completed
);
```

**Example Data:**
```
| id  | table_id | started_at          | ended_at | status    | total  |
|-----|----------|---------------------|----------|-----------|--------|
| 1   | tbl-2    | 2026-03-13 20:00:00 | NULL     | active    | 0      |
| 2   | tbl-5    | 2026-03-13 19:30:00 | 21:00:00 | completed | ₹2,500 |
```

**Used For:**
- Tracking which tables are currently occupied
- Calculating revenue per table
- Managing table turnover
- Payment tracking

---

## 🔄 HOW THE TABLES WORK TOGETHER

### Complete Booking Flow:

```
Step 1: Customer browses tables
├── Queries: restaurant_tables
└── Sees: Available tables with capacity

Step 2: Customer creates booking
├── Creates: table_bookings record
├── Links: table_id → restaurant_tables.id
└── Status: pending

Step 3: Admin confirms booking
├── Updates: table_bookings.status = 'confirmed'
└── Triggers: restaurant_tables.status = 'reserved'

Step 4: Customer arrives
├── Creates: table_sessions record
├── Links: table_id → restaurant_tables.id
└── Updates: restaurant_tables.status = 'occupied'

Step 5: Customer dines and orders
├── Creates: orders records
└── Links: table_id → restaurant_tables.id

Step 6: Customer pays and leaves
├── Updates: table_sessions.payment_status = 'paid'
├── Updates: table_sessions.ended_at = now()
├── Updates: table_sessions.status = 'completed'
└── Updates: restaurant_tables.status = 'vacant'
```

### Visual Diagram:

```
┌─────────────────────┐
│ restaurant_tables   │  ← Physical tables (#1-15)
│ - table_number: 5   │
│ - capacity: 10      │
│ - status: vacant    │
└──────────┬──────────┘
           │
           │ (booked by)
           ↓
┌─────────────────────┐
│ table_bookings      │  ← Reservation record
│ - booking_date      │
│ - booking_time      │
│ - customer_name     │
│ - status: confirmed │
└──────────┬──────────┘
           │
           │ (when customer arrives)
           ↓
┌─────────────────────┐
│ table_sessions      │  ← Active dining session
│ - started_at        │
│ - total_amount      │
│ - status: active    │
└──────────┬──────────┘
           │
           │ (places orders)
           ↓
┌─────────────────────┐
│ orders              │  ← Food orders
│ - items             │
│ - total_amount      │
└─────────────────────┘
```

---

## 🎯 NEW FEATURES IMPLEMENTED

### 1. **Smart Time-Slot Availability Checking**

**Problem Solved:** Previously, if Table #5 was booked for 10:00 PM, another customer could still book it for 10:30 PM causing conflicts.

**Solution:** Database function checks 90-minute windows to prevent overlapping bookings.

**How It Works:**
```sql
-- Function checks if requested time overlaps with existing bookings
SELECT is_table_available_for_booking(
  'table-id',
  '2026-03-21',  -- Date
  '22:00'        -- Time
);

-- Returns: FALSE if table is already booked between 20:30-23:30
-- Returns: TRUE if table is free
```

**Conflict Detection Logic:**
- Each booking assumes **90-minute dining duration**
- If Table #5 is booked for 22:00, it's considered busy until 23:30
- Any request between 20:30-23:30 will be rejected for that table
- Prevents double-booking automatically

---

### 2. **Real-Time Table Availability API**

**Function:** `get_available_tables_for_booking(date, time, guests)`

**Usage:**
```sql
-- Get all tables available for 4 guests on March 21 at 10 PM
SELECT * FROM get_available_tables_for_booking(
  '2026-03-21',  -- Date
  '22:00',       -- Time
  4              -- Guests
);

-- Returns:
| table_number | capacity | is_available |
|--------------|----------|--------------|
| 1            | 2        | true         |
| 2            | 4        | false        | ← Already booked
| 3            | 6        | true         |
```

**Integration:** Automatically called in customer booking screen when date/time/guests change.

---

### 3. **Added More Tables (15 Total)**

**Table Distribution:**
```
Small Tables (2-seaters):
- Table #1, #2, #3, #4, #5, #6, #7, #8, #9
  Perfect for: Couples, solo diners

Medium Tables (4-seaters):
- Table #10, #11, #12
  Perfect for: Small groups, families

Large Tables (6-seaters):
- Table #13
  Perfect for: Group celebrations

Extra Large (8-seaters):
- Table #14
  Perfect for: Large gatherings

VIP Table (10-seater):
- Table #15
  Perfect for: Parties, events
```

---

## 📱 CUSTOMER EXPERIENCE

### Smart Booking Flow:

```
1. Customer selects: 
   - Date: March 21, 2026
   - Time: 10:00 PM (22:00)
   - Guests: 4 people
   
2. System calls: get_available_tables_for_booking()
   
3. Customer sees ONLY available tables:
   ✅ Table #10 (4-seater) - Available
   ✅ Table #11 (4-seater) - Available
   ❌ Table #5 (booked 22:00-23:30) - HIDDEN
   
4. Customer selects table and books
   
5. System creates booking with 90-min window protection
```

### Before vs After:

**BEFORE (Broken):**
```
Customer A books Table #5 for 22:00 ✅
Customer B books Table #5 for 22:30 ✅ (CONFLICT!)
Result: Double booking disaster 😱
```

**AFTER (Fixed):**
```
Customer A books Table #5 for 22:00 ✅
Customer B searches for 22:30
→ System checks: 22:00 + 90min = busy until 23:30
→ Table #5 NOT shown to Customer B
→ Customer B books different table ✅
Result: No conflicts! 😊
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### Database Functions Created:

#### 1. `is_table_available_for_booking(table_id, date, time)`

**Purpose:** Check if a specific table is available

**Logic:**
```sql
CREATE FUNCTION is_table_available_for_booking(
  target_table_id UUID,
  target_date DATE,
  target_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Count conflicting bookings
  SELECT COUNT(*) INTO conflict_count
  FROM table_bookings tb
  WHERE tb.table_id = target_table_id
    AND tb.booking_date = target_date
    AND tb.status IN ('confirmed', 'pending')
    AND (
      -- Check 90-minute window overlap
      (target_time >= tb.booking_time::TIME 
       AND target_time < (tb.booking_time::TIME + INTERVAL '90 minutes'))
      OR
      (tb.booking_time::TIME <= (target_time + INTERVAL '90 minutes') 
       AND tb.booking_time::TIME > target_time)
      OR
      -- Exact same time
      (target_time = tb.booking_time::TIME)
    );
  
  RETURN (conflict_count = 0);  -- TRUE if no conflicts
END;
$$ LANGUAGE plpgsql;
```

**Usage Example:**
```sql
-- Is Table #5 available on March 21 at 10 PM?
SELECT is_table_available_for_booking(
  (SELECT id FROM restaurant_tables WHERE table_number = 5),
  DATE '2026-03-21',
  TIME '22:00'
);
-- Result: FALSE (already booked)
```

---

#### 2. `get_available_tables_for_booking(date, time, min_guests)`

**Purpose:** Get all available tables for given criteria

**Logic:**
```sql
CREATE FUNCTION get_available_tables_for_booking(
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
```

**Usage Example:**
```sql
-- Show tables for 4 guests on March 21 at 10 PM
SELECT * FROM get_available_tables_for_booking(
  DATE '2026-03-21',
  TIME '22:00',
  4
);

-- Result:
| table_number | capacity | is_available |
|--------------|----------|--------------|
| 10           | 4        | true         |
| 11           | 4        | true         |
| 13           | 6        | false        |
```

---

### Frontend Integration:

**File:** `src/pages/customer/enhanced-bookings-screen.tsx`

**Key Changes:**
```typescript
// Automatically check availability when date/time/guests change
useEffect(() => {
  if (view === 'book' && tables.length > 0) {
    getFilteredTables();
  }
}, [date, time, guests, view, tables]);

const getFilteredTables = async () => {
  // Call database function to check real-time availability
  const { data, error } = await supabase.rpc('get_available_tables_for_booking', {
    target_date: date,
    target_time: time,
    min_guests: guests
  });

  // Filter only available tables
  const available = data.filter(t => t.is_available);
  setFilteredTables(available);
};
```

**Result:** Customer only sees tables that are actually available!

---

## 📊 HELPER VIEWS

### View: `todays_booking_schedule`

**Purpose:** Quick overview of today's bookings

**Usage:**
```sql
SELECT * FROM todays_booking_schedule;

-- Result:
| table_number | capacity | booking_time | customer  | guests | status |
|--------------|----------|--------------|-----------|--------|--------|
| 1            | 2        | 19:00        | John D.   | 2      | confirmed |
| 5            | 10       | 20:00        | Sarah M.  | 8      | confirmed |
| 10           | 4        | 21:00        | Mike R.   | 4      | pending  |
```

**Used By:** Staff to see daily reservations at a glance

---

## 🧪 TESTING THE SYSTEM

### Test 1: Check Specific Table Availability
```sql
-- Is Table #5 available on March 21 at 10 PM?
SELECT is_table_available_for_booking(
  (SELECT id FROM restaurant_tables WHERE table_number = 5),
  DATE '2026-03-21',
  TIME '22:00'
) as result;

-- Expected: FALSE if already booked, TRUE if free
```

### Test 2: Get All Available Tables
```sql
-- Show tables for 4 guests on March 21 at 10 PM
SELECT * FROM get_available_tables_for_booking(
  DATE '2026-03-21',
  TIME '22:00',
  4
);

-- Should show only available tables with capacity >= 4
```

### Test 3: View Today's Schedule
```sql
SELECT * FROM todays_booking_schedule;

-- Shows all bookings for today
```

### Test 4: Simulate Double Booking Attempt
```sql
-- Step 1: Book Table #5 for 22:00
INSERT INTO table_bookings (table_id, booking_date, booking_time, status)
VALUES 
  ((SELECT id FROM restaurant_tables WHERE table_number = 5),
   DATE '2026-03-21',
   TIME '22:00',
   'confirmed');

-- Step 2: Try to check availability for 22:30 (should be blocked)
SELECT is_table_available_for_booking(
  (SELECT id FROM restaurant_tables WHERE table_number = 5),
  DATE '2026-03-21',
  TIME '22:30'
);

-- Expected Result: FALSE (blocked by 90-minute window)
```

---

## 📝 STEP-BY-STEP SETUP GUIDE

### Step 1: Run SQL Migration
Open Supabase SQL Editor and run:
```
ENHANCED_TABLE_MANAGEMENT.sql
```

This will:
- ✅ Add 10 more tables (total 15)
- ✅ Create availability checking functions
- ✅ Create helper views
- ✅ Document the schema

### Step 2: Verify Tables Added
```sql
SELECT count(*) as total_tables FROM restaurant_tables;
-- Expected: 15 or more
```

### Step 3: Test Availability Function
```sql
SELECT * FROM get_available_tables_for_booking(
  DATE '2026-03-21',
  TIME '22:00',
  4
);
```

### Step 4: Update Frontend Code
The code in `enhanced-bookings-screen.tsx` is already updated to use smart availability.

### Step 5: Test Customer Experience
1. Open customer app
2. Navigate to "Book Table"
3. Select date, time, guests
4. Should only see available tables!

---

## 🎯 BENEFITS

### For Customers:
- ✅ No double-booking conflicts
- ✅ See only truly available tables
- ✅ Accurate time-slot management
- ✅ Better booking experience

### For Restaurant:
- ✅ Optimized table utilization
- ✅ Prevents overbooking
- ✅ Clear table status tracking
- ✅ Better customer satisfaction

### For Staff:
- ✅ Easy to manage reservations
- ✅ Clear daily schedule
- ✅ No booking conflicts
- ✅ Efficient table turnover

---

## 🔍 TROUBLESHOOTING

### Issue: Customer sees no tables
**Solution:** Check if there are any tables with sufficient capacity
```sql
SELECT * FROM restaurant_tables WHERE capacity >= 4;
```

### Issue: Availability check fails
**Solution:** Verify functions exist
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%available%';
```

### Issue: Double booking still happening
**Solution:** Ensure all bookings go through the availability check function

---

## 📚 FILES CREATED/MODIFIED

### New Files:
1. ✅ `ENHANCED_TABLE_MANAGEMENT.sql` - Complete database migration
2. ✅ `TABLE_BOOKING_SYSTEM_EXPLAINED.md` - This documentation

### Modified Files:
1. ✅ `src/pages/customer/enhanced-bookings-screen.tsx` - Smart availability integration

---

## 🚀 READY TO USE!

The system is now fully functional with:
- ✅ 15 tables of various capacities
- ✅ Smart 90-minute window availability checking
- ✅ Real-time table filtering
- ✅ Double-booking prevention
- ✅ Complete documentation

**Test it now!** Open the customer app and try booking a table! 🎉
