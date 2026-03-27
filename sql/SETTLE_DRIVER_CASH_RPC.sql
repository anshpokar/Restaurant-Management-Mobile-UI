-- =====================================================
-- RPC FOR ATOMIC DRIVER CASH SETTLEMENT
-- =====================================================
-- This function handles the entire settlement process
-- in a single transaction to prevent race conditions.
-- =====================================================

CREATE OR REPLACE FUNCTION public.settle_driver_cash(
  p_driver_id uuid,
  p_amount numeric,
  p_notes text DEFAULT ''
)
RETURNS jsonb
SECURITY DEFINER -- Runs with owner privileges (admin)
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- 1. Insert history record
  INSERT INTO public.cash_settlements (
    delivery_person_id,
    amount,
    settled_by,
    notes,
    created_at
  ) VALUES (
    p_driver_id,
    p_amount,
    auth.uid(),
    p_notes,
    now()
  );

  -- 2. Update driver profile
  -- We zero out both because the driver has effectively 
  -- 'paid' themselves their earnings from the collected cash 
  -- and handed the remainder to the admin.
  UPDATE public.profiles
  SET 
    cash_collected = 0,
    total_earnings = 0
  WHERE id = p_driver_id;

  v_result := jsonb_build_object('success', true);
  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users (admins)
GRANT EXECUTE ON FUNCTION public.settle_driver_cash TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_driver_cash TO service_role;
