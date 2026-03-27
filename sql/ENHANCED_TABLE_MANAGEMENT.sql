-- =====================================================
-- ENHANCED TABLE MANAGEMENT & SMART BOOKING SYSTEM
-- =====================================================
-- This script:
-- 1. Adds more tables to the restaurant (15 total tables)
-- 2. Shows which tables are used for what purpose
-- 3. Implements smart time-slot availability checking
--    (Prevents double booking within 1.5 hour windows)
-- =====================================================

-- =====================================================
-- PART 1: ADD MORE TABLES TO THE RESTAURANT
-- =====================================================

-- First, let's see current tables
SELECT 'Current Tables' as info, count(*) as total FROM restaurant_tables;

-- Insert additional tables to make it 15 total
-- Assuming you currently have ~5 tables, we'll add 10 more

INSERT INTO restaurant_tables (table_number, capacity, status)
VALUES 
  -- Small tables (2-seaters)
  (6, 2, 'vacant'),
  (7, 2, 'vacant'),
  (8, 2, 'vacant'),
  (9, 2, 'vacant'),
  -- Medium tables (4-seaters)
  (10, 4, 'vacant'),
  (11, 4, 'vacant'),
  (12, 4, 'vacant'),
  -- Large tables (6-8 seater)
  (13, 6, 'vacant'),
  (14, 8, 'vacant'),
  -- VIP table (10+ seater)
  (15, 10, 'vacant')
ON CONFLICT (table_number) DO NOTHING;

-- Verify new table count
SELECT 'New Total Tables' as info, count(*) as total FROM restaurant_tables;

-- Show all tables with their details
SELECT 
  table_number,
  capacity,
  status,
  CASE 
    WHEN capacity = 2 THEN 'Small (2-seater) - Perfect for couples'
    WHEN capacity = 4 THEN 'Medium (4-seater) - Standard dining'
    WHEN capacity = 6 THEN 'Large (6-seater) - Group dining'
    WHEN capacity = 8 THEN 'Extra Large (8-seater) - Large groups'
    WHEN capacity >= 10 THEN 'VIP (10+ seater) - Events & parties'
    ELSE 'Other'
  END as table_type,
  CASE 
    WHEN status = 'vacant' THEN 'Available for booking'
    WHEN status = 'reserved' THEN 'Temporarily held'
    WHEN status = 'occupied' THEN 'Currently in use'
    WHEN status = 'maintenance' THEN 'Out of service'
  END as status_description
FROM restaurant_tables
ORDER BY table_number;

-- =====================================================
-- PART 2: CREATE SMART AVAILABILITY FUNCTION
-- =====================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS is_table_available_for_booking(UUID, DATE, TIME);

-- Create enhanced availability check function
CREATE OR REPLACE FUNCTION is_table_available_for_booking(
  target_table_id UUID,
  target_date DATE,
  target_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
  is_available BOOLEAN;
  conflict_count INTEGER;
BEGIN
  -- Check if there are any conflicting bookings
  -- A booking conflicts if:
  -- 1. Same table
  -- 2. Same date
  -- 3. Within 1.5 hour window (booking duration assumed to be 90 minutes)
  -- 4. Status is confirmed or pending (not cancelled)
  
  SELECT COUNT(*) INTO conflict_count
  FROM table_bookings tb
  WHERE tb.table_id = target_table_id
    AND tb.booking_date = target_date
    AND tb.status IN ('confirmed', 'pending')
    AND (
      -- Check if times overlap (considering 90-minute dining duration)
      (target_time >= tb.booking_time::TIME AND target_time < (tb.booking_time::TIME + INTERVAL '90 minutes'))
      OR
      (tb.booking_time::TIME <= (target_time + INTERVAL '90 minutes') AND tb.booking_time::TIME > target_time)
      OR
      -- Also check if exact same time
      (target_time = tb.booking_time::TIME)
    );
  
  -- If no conflicts found, table is available
  is_available := (conflict_count = 0);
  
  RETURN is_available;
END;
$$ LANGUAGE plpgsql;

-- Comment the function
COMMENT ON FUNCTION is_table_available_for_booking IS 
'Checks if a table is available for booking at a specific date and time.
 Considers 90-minute dining duration to prevent overlapping bookings.
 Returns TRUE if available, FALSE if booked.';

-- =====================================================
-- PART 3: CREATE FUNCTION TO GET AVAILABLE TABLES
-- =====================================================

-- Drop old function if exists
DROP FUNCTION IF EXISTS get_available_tables_for_booking(DATE, TIME, INTEGER);

-- Create function to get all available tables for given criteria
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
    AND rt.status IN ('vacant', 'reserved') -- Exclude tables under maintenance
  ORDER BY rt.capacity ASC, rt.table_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Comment the function
COMMENT ON FUNCTION get_available_tables_for_booking IS 
'Returns all tables that can accommodate a booking for specified date, time, and guest count.
 Includes availability status for each table.
 Usage: SELECT * FROM get_available_tables_for_booking(''2026-03-21'', ''22:00'', 4);';

-- =====================================================
-- PART 4: CREATE HELPER VIEW FOR QUICK CHECKS
-- =====================================================

-- Create view to show today's booking schedule
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

-- Comment the view
COMMENT ON VIEW todays_booking_schedule IS 
'Shows all bookings for today with table and customer details.
 Useful for staff to see daily reservations at a glance.';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- Then test the availability checking!
-- =====================================================
