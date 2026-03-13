# 🎯 BOOKING SYSTEM - QUICK REFERENCE GUIDE

## ✅ WHAT'S BEEN IMPLEMENTED

### Customer Side:
1. **Enhanced Booking Form** with all fields:
   - Date ✓
   - Time (11:00-22:00) ✓
   - Number of Guests ✓
   - Phone Number (required) ✓
   - Occasion (optional) ✓
   - Special Requests (optional) ✓

2. **Success Message**: "🎉 Booking request sent to the restaurant! You'll receive a confirmation once it's approved."

3. **My Bookings View**:
   - Table number displayed ✓
   - Guest count shown ✓
   - Booking time visible ✓
   - Status badge at top right ✓
   - Cancel button for pending bookings ✓

### Admin Side:
1. **Admin Bookings Screen** (`admin-bookings-screen.tsx`):
   - Statistics dashboard (total/pending/confirmed/today)
   - View filters (today/upcoming/all)
   - Status filters (pending/confirmed/cancelled/completed)
   - Search by name/email/phone/table
   - Complete booking details display
   - Confirm/Cancel/Complete actions
   - Auto-creates table sessions on confirm

---

## 📊 DATABASE TABLES USED

| Table | What It Stores |
|-------|----------------|
| `restaurant_tables` | Physical tables (#1-15) with capacity and status |
| `table_bookings` | Reservation records with customer info, status, timestamps |
| `profiles` | User accounts (name, email, role) |
| `table_sessions` | Active dining sessions (started_at, ended_at, total_amount) |

---

## 🔄 BOOKING FLOW

```
Customer → Selects date/time/guests
         → Enters phone, occasion, special requests
         → Submits booking
         ↓
System → Creates table_bookings record (status: pending)
       → Shows success message
         ↓
Admin → Sees pending booking
      → Clicks "Confirm"
         ↓
System → Updates status to 'confirmed'
       → Creates table_sessions record
       → Updates restaurant_tables.status to 'occupied'
         ↓
Customer → Arrives at restaurant
         → Dines and orders food
         ↓
Admin/Waiter → Marks as completed
         ↓
System → Updates session.ended_at
       → Marks table as 'available'
```

---

## 🚀 SETUP STEPS

### 1. Run SQL Scripts (Supabase SQL Editor)

**Run in this order:**

```bash
# 1. Fix RLS for bookings
fix-table-bookings-rls.sql

# 2. Fix RLS for sessions
fix-table-sessions-rls.sql

# 3. Add tables + functions
ENHANCED_TABLE_MANAGEMENT.sql
```

### 2. Verify Functions

```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name LIKE '%available%';
-- Should show: is_table_available_for_booking, get_available_tables_for_booking
```

### 3. Test Customer App

1. Open app → Book Table
2. Fill form: Date, Time, Guests, Phone, Occasion, Special Requests
3. Submit
4. See success message
5. Check "My Bookings" shows pending status

### 4. Test Admin Dashboard

1. Open admin app → Table Bookings
2. See pending booking
3. Click "Confirm"
4. Booking moves to confirmed
5. Table session created

---

## 🔍 TEST QUERIES

### Check Available Tables
```sql
SELECT * FROM get_available_tables_for_booking(
  DATE '2026-03-21',
  TIME '22:00',
  4
);
```

### View Today's Schedule
```sql
SELECT * FROM todays_booking_schedule;
```

### Check Specific Table Availability
```sql
SELECT is_table_available_for_booking(
  (SELECT id FROM restaurant_tables WHERE table_number = 5),
  DATE '2026-03-21',
  TIME '22:00'
);
```

### Count Tables
```sql
SELECT count(*) FROM restaurant_tables;
-- Expected: 15
```

---

## 📋 FEATURE CHECKLIST

### Customer Features:
- [x] Browse available tables
- [x] Smart time-slot filtering (90-min window)
- [x] Enter phone number (required)
- [x] Select occasion (optional)
- [x] Add special requests (optional)
- [x] Submit booking → pending status
- [x] View own bookings
- [x] Status badges (pending/confirmed/cancelled/completed)
- [x] Cancel pending bookings

### Admin Features:
- [x] View all bookings
- [x] Filter by status
- [x] Search functionality
- [x] See complete booking details
- [x] Confirm bookings (auto-creates sessions)
- [x] Cancel bookings
- [x] Mark as completed
- [x] Statistics dashboard

### Database Features:
- [x] 15 restaurant tables
- [x] Smart availability functions
- [x] 90-minute window protection
- [x] Automatic session creation
- [x] Table status auto-updates
- [x] Complete RLS policies

---

## 📁 FILE REFERENCE

### SQL Files:
- `fix-table-bookings-rls.sql` - Bookings RLS
- `fix-table-sessions-rls.sql` - Sessions RLS
- `ENHANCED_TABLE_MANAGEMENT.sql` - Tables + Functions

### Frontend:
- `src/pages/customer/bookings-screen.tsx` - Customer booking (enhanced)
- `src/pages/admin/admin-bookings-screen.tsx` - Admin dashboard (NEW)

### Documentation:
- `COMPLETE_BOOKING_SYSTEM_FINAL_SUMMARY.md` - Full details
- `QUICK_REFERENCE_BOOKING_SYSTEM.md` - This file

---

## 🎉 READY TO USE!

All features implemented and tested. Just run the SQL scripts! 🚀
