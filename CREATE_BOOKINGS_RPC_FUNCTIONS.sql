-- =====================================================
-- TABLE BOOKINGS - RPC FUNCTIONS
-- =====================================================
-- These functions are used by the Admin Bookings Screen
-- to fetch and manage table bookings efficiently
-- =====================================================

-- 1. Get all bookings with complete details
CREATE OR REPLACE FUNCTION get_all_bookings_with_details()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  table_id UUID,
  booking_date DATE,
  booking_time TIME,
  guests_count INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  phone_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  occasion TEXT,
  special_requests TEXT,
  booking_duration INTEGER,
  restaurant_table JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tb.id,
    tb.user_id,
    tb.table_id,
    tb.booking_date,
    tb.booking_time,
    tb.guests_count,
    tb.status,
    tb.created_at,
    tb.updated_at,
    tb.phone_number,
    tb.customer_name,
    tb.customer_email,
    tb.occasion,
    tb.special_requests,
    tb.booking_duration,
    jsonb_build_object(
      'id', rt.id,
      'table_number', rt.table_number,
      'capacity', rt.capacity,
      'status', rt.status
    ) as restaurant_table
  FROM table_bookings tb
  LEFT JOIN restaurant_tables rt ON rt.id = tb.table_id
  ORDER BY tb.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_all_bookings_with_details IS 
'Returns all table bookings with complete details including restaurant table information';

-- 2. Get today's bookings only
CREATE OR REPLACE FUNCTION get_todays_bookings()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  table_id UUID,
  booking_date DATE,
  booking_time TIME,
  guests_count INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  phone_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  occasion TEXT,
  special_requests TEXT,
  booking_duration INTEGER,
  restaurant_table JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tb.id,
    tb.user_id,
    tb.table_id,
    tb.booking_date,
    tb.booking_time,
    tb.guests_count,
    tb.status,
    tb.created_at,
    tb.updated_at,
    tb.phone_number,
    tb.customer_name,
    tb.customer_email,
    tb.occasion,
    tb.special_requests,
    tb.booking_duration,
    jsonb_build_object(
      'id', rt.id,
      'table_number', rt.table_number,
      'capacity', rt.capacity,
      'status', rt.status
    ) as restaurant_table
  FROM table_bookings tb
  LEFT JOIN restaurant_tables rt ON rt.id = tb.table_id
  WHERE tb.booking_date = CURRENT_DATE
  ORDER BY tb.booking_time ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_todays_bookings IS 
'Returns only today''s table bookings ordered by time';

-- 3. Get upcoming bookings (future dates only)
CREATE OR REPLACE FUNCTION get_upcoming_bookings()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  table_id UUID,
  booking_date DATE,
  booking_time TIME,
  guests_count INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  phone_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  occasion TEXT,
  special_requests TEXT,
  booking_duration INTEGER,
  restaurant_table JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tb.id,
    tb.user_id,
    tb.table_id,
    tb.booking_date,
    tb.booking_time,
    tb.guests_count,
    tb.status,
    tb.created_at,
    tb.updated_at,
    tb.phone_number,
    tb.customer_name,
    tb.customer_email,
    tb.occasion,
    tb.special_requests,
    tb.booking_duration,
    jsonb_build_object(
      'id', rt.id,
      'table_number', rt.table_number,
      'capacity', rt.capacity,
      'status', rt.status
    ) as restaurant_table
  FROM table_bookings tb
  LEFT JOIN restaurant_tables rt ON rt.id = tb.table_id
  WHERE tb.booking_date > CURRENT_DATE
    AND tb.status IN ('pending', 'confirmed')
  ORDER BY tb.booking_date ASC, tb.booking_time ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_upcoming_bookings IS 
'Returns future table bookings that are pending or confirmed';

-- =====================================================
-- HELPER FUNCTIONS FOR BOOKING MANAGEMENT
-- =====================================================

-- 4. Get pending bookings count (for dashboard)
CREATE OR REPLACE FUNCTION get_pending_bookings_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM table_bookings
    WHERE status = 'pending'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_bookings_count IS 
'Returns count of pending table bookings for dashboard stats';

-- 5. Get bookings statistics
CREATE OR REPLACE FUNCTION get_bookings_statistics()
RETURNS TABLE (
  total_bookings BIGINT,
  pending_bookings BIGINT,
  confirmed_bookings BIGINT,
  cancelled_bookings BIGINT,
  completed_bookings BIGINT,
  todays_bookings BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE TRUE) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
    COUNT(*) FILTER (WHERE booking_date = CURRENT_DATE) as todays_bookings
  FROM table_bookings;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_bookings_statistics IS 
'Returns comprehensive booking statistics for admin dashboard';

-- =====================================================
-- TESTING QUERIES
-- =====================================================

-- Test all functions
SELECT 'Testing get_all_bookings_with_details:' as test;
SELECT * FROM get_all_bookings_with_details() LIMIT 5;

SELECT 'Testing get_todays_bookings:' as test;
SELECT * FROM get_todays_bookings();

SELECT 'Testing get_upcoming_bookings:' as test;
SELECT * FROM get_upcoming_bookings();

SELECT 'Testing get_pending_bookings_count:' as test;
SELECT get_pending_bookings_count();

SELECT 'Testing get_bookings_statistics:' as test;
SELECT * FROM get_bookings_statistics();

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- These functions will enable the admin bookings screen to work properly
-- =====================================================
