-- =====================================================
-- PHASE 3: ADVANCED DELIVERY FEATURES - DATABASE MIGRATION
-- =====================================================
-- This migration adds Google Maps integration, auto-assignment,
-- live GPS tracking, route optimization, and Razorpay payment
-- =====================================================

-- =====================================================
-- 1. UPDATE PROFILES TABLE FOR DELIVERY TRACKING
-- =====================================================

-- Add delivery person location tracking columns
DO $$ 
BEGIN
    -- Add current latitude for delivery persons
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'current_latitude') THEN
        ALTER TABLE profiles ADD COLUMN current_latitude DECIMAL(10, 8);
    END IF;
    
    -- Add current longitude for delivery persons
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'current_longitude') THEN
        ALTER TABLE profiles ADD COLUMN current_longitude DECIMAL(11, 8);
    END IF;
    
    -- Add last location update timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_location_update') THEN
        ALTER TABLE profiles ADD COLUMN last_location_update TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add total deliveries completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'total_deliveries') THEN
        ALTER TABLE profiles ADD COLUMN total_deliveries INTEGER DEFAULT 0;
    END IF;
    
    -- Add rating for delivery persons
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'rating') THEN
        ALTER TABLE profiles ADD COLUMN rating DECIMAL(3, 2) DEFAULT 5.00;
    END IF;
END $$;

-- =====================================================
-- 2. DELIVERY PERSON LOCATIONS TABLE (GPS Tracking History)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_person_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    delivery_person_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy NUMERIC, -- GPS accuracy in meters
    speed NUMERIC, -- Speed in km/h
    bearing NUMERIC, -- Direction in degrees
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for fast location queries
CREATE INDEX IF NOT EXISTS idx_delivery_locations_person ON delivery_person_locations(delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_delivery_locations_time ON delivery_person_locations(recorded_at DESC);

-- =====================================================
-- 3. ENHANCE ORDERS TABLE FOR ADVANCED TRACKING
-- =====================================================

DO $$ 
BEGIN
    -- Add estimated delivery time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'estimated_delivery_time') THEN
        ALTER TABLE orders ADD COLUMN estimated_delivery_time TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add actual delivery time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'actual_delivery_time') THEN
        ALTER TABLE orders ADD COLUMN actual_delivery_time TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add distance to customer (km)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'distance_to_customer') THEN
        ALTER TABLE orders ADD COLUMN distance_to_customer NUMERIC;
    END IF;
    
    -- Add route polyline (encoded path for Google Maps)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'route_polyline') THEN
        ALTER TABLE orders ADD COLUMN route_polyline TEXT;
    END IF;
    
    -- Add Razorpay payment details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'razorpay_order_id') THEN
        ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'razorpay_signature') THEN
        ALTER TABLE orders ADD COLUMN razorpay_signature TEXT;
    END IF;
    
    -- Add customer rating for delivery
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_rating') THEN
        ALTER TABLE orders ADD COLUMN delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_feedback') THEN
        ALTER TABLE orders ADD COLUMN delivery_feedback TEXT;
    END IF;
END $$;

-- =====================================================
-- 4. AUTO-ASSIGNMENT CONFIGURATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default configuration
INSERT INTO delivery_config (config_key, config_value, description) VALUES
('auto_assignment', '{"enabled": true, "max_orders_per_person": 5, "radius_km": 5}', 'Auto-assignment settings'),
('delivery_charges', '{"base_charge": 40, "per_km_charge": 10, "free_above": 500}', 'Delivery charge calculation'),
('restaurant_location', '{"latitude": 28.6139, "longitude": 77.2090, "address": "Connaught Place, New Delhi"}', 'Restaurant coordinates')
ON CONFLICT (config_key) DO NOTHING;

-- =====================================================
-- 5. ADVANCED HELPER FUNCTIONS
-- =====================================================

-- Function to find nearest available delivery person
CREATE OR REPLACE FUNCTION find_nearest_delivery_person(
    p_latitude DECIMAL,
    p_longitude DECIMAL
) RETURNS UUID AS $$
DECLARE
    nearest_person_id UUID;
BEGIN
    SELECT id INTO nearest_person_id
    FROM profiles
    WHERE role = 'delivery'
      AND is_available = TRUE
      AND is_on_duty = TRUE
      AND current_latitude IS NOT NULL
      AND current_longitude IS NOT NULL
    ORDER BY calculate_distance(
        current_latitude, current_longitude,
        p_latitude, p_longitude
    ) ASC
    LIMIT 1;
    
    RETURN nearest_person_id;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign delivery with smart logic
CREATE OR REPLACE FUNCTION auto_assign_delivery_smart(order_id UUID)
RETURNS JSONB AS $$
DECLARE
    assigned_person_id UUID;
    order_lat DECIMAL;
    order_lon DECIMAL;
    result JSONB;
BEGIN
    -- Get order coordinates
    SELECT delivery_latitude, delivery_longitude 
    INTO order_lat, order_lon
    FROM orders 
    WHERE id = order_id;
    
    IF order_lat IS NULL OR order_lon IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order coordinates not found'
        );
    END IF;
    
    -- Check if auto-assignment is enabled
    IF NOT EXISTS (
        SELECT 1 FROM delivery_config 
        WHERE config_key = 'auto_assignment' 
        AND (config_value->>'enabled')::boolean = TRUE
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Auto-assignment is disabled'
        );
    END IF;
    
    -- Find nearest available delivery person
    assigned_person_id := find_nearest_delivery_person(order_lat, order_lon);
    
    IF assigned_person_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No delivery persons available nearby'
        );
    END IF;
    
    -- Update order with assignment
    UPDATE orders 
    SET 
        delivery_person_id = assigned_person_id,
        delivery_status = 'assigned',
        assigned_at = timezone('utc'::text, now())
    WHERE id = order_id;
    
    -- Create assignment record
    INSERT INTO delivery_assignments (order_id, delivery_person_id, status)
    VALUES (order_id, assigned_person_id, 'assigned');
    
    -- Send notification
    INSERT INTO notifications (user_id, title, message, type, metadata)
    VALUES (
        assigned_person_id,
        'New Delivery Assignment',
        'You have been assigned a new delivery order.',
        'delivery_assignment',
        jsonb_build_object('order_id', order_id)
    );
    
    RETURN jsonb_build_object(
        'success', true,
        'delivery_person_id', assigned_person_id,
        'message', 'Order assigned successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update delivery person location
CREATE OR REPLACE FUNCTION update_delivery_location(
    p_delivery_person_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_accuracy NUMERIC DEFAULT NULL,
    p_speed NUMERIC DEFAULT NULL,
    p_bearing NUMERIC DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update current location in profiles
    UPDATE profiles
    SET 
        current_latitude = p_latitude,
        current_longitude = p_longitude,
        last_location_update = timezone('utc'::text, now())
    WHERE id = p_delivery_person_id;
    
    -- Record location history
    INSERT INTO delivery_person_locations (
        delivery_person_id, latitude, longitude, accuracy, speed, bearing
    ) VALUES (
        p_delivery_person_id, p_latitude, p_longitude, p_accuracy, p_speed, p_bearing
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate delivery charges
CREATE OR REPLACE FUNCTION calculate_delivery_charge(
    p_distance_km NUMERIC,
    p_order_total NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    base_charge NUMERIC;
    per_km_charge NUMERIC;
    free_above NUMERIC;
    total_charge NUMERIC;
BEGIN
    -- Get configuration
    SELECT 
        (config_value->>'base_charge')::NUMERIC,
        (config_value->>'per_km_charge')::NUMERIC,
        (config_value->>'free_above')::NUMERIC
    INTO base_charge, per_km_charge, free_above
    FROM delivery_config
    WHERE config_key = 'delivery_charges';
    
    -- Free delivery above certain amount
    IF p_order_total >= free_above THEN
        RETURN 0;
    END IF;
    
    -- Calculate charge
    total_charge := base_charge + (p_distance_km * per_km_charge);
    
    RETURN ROUND(total_charge, 2);
END;
$$ LANGUAGE plpgsql;

-- Function to complete delivery and update stats
CREATE OR REPLACE FUNCTION complete_delivery_assignment(p_order_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    p_delivery_person_id UUID;
BEGIN
    -- Get delivery person ID
    SELECT delivery_person_id INTO p_delivery_person_id
    FROM orders
    WHERE id = p_order_id;
    
    IF p_delivery_person_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update order status
    UPDATE orders
    SET 
        delivery_status = 'delivered',
        delivered_at = timezone('utc'::text, now()),
        payment_status = 'paid',
        actual_delivery_time = timezone('utc'::text, now())
    WHERE id = p_order_id;
    
    -- Update assignment status
    UPDATE delivery_assignments
    SET 
        status = 'completed',
        accepted_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;
    
    -- Increment delivery count
    UPDATE profiles
    SET total_deliveries = total_deliveries + 1
    WHERE id = p_delivery_person_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. RAZORPAY INTEGRATION HELPER
-- =====================================================

-- Function to create Razorpay order record
CREATE OR REPLACE FUNCTION create_razorpay_order(
    p_order_id UUID,
    p_amount NUMERIC,
    p_currency TEXT DEFAULT 'INR'
) RETURNS TEXT AS $$
DECLARE
    razorpay_order_id TEXT;
BEGIN
    -- Generate a unique Razorpay order ID (format: order_xxxxx)
    razorpay_order_id := 'order_' || replace(gen_random_uuid()::text, '-', '');
    
    -- Store in database
    UPDATE orders
    SET razorpay_order_id = razorpay_order_id
    WHERE id = p_order_id;
    
    RETURN razorpay_order_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on delivery_person_locations
ALTER TABLE delivery_person_locations ENABLE ROW LEVEL SECURITY;

-- Allow delivery persons to insert their own locations
DROP POLICY IF EXISTS "Delivery persons can insert locations" ON delivery_person_locations;
CREATE POLICY "Delivery persons can insert locations"
    ON delivery_person_locations FOR INSERT
    WITH CHECK (auth.uid() = delivery_person_id);

-- Allow authenticated users to view locations of their assigned delivery person
DROP POLICY IF EXISTS "View assigned delivery person location" ON delivery_person_locations;
CREATE POLICY "View assigned delivery person location"
    ON delivery_person_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.delivery_person_id = delivery_person_locations.delivery_person_id
              AND o.user_id = auth.uid()
              AND o.delivery_status IN ('assigned', 'out_for_delivery')
        )
    );

-- Allow admins to view all locations
DROP POLICY IF EXISTS "Admins can view all locations" ON delivery_person_locations;
CREATE POLICY "Admins can view all locations"
    ON delivery_person_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Update RLS for delivery_config (public read)
ALTER TABLE delivery_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to read delivery config" ON delivery_config;
CREATE POLICY "Allow public to read delivery config"
    ON delivery_config FOR SELECT
    TO authenticated
    USING (TRUE);

-- Only admins can update config
DROP POLICY IF EXISTS "Admins can update delivery config" ON delivery_config;
CREATE POLICY "Admins can update delivery config"
    ON delivery_config FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 8. TRIGGERS FOR AUTOMATION
-- =====================================================

-- Auto-update config timestamp
DROP TRIGGER IF EXISTS update_delivery_config_timestamp ON delivery_config;
CREATE TRIGGER update_delivery_config_timestamp
    BEFORE UPDATE ON delivery_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to send notification on order assignment
CREATE OR REPLACE FUNCTION notify_order_assigned()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_person_id IS NOT NULL AND NEW.delivery_person_id IS DISTINCT FROM OLD.delivery_person_id THEN
        INSERT INTO notifications (user_id, title, message, type, metadata)
        VALUES (
            NEW.delivery_person_id,
            'New Order Assigned',
            'You have a new delivery order to complete.',
            'order_assigned',
            jsonb_build_object('order_id', NEW.id)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_order_assigned ON orders;
CREATE TRIGGER trigger_order_assigned
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (NEW.delivery_person_id IS NOT NULL AND NEW.delivery_person_id IS DISTINCT FROM OLD.delivery_person_id)
    EXECUTE FUNCTION notify_order_assigned();

-- =====================================================
-- 9. SAMPLE DATA FOR TESTING
-- =====================================================

-- Update restaurant location in config
UPDATE delivery_config 
SET config_value = '{"latitude": 28.6139, "longitude": 77.2090, "address": "Connaught Place, New Delhi"}'
WHERE config_key = 'restaurant_location';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
