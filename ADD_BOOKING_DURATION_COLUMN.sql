-- =====================================================
-- ENHANCED BOOKING DURATION SYSTEM
-- =====================================================
-- Adds booking_duration column to table_bookings
-- Allows precise time-slot management
-- Prevents unnecessary table blocking
-- =====================================================

-- Step 1: Add booking_duration column (in minutes)
ALTER TABLE table_bookings 
ADD COLUMN IF NOT EXISTS booking_duration INTEGER DEFAULT 90;

-- Add comment
COMMENT ON COLUMN table_bookings.booking_duration IS 'Duration of booking in minutes (default 90)';

-- Step 2: Drop old availability function
DROP FUNCTION IF EXISTS is_table_available_for_booking(UUID, DATE, TIME);

-- Step 3: Create NEW enhanced availability function with duration support
CREATE OR REPLACE FUNCTION is_table_available_for_booking(
  target_table_id UUID,
  target_date DATE,
  target_time TIME,
  target_duration INTEGER DEFAULT 90
) RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for overlapping bookings
  SELECT COUNT(*) INTO conflict_count
  FROM table_bookings tb
  WHERE tb.table_id = target_table_id
    AND tb.booking_date = target_date
    AND tb.status IN ('confirmed', 'pending')
    AND (
      -- New booking starts during existing booking
      (target_time >= tb.booking_time::TIME AND target_time < (tb.booking_time::TIME + (tb.booking_duration || ' minutes')::INTERVAL))
      OR
      -- New booking ends during existing booking
      ((target_time + (target_duration || ' minutes')::INTERVAL) > tb.booking_time::TIME 
       AND (target_time + (target_duration || ' minutes')::INTERVAL) <= (tb.booking_time::TIME + (tb.booking_duration || ' minutes')::INTERVAL))
      OR
      -- New booking completely encompasses existing booking
      (target_time <= tb.booking_time::TIME AND (target_time + (target_duration || ' minutes')::INTERVAL) >= (tb.booking_time::TIME + (tb.booking_duration || ' minutes')::INTERVAL))
    );
  
  RETURN (conflict_count = 0);
END;
$$ LANGUAGE plpgsql;

-- Comment the function
COMMENT ON FUNCTION is_table_available_for_booking IS 
'Checks if table is available considering actual booking durations.
 Parameters: table_id, date, time, duration_in_minutes (default 90).
 Returns TRUE if no conflicts, FALSE if time slots overlap.';

-- Step 4: Drop old get_available_tables function
DROP FUNCTION IF EXISTS get_available_tables_for_booking(DATE, TIME, INTEGER);

-- Step 5: Create NEW enhanced get_available_tables function with duration
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
    is_table_available_for_booking(rt.id, target_date, target_time, duration) as is_available
  FROM restaurant_tables rt
  WHERE rt.capacity >= min_guests
    AND rt.status IN ('vacant', 'reserved')
  ORDER BY rt.capacity ASC, rt.table_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Comment the function
COMMENT ON FUNCTION get_available_tables_for_booking IS 
'Returns tables with real-time availability based on actual booking durations.
 Parameters: date, time, min_guests, duration_minutes (default 90).
 Usage: SELECT * FROM get_available_tables_for_booking(''2026-03-21'', ''20:00'', 4, 120);';

-- Step 6: Update existing bookings to have 90-minute duration
UPDATE table_bookings 
SET booking_duration = 90 
WHERE booking_duration IS NULL;

-- Step 7: Create view to show bookings with end times
CREATE OR REPLACE VIEW bookings_with_end_times AS
SELECT 
  tb.*,
  rt.table_number,
  tb.booking_time as start_time,
  (tb.booking_time::TIME + (tb.booking_duration || ' minutes')::INTERVAL)::TIME as end_time,
  rt.capacity
FROM table_bookings tb
JOIN restaurant_tables rt ON tb.table_id = rt.id
ORDER BY tb.booking_date, tb.booking_time;

-- Comment the view
COMMENT ON VIEW bookings_with_end_times IS 
'Shows all bookings with calculated end times based on duration.
 Useful for visualizing actual table occupancy windows.';

-- Step 8: Test the new functions
SELECT 'Testing Enhanced Availability System' as test_info;

-- Test 1: Check if column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'table_bookings' AND column_name = 'booking_duration';

-- Test 2: Show current bookings with end times
SELECT * FROM bookings_with_end_times LIMIT 5;

-- Test 3: Test availability with different durations
SELECT 
  'Test: Can we book table #1 on 2026-03-21 at 20:00 for 60 minutes?' as test,
  is_table_available_for_booking(
    (SELECT id FROM restaurant_tables WHERE table_number = 1 LIMIT 1),
    DATE '2026-03-21',
    TIME '20:00',
    60  -- 60 minutes only
  ) as result;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
SCENARIO 1: Standard 90-minute booking
Customer wants table for dinner (default duration)
→ Uses: duration = 90 (default)

SCENARIO 2: Quick lunch (60 minutes)
Customer wants quick business lunch
→ Uses: duration = 60

SCENARIO 3: Long celebration (120 minutes)
Customer celebrating birthday, needs extra time
→ Uses: duration = 120

SCENARIO 4: Back-to-back bookings
Table #5:
- Booking A: 8:00 PM - 9:30 PM (90 min)
- Booking B: 9:30 PM - 11:00 PM (90 min) ← Should be allowed!

Before: Would block 8:00-11:00 for both
After: Correctly allows 9:30 booking since A ends at 9:30
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- Then update frontend code to send booking_duration
-- =====================================================
