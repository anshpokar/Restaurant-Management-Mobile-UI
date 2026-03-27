# 🚀 QUICK START - ENHANCED TABLE BOOKING SYSTEM

## ⚡ 3-Step Setup

### Step 1: Run SQL Scripts (5 minutes)

Open **Supabase SQL Editor** and run these 3 scripts IN ORDER:

#### 1️⃣ First: Fix Bookings RLS
```
Copy ALL content from: fix-table-bookings-rls.sql
Paste into SQL Editor → Click RUN
```

#### 2️⃣ Second: Fix Sessions RLS
```
Copy ALL content from: fix-table-sessions-rls.sql
Paste into SQL Editor → Click RUN
```

#### 3️⃣ Third: Add Tables + Functions
```
Copy ALL content from: ENHANCED_TABLE_MANAGEMENT.sql
Paste into SQL Editor → Click RUN
```

---

### Step 2: Verify Setup (1 minute)

Run this query in SQL Editor:
```sql
-- Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE '%available%';

-- Check tables count
SELECT count(*) as total_tables FROM restaurant_tables;
```

**Expected Result:**
```
is_table_available_for_booking     ← Function exists ✅
get_available_tables_for_booking   ← Function exists ✅
total_tables: 15                   ← 15 tables created ✅
```

---

### Step 3: Test Customer App (2 minutes)

1. Open your customer app
2. Navigate to "Book Table"
3. Select:
   - Date: Tomorrow
   - Time: 10:00 PM (22:00)
   - Guests: 4 people
4. **Result:** Should see ONLY available tables! ✅

---

## 🎯 What You Get

### 15 Restaurant Tables:
```
Small (2-seaters):    #1, #2, #3, #4, #5, #6, #7, #8, #9
Medium (4-seaters):   #10, #11, #12
Large (6-seaters):    #13
Extra Large (8-seat): #14
VIP (10-seat):        #15
```

### Smart Availability:
- ✅ If Table #5 booked for 22:00 → Blocked until 23:30
- ✅ Customers can't book already-booked time slots
- ✅ No more double-booking!

### Real-Time Filtering:
- ✅ Customer selects date/time/guests
- ✅ System checks database for conflicts
- ✅ Shows ONLY truly available tables
- ✅ Updates automatically when criteria change

---

## 📊 Database Tables Explained

### 1. `restaurant_tables` - Physical Tables
**What:** Actual restaurant tables (#1-15)
**Used For:** Showing available tables, managing occupancy

### 2. `table_bookings` - Reservations  
**What:** Customer booking records
**Used For:** Storing reservations, checking availability

### 3. `profiles` - Users
**What:** Customer/staff accounts
**Used For:** Authentication, identifying who booked

### 4. `table_sessions` - Active Dining
**What:** When customers are seated
**Used For:** Tracking active diners, payments

---

## 🔍 Quick Test Queries

### Test 1: Check Available Tables
```sql
SELECT * FROM get_available_tables_for_booking(
  DATE '2026-03-21',
  TIME '22:00',
  4
);
```

### Test 2: View Today's Bookings
```sql
SELECT * FROM todays_booking_schedule;
```

### Test 3: Check Specific Table
```sql
SELECT is_table_available_for_booking(
  (SELECT id FROM restaurant_tables WHERE table_number = 5),
  DATE '2026-03-21',
  TIME '22:00'
);
```

---

## 📁 Files Reference

### SQL Scripts (Run in Supabase):
1. ✅ `fix-table-bookings-rls.sql` - RLS for bookings
2. ✅ `fix-table-sessions-rls.sql` - RLS for sessions  
3. ✅ `ENHANCED_TABLE_MANAGEMENT.sql` - Tables + Functions

### Frontend Code (Already Updated):
1. ✅ `src/pages/customer/bookings-screen.tsx` - Smart availability

### Documentation:
1. ✅ `TABLE_BOOKING_SYSTEM_EXPLAINED.md` - Complete guide
2. ✅ `SUMMARY_ENHANCED_BOOKING_SYSTEM.md` - Quick summary
3. ✅ `IMPLEMENTATION_VERIFICATION_REPORT.md` - Verification
4. ✅ `QUICK_START_ENHANCED_BOOKING.md` - This file

---

## 🎉 That's It!

Your enhanced table booking system is ready with:
- ✅ 15 tables of various capacities
- ✅ Smart 90-minute window protection
- ✅ Real-time availability checking
- ✅ No double-booking possible
- ✅ Complete RLS policies

**Go test it now!** 🚀
