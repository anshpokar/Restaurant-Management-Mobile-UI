-- =====================================================
-- CREATE RPC FUNCTION TO GET SESSION BY ID
-- =====================================================
-- This bypasses RLS and directly returns session data
-- =====================================================

CREATE OR REPLACE FUNCTION get_session_by_id(session_id UUID)
RETURNS TABLE (
  id UUID,
  table_id UUID,
  user_id UUID,
  session_name TEXT,
  session_status TEXT,
  payment_status TEXT,
  payment_method TEXT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  payment_completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER -- This bypasses RLS!
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.table_id,
    ds.user_id,
    ds.session_name,
    ds.session_status,
    ds.payment_status,
    ds.payment_method,
    ds.total_amount,
    ds.paid_amount,
    ds.started_at,
    ds.completed_at,
    ds.payment_completed_at,
    ds.notes,
    ds.created_at,
    ds.updated_at
  FROM dine_in_sessions ds
  WHERE ds.id = session_id;
END;
$$;

-- Grant execute to all authenticated users
GRANT EXECUTE ON FUNCTION get_session_by_id(UUID) TO authenticated;

-- Test the function
/*
SELECT * FROM get_session_by_id('YOUR-SESSION-ID-HERE');
*/

-- Example test with one of your active sessions:
/*
SELECT * FROM get_session_by_id('7dab5727-faf0-45e5-91b6-748eca88d2ee');
*/
