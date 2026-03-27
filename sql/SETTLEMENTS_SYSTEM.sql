-- =====================================================
-- ADVANCED SETTLEMENT & EARNINGS SYSTEM
-- =====================================================

-- 1. Create Unified Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('cash_collection', 'earnings_payout')),
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone,
  CONSTRAINT settlements_pkey PRIMARY KEY (id)
);

-- 2. RLS Policies
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all settlements" 
ON public.settlements FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can insert settlements" 
ON public.settlements FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Drivers can view their own settlements" 
ON public.settlements FOR SELECT 
USING (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own settlement status (confirm/reject)" 
ON public.settlements FOR UPDATE 
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());

-- 3. RPC: Initiate Settlement (Admin)
CREATE OR REPLACE FUNCTION public.initiate_settlement(
  p_driver_id uuid,
  p_type text,
  p_amount numeric,
  p_notes text DEFAULT ''
)
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
  v_pending_exists boolean;
BEGIN
  -- Check for existing pending settlement of same type
  SELECT EXISTS (
    SELECT 1 FROM public.settlements 
    WHERE driver_id = p_driver_id AND type = p_type AND status = 'pending'
  ) INTO v_pending_exists;

  IF v_pending_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'A pending request of this type already exists for this driver.');
  END IF;

  INSERT INTO public.settlements (driver_id, admin_id, type, amount, notes)
  VALUES (p_driver_id, auth.uid(), p_type, p_amount, p_notes)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'settlement_id', v_id);
END;
$$ LANGUAGE plpgsql;

-- 4. RPC: Confirm Settlement (Driver)
-- This actually updates the balances once the driver clicks "Confirm"
CREATE OR REPLACE FUNCTION public.confirm_settlement(
  p_settlement_id uuid
)
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
  v_driver_id uuid;
  v_amount numeric;
  v_type text;
BEGIN
  -- 1. Get and Lock settlement record
  SELECT driver_id, amount, type INTO v_driver_id, v_amount, v_type
  FROM public.settlements
  WHERE id = p_settlement_id AND status = 'pending' AND driver_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settlement not found or already processed');
  END IF;

  -- 2. Apply Balance Updates
  IF v_type = 'cash_collection' THEN
    -- Driver handed cash to Admin
    UPDATE public.profiles
    SET 
      cash_collected = GREATEST(0, cash_collected - v_amount),
      total_earnings = GREATEST(0, total_earnings - (SELECT LEAST(total_earnings, v_amount) FROM public.profiles WHERE id = v_driver_id))
    WHERE id = v_driver_id;
  ELSIF v_type = 'earnings_payout' THEN
    -- Admin paid the driver (e.g. UPI)
    -- This would typically reduce 'unpaid_earnings', but since we use total_earnings as the balance:
    UPDATE public.profiles
    SET total_earnings = GREATEST(0, total_earnings - v_amount)
    WHERE id = v_driver_id;
  END IF;

  -- 3. Mark as confirmed
  UPDATE public.settlements
  SET 
    status = 'confirmed',
    confirmed_at = now(),
    updated_at = now()
  WHERE id = p_settlement_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- 5. RPC: Reject Settlement (Driver)
CREATE OR REPLACE FUNCTION public.reject_settlement(
  p_settlement_id uuid,
  p_reason text
)
RETURNS jsonb
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.settlements
  SET 
    status = 'rejected',
    notes = COALESCE(notes, '') || ' [Rejected: ' || p_reason || ']',
    updated_at = now()
  WHERE id = p_settlement_id AND status = 'pending' AND driver_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- Grants
GRANT EXECUTE ON FUNCTION public.initiate_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_settlement TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_settlement TO authenticated;
