-- =====================================================
-- PHASE 2: DELIVERY BASIC - DATABASE MIGRATION
-- =====================================================
-- This migration adds delivery address management with 
-- pincode validation and manual delivery assignment
-- =====================================================

-- =====================================================
-- 1. DELIVERY ZONES TABLE (Allowed Pincodes)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pincode TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL DEFAULT 'New Delhi',
    state TEXT NOT NULL DEFAULT 'Delhi',
    is_active BOOLEAN DEFAULT TRUE,
    max_distance_km NUMERIC DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default allowed pincodes (Delhi NCR area)
INSERT INTO delivery_zones (pincode, city, state, max_distance_km) VALUES
('110001', 'New Delhi', 'Delhi', 20),
('110002', 'New Delhi', 'Delhi', 20),
('110003', 'New Delhi', 'Delhi', 20),
('110004', 'New Delhi', 'Delhi', 20),
('110005', 'New Delhi', 'Delhi', 20),
('110006', 'New Delhi', 'Delhi', 20),
('110007', 'New Delhi', 'Delhi', 20),
('110008', 'New Delhi', 'Delhi', 20),
('110009', 'New Delhi', 'Delhi', 20),
('110010', 'New Delhi', 'Delhi', 20),
('110011', 'New Delhi', 'Delhi', 20),
('110012', 'New Delhi', 'Delhi', 20),
('110013', 'New Delhi', 'Delhi', 20),
('110014', 'New Delhi', 'Delhi', 20),
('110015', 'New Delhi', 'Delhi', 20),
('110016', 'New Delhi', 'Delhi', 20),
('110017', 'New Delhi', 'Delhi', 20),
('110018', 'New Delhi', 'Delhi', 20),
('110019', 'New Delhi', 'Delhi', 20),
('110020', 'New Delhi', 'Delhi', 20),
('110021', 'New Delhi', 'Delhi', 20),
('110022', 'New Delhi', 'Delhi', 20),
('110023', 'New Delhi', 'Delhi', 20),
('110024', 'New Delhi', 'Delhi', 20),
('110025', 'New Delhi', 'Delhi', 20),
('110026', 'New Delhi', 'Delhi', 20),
('110027', 'New Delhi', 'Delhi', 20),
('110028', 'New Delhi', 'Delhi', 20),
('110029', 'New Delhi', 'Delhi', 20),
('110030', 'New Delhi', 'Delhi', 20),
('110031', 'New Delhi', 'Delhi', 20),
('110032', 'New Delhi', 'Delhi', 20),
('110033', 'New Delhi', 'Delhi', 20),
('110034', 'New Delhi', 'Delhi', 20),
('110035', 'New Delhi', 'Delhi', 20),
('110036', 'New Delhi', 'Delhi', 20),
('110037', 'New Delhi', 'Delhi', 20),
('110038', 'New Delhi', 'Delhi', 20),
('110039', 'New Delhi', 'Delhi', 20),
('110040', 'New Delhi', 'Delhi', 20),
('110041', 'New Delhi', 'Delhi', 20),
('110042', 'New Delhi', 'Delhi', 20),
('110043', 'New Delhi', 'Delhi', 20),
('110044', 'New Delhi', 'Delhi', 20),
('110045', 'New Delhi', 'Delhi', 20),
('110046', 'New Delhi', 'Delhi', 20),
('110047', 'New Delhi', 'Delhi', 20),
('110048', 'New Delhi', 'Delhi', 20),
('110049', 'New Delhi', 'Delhi', 20),
('110050', 'New Delhi', 'Delhi', 20),
('110051', 'New Delhi', 'Delhi', 20),
('110052', 'New Delhi', 'Delhi', 20),
('110053', 'New Delhi', 'Delhi', 20),
('110054', 'New Delhi', 'Delhi', 20),
('110055', 'New Delhi', 'Delhi', 20),
('110056', 'New Delhi', 'Delhi', 20),
('110057', 'New Delhi', 'Delhi', 20),
('110058', 'New Delhi', 'Delhi', 20),
('110059', 'New Delhi', 'Delhi', 20),
('110060', 'New Delhi', 'Delhi', 20),
('110061', 'New Delhi', 'Delhi', 20),
('110062', 'New Delhi', 'Delhi', 20),
('110063', 'New Delhi', 'Delhi', 20),
('110064', 'New Delhi', 'Delhi', 20),
('110065', 'New Delhi', 'Delhi', 20),
('110066', 'New Delhi', 'Delhi', 20),
('110067', 'New Delhi', 'Delhi', 20),
('110068', 'New Delhi', 'Delhi', 20),
('110069', 'New Delhi', 'Delhi', 20),
('110070', 'New Delhi', 'Delhi', 20),
('110071', 'New Delhi', 'Delhi', 20),
('110072', 'New Delhi', 'Delhi', 20),
('110073', 'New Delhi', 'Delhi', 20),
('110074', 'New Delhi', 'Delhi', 20),
('110075', 'New Delhi', 'Delhi', 20),
('110076', 'New Delhi', 'Delhi', 20),
('110077', 'New Delhi', 'Delhi', 20),
('110078', 'New Delhi', 'Delhi', 20),
('110080', 'New Delhi', 'Delhi', 20),
('110081', 'New Delhi', 'Delhi', 20),
('110082', 'New Delhi', 'Delhi', 20),
('110083', 'New Delhi', 'Delhi', 20),
('110084', 'New Delhi', 'Delhi', 20),
('110085', 'New Delhi', 'Delhi', 20),
('110086', 'New Delhi', 'Delhi', 20),
('110087', 'New Delhi', 'Delhi', 20),
('110088', 'New Delhi', 'Delhi', 20),
('110091', 'New Delhi', 'Delhi', 20),
('110092', 'New Delhi', 'Delhi', 20),
('110093', 'New Delhi', 'Delhi', 20),
('110094', 'New Delhi', 'Delhi', 20),
('110095', 'New Delhi', 'Delhi', 20),
('110096', 'New Delhi', 'Delhi', 20)
ON CONFLICT (pincode) DO NOTHING;

-- =====================================================
-- 2. DELIVERY ADDRESSES TABLE (User Saved Addresses)
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- Home, Work, etc.
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL DEFAULT 'New Delhi',
    state TEXT NOT NULL DEFAULT 'Delhi',
    pincode TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Validation
    is_within_delivery_zone BOOLEAN DEFAULT TRUE,
    distance_from_restaurant NUMERIC, -- in km
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user ON delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_pincode ON delivery_addresses(pincode);

-- =====================================================
-- 3. UPDATE ORDERS TABLE FOR DELIVERY
-- =====================================================
-- Add delivery-related columns if they don't exist
DO $$ 
BEGIN
    -- Add order_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'order_type') THEN
        ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'dine_in' 
            CHECK (order_type IN ('dine_in', 'delivery'));
    END IF;
    
    -- Add table_id for dine-in orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'table_id') THEN
        ALTER TABLE orders ADD COLUMN table_id UUID REFERENCES restaurant_tables(id);
    END IF;
    
    -- Add delivery address fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_address') THEN
        ALTER TABLE orders ADD COLUMN delivery_address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_address_line2') THEN
        ALTER TABLE orders ADD COLUMN delivery_address_line2 TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_pincode') THEN
        ALTER TABLE orders ADD COLUMN delivery_pincode TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_latitude') THEN
        ALTER TABLE orders ADD COLUMN delivery_latitude DECIMAL(10, 8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_longitude') THEN
        ALTER TABLE orders ADD COLUMN delivery_longitude DECIMAL(11, 8);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_instructions') THEN
        ALTER TABLE orders ADD COLUMN delivery_instructions TEXT;
    END IF;
    
    -- Add delivery person assignment
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_person_id') THEN
        ALTER TABLE orders ADD COLUMN delivery_person_id UUID REFERENCES profiles(id);
    END IF;
    
    -- Add delivery status tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivery_status') THEN
        ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'assigned_at') THEN
        ALTER TABLE orders ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'picked_up_at') THEN
        ALTER TABLE orders ADD COLUMN picked_up_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'delivered_at') THEN
        ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add payment fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT 
            CHECK (payment_method IN ('cod', 'upi', 'razorpay', 'cash'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'payment_id') THEN
        ALTER TABLE orders ADD COLUMN payment_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'orders' AND column_name = 'paid_at') THEN
        ALTER TABLE orders ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_person ON orders(delivery_person_id);
CREATE INDEX IF NOT EXISTS idx_orders_type_status ON orders(order_type, delivery_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to check if pincode is in delivery zone
CREATE OR REPLACE FUNCTION is_pincode_deliverable(check_pincode TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM delivery_zones
        WHERE pincode = check_pincode
          AND is_active = TRUE
    ) INTO is_valid;
    
    RETURN is_valid;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate distance between two coordinates (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS NUMERIC AS $$
BEGIN
    -- Haversine formula for distance calculation
    RETURN ROUND(
        6371 * acos(
            cos(radians(lat1)) * cos(radians(lat2)) *
            cos(radians(lon2) - radians(lon1)) +
            sin(radians(lat1)) * sin(radians(lat2))
        )::NUMERIC,
        2
    );
END;
$$ LANGUAGE plpgsql;

-- Function to validate delivery address
CREATE OR REPLACE FUNCTION validate_delivery_address(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_pincode TEXT
) RETURNS JSONB AS $$
DECLARE
    is_valid_pincode BOOLEAN;
    distance NUMERIC;
    is_within_range BOOLEAN;
    restaurant_lat DECIMAL := 28.6139; -- Example: Connaught Place, New Delhi
    restaurant_lon DECIMAL := 77.2090;
BEGIN
    -- Check pincode
    SELECT is_pincode_deliverable(p_pincode) INTO is_valid_pincode;
    
    -- Calculate distance if coordinates provided
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        SELECT calculate_distance(restaurant_lat, restaurant_lon, p_latitude, p_longitude) 
        INTO distance;
        
        is_within_range := distance <= 20;
    ELSE
        distance := NULL;
        is_within_range := FALSE;
    END IF;
    
    RETURN JSONB_BUILD_OBJECT(
        'is_valid', is_valid_pincode AND is_within_range,
        'is_pincode_valid', is_valid_pincode,
        'is_within_range', is_within_range,
        'distance_km', distance
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on delivery_addresses
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view their own addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON delivery_addresses;
CREATE POLICY "Users can view own addresses"
    ON delivery_addresses FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own addresses
DROP POLICY IF EXISTS "Users can insert own addresses" ON delivery_addresses;
CREATE POLICY "Users can insert own addresses"
    ON delivery_addresses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own addresses
DROP POLICY IF EXISTS "Users can update own addresses" ON delivery_addresses;
CREATE POLICY "Users can update own addresses"
    ON delivery_addresses FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own addresses
DROP POLICY IF EXISTS "Users can delete own addresses" ON delivery_addresses;
CREATE POLICY "Users can delete own addresses"
    ON delivery_addresses FOR DELETE
    USING (auth.uid() = user_id);

-- Allow public to read delivery zones (for validation)
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public to read delivery zones" ON delivery_zones;
CREATE POLICY "Allow public to read delivery zones"
    ON delivery_zones FOR SELECT
    TO authenticated
    USING (TRUE);

-- =====================================================
-- 6. TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Auto-update updated_at timestamp for delivery_addresses
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_delivery_addresses_updated_at ON delivery_addresses;
CREATE TRIGGER update_delivery_addresses_updated_at
    BEFORE UPDATE ON delivery_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. SAMPLE DATA FOR TESTING
-- =====================================================

-- Sample delivery address for testing
INSERT INTO delivery_addresses (user_id, label, address_line1, city, state, pincode, latitude, longitude)
SELECT 
    (SELECT id FROM profiles LIMIT 1),
    'Home',
    '123 Connaught Place',
    'New Delhi',
    'Delhi',
    '110001',
    28.6328,
    77.2197
WHERE NOT EXISTS (SELECT 1 FROM delivery_addresses LIMIT 1);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
