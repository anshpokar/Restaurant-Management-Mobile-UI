-- =====================================================
-- ADD TIME-SLOT RESERVATION SYSTEM TO RESTAURANT_TABLES
-- =====================================================
-- Adds columns to track when tables are reserved/available
-- Allows automatic availability based on time windows
-- =====================================================

-- Step 1: Add time-slot columns to restaurant_tables
ALTER TABLE restaurant_tables 
ADD COLUMN IF NOT EXISTS is_reserved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reservation_start_time TIME,
ADD COLUMN IF NOT EXISTS reservation_end_time TIME,
ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN restaurant_tables.is_reserved IS 'Whether table is currently reserved';
COMMENT ON COLUMN restaurant_tables.reservation_start_time IS 'Start time of current reservation';
COMMENT ON COLUMN restaurant_tables.reservation_end_time IS 'End time of current reservation';
COMMENT ON COLUMN restaurant_tables.auto_release_at IS 'When to automatically release the table if not used';

-- Step 2: Create function to check and auto-release expired reservations
CREATE OR REPLACE FUNCTION auto_release_expired_tables()
RETURNS VOID AS $$
BEGIN
  -- Release tables whose reservation time has passed
  UPDATE restaurant_tables
  SET 
    is_reserved = FALSE,
    reservation_start_time = NULL,
    reservation_end_time = NULL,
    auto_release_at = NULL,
    status = 'available'
  WHERE auto_release_at IS NOT NULL 
    AND auto_release_at <= NOW();
  
  RAISE NOTICE 'Released % expired table reservations', FOUND;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create scheduled function to auto-release expired tables
-- (Run this periodically or call it manually)
CREATE OR REPLACE FUNCTION release_expired_table_reservations()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count how many we're about to release
  SELECT COUNT(*) INTO v_count
  FROM restaurant_tables
  WHERE is_reserved = TRUE 
    AND auto_release_at IS NOT NULL 
    AND auto_release_at <= NOW();
  
  -- Release expired reservations
  UPDATE restaurant_tables
  SET 
    is_reserved = FALSE,
    reservation_start_time = NULL,
    reservation_end_time = NULL,
    auto_release_at = NULL,
    status = 'available'
  WHERE is_reserved = TRUE 
    AND auto_release_at IS NOT NULL 
    AND auto_release_at <= NOW();
  
  IF v_count > 0 THEN
    RAISE NOTICE 'Released % expired table reservations', v_count;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_expired_table_reservations IS 
'Releases all tables whose auto_release_at time has passed. Call this periodically.';

-- Step 4: Create view to show tables with their time slots (auto-calculates expired)
CREATE OR REPLACE VIEW tables_with_time_slots AS
SELECT 
  rt.*,
  CASE 
    WHEN rt.is_reserved = TRUE AND rt.auto_release_at > NOW() THEN 
      CONCAT(
        COALESCE(rt.reservation_start_time::TEXT, 'N/A'), 
        ' - ', 
        COALESCE(rt.reservation_end_time::TEXT, 'N/A')
      )
    ELSE 'Available anytime'
  END as reservation_window,
  CASE 
    WHEN rt.is_reserved = TRUE AND rt.auto_release_at > NOW() THEN 'RESERVED'
    WHEN rt.is_reserved = TRUE AND rt.auto_release_at <= NOW() THEN 'EXPIRED (auto-releasing)'
    ELSE 'AVAILABLE'
  END as real_time_status
FROM restaurant_tables rt;

-- Step 5: Create function to reserve a table for a specific time slot
CREATE OR REPLACE FUNCTION reserve_table_for_time_slot(
  p_table_id UUID,
  p_start_time TIME,
  p_end_time TIME,
  p_duration_minutes INTEGER DEFAULT 90
) RETURNS BOOLEAN AS $$
DECLARE
  v_auto_release_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate auto-release time (end time + 15 minutes grace period)
  v_auto_release_at := CURRENT_DATE + p_end_time + INTERVAL '15 minutes';
  
  -- Check if table is already reserved for overlapping time
  IF EXISTS (
    SELECT 1 FROM restaurant_tables
    WHERE id = p_table_id
      AND is_reserved = TRUE
      AND auto_release_at > NOW()
      AND (
        (p_start_time >= reservation_start_time AND p_start_time < reservation_end_time)
        OR
        (p_end_time > reservation_start_time AND p_end_time <= reservation_end_time)
        OR
        (p_start_time <= reservation_start_time AND p_end_time >= reservation_end_time)
      )
  ) THEN
    RETURN FALSE; -- Table not available
  END IF;
  
  -- Reserve the table
  UPDATE restaurant_tables
  SET 
    is_reserved = TRUE,
    reservation_start_time = p_start_time,
    reservation_end_time = p_end_time,
    auto_release_at = v_auto_release_at,
    status = 'reserved'
  WHERE id = p_table_id;
  
  RETURN TRUE; -- Successfully reserved
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update get_available_tables_for_booking to consider time slots
DROP FUNCTION IF EXISTS get_available_tables_for_booking(DATE, TIME, INTEGER);

CREATE OR REPLACE FUNCTION get_available_tables_for_booking(
  p_date DATE,
  p_time TIME,
  p_min_guests INTEGER DEFAULT 1
) RETURNS TABLE (
  p_id UUID,
  p_table_number INTEGER,
  p_capacity INTEGER,
  p_status TEXT,
  p_is_available BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rt.id as p_id,
    rt.table_number as p_table_number,
    rt.capacity as p_capacity,
    -- Only show 'reserved' status if actually reserved (not expired)
    CASE 
      WHEN rt.is_reserved = TRUE AND rt.auto_release_at > NOW() THEN 'reserved'
      ELSE 'available'
    END::TEXT as p_status,
    CASE 
      -- Table is NOT available if:
      -- 1. It's reserved AND not expired AND
      -- 2. The requested time falls within the reservation window
      WHEN rt.is_reserved = TRUE 
        AND rt.auto_release_at > NOW()
        AND (
          (p_time >= rt.reservation_start_time AND p_time < rt.reservation_end_time)
          OR
          (p_time + INTERVAL '90 minutes' > rt.reservation_start_time 
           AND p_time + INTERVAL '90 minutes' <= rt.reservation_end_time)
        )
      THEN FALSE  -- Table is reserved during this time
      ELSE TRUE   -- Table is available (including expired reservations)
    END as p_is_available
  FROM restaurant_tables rt
  WHERE rt.capacity >= p_min_guests
  ORDER BY rt.table_number ASC;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Test the system
SELECT 'Testing Time-Slot Reservation System' as test_info;

-- Test 1: Show all tables with their time slots
SELECT * FROM tables_with_time_slots;

-- Test 2: Try to reserve a table
-- SELECT reserve_table_for_time_slot(
--   (SELECT id FROM restaurant_tables WHERE table_number = 5 LIMIT 1),
--   TIME '19:00',
--   TIME '21:00',
--   120
-- );

-- Test 3: Check availability
-- SELECT * FROM get_available_tables_for_booking(
--   CURRENT_DATE,
--   TIME '20:00',
--   4
-- );

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

/*
SCENARIO 1: Customer books Table #5 for 7:00 PM - 9:00 PM

SQL:
SELECT reserve_table_for_time_slot(
  'table-5-id',
  TIME '19:00',
  TIME '21:00',
  120
);

Result:
- Table #5 marked as reserved
- reservation_start_time: 19:00
- reservation_end_time: 21:00
- auto_release_at: Today at 21:15 (end + 15 min grace)
- Other customers CANNOT book 7:00-9:00 PM slot

SCENARIO 2: Customer tries to book same table for 8:00 PM

SQL:
SELECT * FROM get_available_tables_for_booking(
  CURRENT_DATE,
  TIME '20:00',
  4
);

Result:
- Table #5 shows is_available = FALSE
- Other tables show is_available = TRUE

SCENARIO 3: Customer doesn't show up, auto-release kicks in

At 21:15 (grace period ends):
- Trigger automatically sets is_reserved = FALSE
- Table becomes available again
- No manual intervention needed!

SCENARIO 4: Back-to-back reservations

Table #10:
- Booking A: 6:00-7:30 PM (reserved via this system)
- Booking B: 7:30-9:00 PM (can be reserved, no overlap!)

Both bookings can coexist!
*/

-- =====================================================
-- ADMIN HELPER FUNCTIONS
-- =====================================================

-- View all current reservations
CREATE OR REPLACE VIEW current_table_reservations AS
SELECT 
  rt.table_number,
  rt.reservation_start_time,
  rt.reservation_end_time,
  rt.auto_release_at,
  EXTRACT(EPOCH FROM (rt.auto_release_at - NOW())) / 60 as minutes_until_release,
  CASE 
    WHEN rt.auto_release_at > NOW() THEN 'ACTIVE'
    ELSE 'EXPIRED'
  END as reservation_status
FROM restaurant_tables rt
WHERE rt.is_reserved = TRUE
ORDER BY rt.auto_release_at ASC;

-- Manually release a specific table
CREATE OR REPLACE FUNCTION manually_release_table(p_table_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE restaurant_tables
  SET 
    is_reserved = FALSE,
    reservation_start_time = NULL,
    reservation_end_time = NULL,
    auto_release_at = NULL,
    status = 'available'
  WHERE id = p_table_id;
  
  RAISE NOTICE 'Table % manually released', p_table_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- Then test reserving tables with time slots!
-- =====================================================
