-- Production Delivery System Improvements
-- To be applied to the Supabase database

-- 1. Extend Profiles with Driver fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_earnings numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS cash_collected numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_on_duty boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_location_update timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_latitude numeric,
ADD COLUMN IF NOT EXISTS current_longitude numeric;

-- 2. Extend Orders with Delivery Tracking fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS otp text,
ADD COLUMN IF NOT EXISTS assignment_status text DEFAULT 'pending' 
  CHECK (assignment_status IN ('pending', 'assigned', 'accepted', 'rejected', 'timeout')),
ADD COLUMN IF NOT EXISTS restaurant_latitude numeric DEFAULT 19.1669,
ADD COLUMN IF NOT EXISTS restaurant_longitude numeric DEFAULT 73.2359,
ADD COLUMN IF NOT EXISTS picked_up_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- 3. Create Cash Settlements Table
CREATE TABLE IF NOT EXISTS public.cash_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_person_id uuid REFERENCES public.profiles(id),
  amount numeric NOT NULL,
  settled_by uuid REFERENCES public.profiles(id),
  settled_at timestamp with time zone DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on cash_settlements
ALTER TABLE public.cash_settlements ENABLE ROW LEVEL SECURITY;

-- Policies for cash_settlements
CREATE POLICY "Admins can manage settlements" 
ON public.cash_settlements FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Drivers can view their own settlements" 
ON public.cash_settlements FOR SELECT 
USING (delivery_person_id = auth.uid());

-- 4. Create Delivery Tracking History (High frequency location updates)
CREATE TABLE IF NOT EXISTS public.delivery_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  delivery_person_id uuid REFERENCES public.profiles(id),
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  recorded_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on delivery_locations
ALTER TABLE public.delivery_locations ENABLE ROW LEVEL SECURITY;

-- Policies for delivery_locations
CREATE POLICY "Public viewing for tracking (with order ID)" 
ON public.delivery_locations FOR SELECT 
USING (true);

CREATE POLICY "Drivers can insert their own locations" 
ON public.delivery_locations FOR INSERT 
WITH CHECK (delivery_person_id = auth.uid());

-- 5. Trigger to handle Driver Earnings and Cash Collection on Delivery
DROP FUNCTION IF EXISTS public.handle_delivery_completion() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_delivery_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivery_status = 'delivered' AND OLD.delivery_status != 'delivered' THEN
    -- 1. Add ₹30 to earnings
    UPDATE public.profiles 
    SET total_earnings = total_earnings + 30,
        total_deliveries = total_deliveries + 1
    WHERE id = NEW.delivery_person_id;

    -- 2. If COD, add order amount to cash_collected
    IF NEW.payment_method = 'cod' THEN
      UPDATE public.profiles 
      SET cash_collected = cash_collected + NEW.total_amount
      WHERE id = NEW.delivery_person_id;
    END IF;

    -- 3. Mark driver as available again
    UPDATE public.profiles 
    SET is_available = true 
    WHERE id = NEW.delivery_person_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_delivered
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_delivery_completion();

-- 6. RPC Function for nearest driver search
DROP FUNCTION IF EXISTS find_nearest_available_driver(numeric, numeric, numeric);
CREATE OR REPLACE FUNCTION find_nearest_available_driver(
  p_restaurant_lat numeric,
  p_restaurant_lng numeric,
  p_max_distance_km numeric DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  full_name text,
  distance_km numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    (6371 * acos(
      cos(radians(p_restaurant_lat)) * cos(radians(p.current_latitude)) * 
      cos(radians(p.current_longitude) - radians(p_restaurant_lng)) + 
      sin(radians(p_restaurant_lat)) * sin(radians(p.current_latitude))
    ))::numeric AS distance
  FROM 
    public.profiles p
  WHERE 
    p.role = 'delivery' 
    AND p.is_available = true 
    AND p.current_latitude IS NOT NULL
    AND p.current_longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(p_restaurant_lat)) * cos(radians(p.current_latitude)) * 
      cos(radians(p.current_longitude) - radians(p_restaurant_lng)) + 
      sin(radians(p_restaurant_lat)) * sin(radians(p.current_latitude))
    ))::numeric <= p_max_distance_km
  ORDER BY 
    distance ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 7. Add location and specific house fields to saved addresses
ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS flat_number text,
ADD COLUMN IF NOT EXISTS house_number text,
ADD COLUMN IF NOT EXISTS building_name text,
ALTER COLUMN state DROP NOT NULL,
ALTER COLUMN pincode DROP NOT NULL;

-- 8. Add metadata to notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- 9. Create Delivery Assignments Table
CREATE TABLE IF NOT EXISTS public.delivery_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) NOT NULL,
  delivery_person_id uuid REFERENCES public.profiles(id) NOT NULL,
  status text NOT NULL CHECK (status IN ('assigned', 'accepted', 'rejected', 'completed', 'cancelled')),
  assigned_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage assignments" ON public.delivery_assignments;
    CREATE POLICY "Admins can manage assignments" 
    ON public.delivery_assignments FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

    DROP POLICY IF EXISTS "Drivers can view their own assignments" ON public.delivery_assignments;
    CREATE POLICY "Drivers can view their own assignments" 
    ON public.delivery_assignments FOR SELECT 
    USING (delivery_person_id = auth.uid());
END $$;

-- 10. RPC to complete delivery assignment
DROP FUNCTION IF EXISTS complete_delivery_assignment(uuid);
CREATE OR REPLACE FUNCTION complete_delivery_assignment(p_order_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.delivery_assignments
  SET status = 'completed',
      completed_at = now()
  WHERE order_id = p_order_id AND status = 'assigned';
  
  -- Update order status too
  UPDATE public.orders
  SET delivery_status = 'delivered',
      delivered_at = now()
  WHERE id = p_order_id;

  -- Mark driver as available
  UPDATE public.profiles
  SET is_available = true
  WHERE id = (SELECT delivery_person_id FROM public.orders WHERE id = p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. RPC for Smart Auto-Assignment
DROP FUNCTION IF EXISTS auto_assign_delivery_smart(uuid);
CREATE OR REPLACE FUNCTION auto_assign_delivery_smart(order_id UUID)
RETURNS JSONB AS $$
DECLARE
    assigned_person_id UUID;
    order_lat numeric;
    order_lng numeric;
BEGIN
    -- Get order coordinates
    SELECT delivery_latitude, delivery_longitude 
    INTO order_lat, order_lng
    FROM orders 
    WHERE id = order_id;
    
    -- Find nearest available delivery person (reusing our existing function)
    SELECT id INTO assigned_person_id
    FROM find_nearest_available_driver(order_lat, order_lng, 5);
    
    IF assigned_person_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No riders available nearby');
    END IF;
    
    -- Update order
    UPDATE orders 
    SET 
        delivery_person_id = assigned_person_id,
        delivery_status = 'assigned',
        assigned_at = now()
    WHERE id = order_id;
    
    -- Create assignment record
    INSERT INTO delivery_assignments (order_id, delivery_person_id, status)
    VALUES (order_id, assigned_person_id, 'assigned');
    
    -- Send notification
    INSERT INTO notifications (user_id, title, message, type, metadata)
    VALUES (
        assigned_person_id,
        'New Delivery Task',
        'A new order is waiting for you.',
        'delivery_assignment',
        jsonb_build_object('order_id', order_id)
    );
    
    RETURN jsonb_build_object('success', true, 'rider_id', assigned_person_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Consolidate Triggers: Auto-assign when order is prepared
-- First, drop the old conflicting trigger if it exists
DROP TRIGGER IF EXISTS auto_assign_delivery_trigger ON orders;
DROP FUNCTION IF EXISTS trigger_auto_assign_delivery();
DROP FUNCTION IF EXISTS assign_order_to_delivery(uuid);

-- Create new consolidated trigger function
CREATE OR REPLACE FUNCTION public.handle_order_prepared_auto_assign()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger for delivery orders when status changes to 'prepared'
    IF NEW.order_type = 'delivery' AND NEW.status = 'prepared' AND OLD.status != 'prepared' THEN
        -- Call our smart auto-assign function
        PERFORM public.auto_assign_delivery_smart(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_order_prepared_auto_assign
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (NEW.status = 'prepared' AND OLD.status IS DISTINCT FROM 'prepared')
EXECUTE FUNCTION public.handle_order_prepared_auto_assign();

-- 13. Fix RLS for delivery_assignments to allow system-level insertions
-- Since functions are SECURITY DEFINER, they bypass RLS if owned by a bypassrls user (like postgres)
-- But to be safe for manual admin actions:
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.delivery_assignments;
CREATE POLICY "Admins can manage assignments" 
ON public.delivery_assignments FOR ALL 
USING (auth.jwt()->>'role' = 'service_role' OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow authenticated users (like Chefs via triggers) to insert assignments
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.delivery_assignments;
CREATE POLICY "Enable insert for authenticated users" 
ON public.delivery_assignments FOR INSERT 
TO authenticated 
WITH CHECK (true);
