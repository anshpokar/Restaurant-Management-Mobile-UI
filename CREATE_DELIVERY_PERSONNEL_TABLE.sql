-- =====================================================
-- DELIVERY PERSONNEL TABLE
-- Stores delivery person availability and duty status
-- =====================================================

-- Create delivery_personnel table
CREATE TABLE IF NOT EXISTS delivery_personnel (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_on_duty BOOLEAN DEFAULT FALSE,
    current_order_id UUID REFERENCES orders(id),
    rating DECIMAL(3, 2) DEFAULT 5.00,
    total_deliveries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast availability queries
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_availability ON delivery_personnel(is_available, is_on_duty);
CREATE INDEX IF NOT EXISTS idx_delivery_personnel_profile ON delivery_personnel(profile_id);

-- Enable RLS
ALTER TABLE delivery_personnel ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view delivery personnel (for order assignment)
CREATE POLICY "Anyone can view delivery personnel"
ON delivery_personnel FOR SELECT
USING (true);

-- Delivery persons can update their own status
CREATE POLICY "Delivery persons can update own status"
ON delivery_personnel FOR UPDATE
USING (auth.uid() = profile_id);

-- Authenticated users can insert their own profile
CREATE POLICY "Users can insert own delivery profile"
ON delivery_personnel FOR INSERT
WITH CHECK (auth.uid() = profile_id);

-- =====================================================
-- FUNCTION TO AUTO-ASSIGN ORDERS TO AVAILABLE DELIVERY PERSON
-- =====================================================

CREATE OR REPLACE FUNCTION assign_order_to_delivery(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
    v_delivery_person_id UUID;
    v_order_lat DECIMAL;
    v_order_lon DECIMAL;
BEGIN
    -- Get order location
    SELECT delivery_latitude, delivery_longitude 
    INTO v_order_lat, v_order_lon
    FROM orders 
    WHERE id = p_order_id;
    
    -- Find nearest available delivery person
    SELECT dp.profile_id
    INTO v_delivery_person_id
    FROM delivery_personnel dp
    WHERE dp.is_available = TRUE 
      AND dp.is_on_duty = TRUE
      AND dp.current_order_id IS NULL
    ORDER BY RANDOM() -- For now, random selection. Can be enhanced with distance calculation
    LIMIT 1;
    
    -- If found, assign the order
    IF v_delivery_person_id IS NOT NULL THEN
        -- Update order with delivery person
        UPDATE orders 
        SET 
            delivery_person_id = v_delivery_person_id,
            status = 'out_for_delivery'
        WHERE id = p_order_id;
        
        -- Update delivery person status
        UPDATE delivery_personnel 
        SET 
            is_available = FALSE,
            current_order_id = p_order_id,
            updated_at = NOW()
        WHERE profile_id = v_delivery_person_id;
        
        -- Create delivery assignment record
        INSERT INTO delivery_assignments (order_id, delivery_person_id, status)
        VALUES (p_order_id, v_delivery_person_id, 'assigned');
    END IF;
    
    RETURN v_delivery_person_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER TO AUTO-ASSIGN ORDERS WHEN STATUS CHANGES TO PREPARED
-- =====================================================

CREATE OR REPLACE FUNCTION trigger_auto_assign_delivery()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when order status changes to 'prepared'
    IF NEW.status = 'prepared' AND OLD.status != 'prepared' THEN
        -- Call assignment function
        PERFORM assign_order_to_delivery(NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS auto_assign_delivery_trigger ON orders;
CREATE TRIGGER auto_assign_delivery_trigger
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'prepared' AND OLD.status IS DISTINCT FROM 'prepared')
EXECUTE FUNCTION trigger_auto_assign_delivery();

-- =====================================================
-- FUNCTION TO MARK DELIVERY PERSON AS AVAILABLE AFTER DELIVERY
-- =====================================================

CREATE OR REPLACE FUNCTION complete_delivery_and_free_person(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
    v_delivery_person_id UUID;
BEGIN
    -- Get the delivery person ID from the order
    SELECT delivery_person_id 
    INTO v_delivery_person_id
    FROM orders 
    WHERE id = p_order_id;
    
    -- Update order status
    UPDATE orders 
    SET status = 'delivered',
        delivered_at = NOW()
    WHERE id = p_order_id;
    
    -- Free up the delivery person
    IF v_delivery_person_id IS NOT NULL THEN
        UPDATE delivery_personnel 
        SET 
            is_available = TRUE,
            current_order_id = NULL,
            total_deliveries = total_deliveries + 1,
            updated_at = NOW()
        WHERE profile_id = v_delivery_person_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HELPER FUNCTION TO UPDATE DELIVERY PERSON STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION update_delivery_person_status(
    p_is_available BOOLEAN,
    p_is_on_duty BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    -- Upsert delivery personnel record
    INSERT INTO delivery_personnel (profile_id, is_available, is_on_duty)
    VALUES (auth.uid(), p_is_available, p_is_on_duty)
    ON CONFLICT (profile_id) 
    DO UPDATE SET
        is_available = p_is_available,
        is_on_duty = p_is_on_duty,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEW FOR AVAILABLE DELIVERY PERSONS
-- =====================================================

CREATE OR REPLACE VIEW available_delivery_persons AS
SELECT 
    dp.id,
    dp.profile_id,
    p.full_name,
    p.email,
    p.phone,
    dp.is_available,
    dp.is_on_duty,
    dp.current_order_id,
    dp.rating,
    dp.total_deliveries,
    dp.updated_at
FROM delivery_personnel dp
LEFT JOIN profiles p ON dp.profile_id = p.id
WHERE dp.is_available = TRUE 
  AND dp.is_on_duty = TRUE
  AND dp.current_order_id IS NULL;

COMMENT ON TABLE delivery_personnel IS 'Tracks delivery person availability, duty status, and current assignments';
COMMENT ON COLUMN delivery_personnel.is_available IS 'Whether delivery person is free to take new orders';
COMMENT ON COLUMN delivery_personnel.is_on_duty IS 'Whether delivery person is currently on shift';
COMMENT ON COLUMN delivery_personnel.current_order_id IS 'Current order being delivered (if any)';
