-- =====================================================
-- PHASE 1: CORE DINE-IN SYSTEM
-- Database Schema Migration
-- =====================================================

-- 1. UPDATE ORDERS TABLE
-- Add columns for order type, table tracking, and customer info
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type TEXT CHECK (order_type IN ('dine_in', 'delivery')),
ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES restaurant_tables(id),
ADD COLUMN IF NOT EXISTS placed_by TEXT CHECK (placed_by IN ('customer', 'waiter')),
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS delivery_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS delivery_pincode TEXT,
ADD COLUMN IF NOT EXISTS delivery_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS delivery_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
ADD COLUMN IF NOT EXISTS delivery_person_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('cod', 'upi', 'razorpay', 'cash')),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_id TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_placed_by ON orders(placed_by);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);

-- Add comment to document the changes
COMMENT ON COLUMN orders.order_type IS 'Type of order: dine_in or delivery';
COMMENT ON COLUMN orders.placed_by IS 'Who placed the order: customer or waiter';
COMMENT ON COLUMN orders.table_id IS 'Reference to table for dine-in orders';
COMMENT ON COLUMN orders.customer_name IS 'Customer name for anonymous/waiter orders';
COMMENT ON COLUMN orders.customer_email IS 'Optional email to link order to customer profile';

-- 2. UPDATE RESTAURANT_TABLES TABLE
-- Add status tracking for occupancy
ALTER TABLE restaurant_tables
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'reserved', 'maintenance')),
ADD COLUMN IF NOT EXISTS occupied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS occupied_by_customer_name TEXT,
ADD COLUMN IF NOT EXISTS occupied_by_customer_email TEXT,
ADD COLUMN IF NOT EXISTS current_order_id UUID REFERENCES orders(id);

-- Create index for table status queries
CREATE INDEX IF NOT EXISTS idx_tables_status ON restaurant_tables(status);

-- Comment documentation
COMMENT ON COLUMN restaurant_tables.status IS 'Current status: vacant, occupied, reserved, or maintenance';
COMMENT ON COLUMN restaurant_tables.occupied_at IS 'When table became occupied';
COMMENT ON COLUMN restaurant_tables.current_order_id IS 'Active order at this table';

-- 3. CREATE TABLE_SESSIONS TABLE
-- Tracks customer dining sessions at tables
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id UUID REFERENCES restaurant_tables(id) ON DELETE CASCADE,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    total_orders INTEGER DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'pending_partial', 'completed')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for session queries
CREATE INDEX IF NOT EXISTS idx_sessions_table ON table_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON table_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_email ON table_sessions(customer_email);

-- Comments
COMMENT ON TABLE table_sessions IS 'Tracks customer dining sessions - multiple orders can belong to one session';
COMMENT ON COLUMN table_sessions.total_orders IS 'Number of orders in this session';
COMMENT ON COLUMN table_sessions.total_amount IS 'Total bill amount for all orders';

-- 4. CREATE DELIVERY_ADDRESSES TABLE
-- For storing customer delivery addresses
CREATE TABLE IF NOT EXISTS delivery_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- Home, Work, etc.
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT FALSE,
    is_within_delivery_zone BOOLEAN DEFAULT TRUE,
    distance_from_restaurant NUMERIC, -- in km
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user ON delivery_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_pincode ON delivery_addresses(pincode);

-- Comments
COMMENT ON TABLE delivery_addresses IS 'Customer saved delivery addresses with validation';
COMMENT ON COLUMN delivery_addresses.is_within_delivery_zone IS 'Whether address is within delivery zone';
COMMENT ON COLUMN delivery_addresses.distance_from_restaurant IS 'Distance from restaurant in kilometers';

-- 5. CREATE DELIVERY_ZONES TABLE
-- Defines allowed pincodes for delivery
CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pincode TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_distance_km NUMERIC DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default delivery zones (example - customize for your restaurant location)
INSERT INTO delivery_zones (pincode, city, state, max_distance_km) VALUES
('110001', 'New Delhi', 'Delhi', 20),
('110002', 'New Delhi', 'Delhi', 20),
('110003', 'New Delhi', 'Delhi', 20),
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

-- Comment
COMMENT ON TABLE delivery_zones IS 'Allowed pincodes for delivery with distance validation';

-- 6. CREATE CUSTOMER_OTPS TABLE
-- For storing OTP codes sent to customers
CREATE TABLE IF NOT EXISTS customer_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_otps_email ON customer_otps(email);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON customer_otps(expires_at);

-- Comment
COMMENT ON TABLE customer_otps IS 'Temporary storage for customer verification OTPs';

-- 7. CREATE HELPER FUNCTION: Calculate Distance
-- Haversine formula for distance calculation between two GPS points
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS NUMERIC AS $$
DECLARE
    distance NUMERIC;
BEGIN
    -- Haversine formula
    distance := 6371 * acos(
        cos(radians(lat1)) * cos(radians(lat2)) *
        cos(radians(lon2) - radians(lon1)) +
        sin(radians(lat1)) * sin(radians(lat2))
    );
    
    RETURN ROUND(distance::NUMERIC, 2);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_distance IS 'Calculates distance between two GPS points in kilometers using Haversine formula';

-- 8. CREATE HELPER FUNCTION: Check if pincode is deliverable
CREATE OR REPLACE FUNCTION is_pincode_deliverable(check_pincode TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    is_deliverable BOOLEAN;
BEGIN
    SELECT is_active INTO is_deliverable
    FROM delivery_zones
    WHERE pincode = check_pincode;
    
    RETURN COALESCE(is_deliverable, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_pincode_deliverable IS 'Checks if a pincode is within delivery zone';

-- 9. UPDATE RLS POLICIES FOR ORDERS
-- Allow authenticated users to view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (
        auth.uid() = user_id 
        OR (customer_email IS NOT NULL AND customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    );

-- Allow waiters/admins to view all orders
DROP POLICY IF EXISTS "Waiters and admins can view all orders" ON orders;
CREATE POLICY "Waiters and admins can view all orders"
    ON orders FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('waiter', 'chef', 'admin')
        )
    );

-- 10. CREATE TRIGGER: Auto-update table status when order is placed
CREATE OR REPLACE FUNCTION update_table_on_order()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a dine-in order with table_id
    IF NEW.order_type = 'dine_in' AND NEW.table_id IS NOT NULL THEN
        -- Update table status to occupied
        UPDATE restaurant_tables
        SET 
            status = 'occupied',
            occupied_at = NOW(),
            current_order_id = NEW.id
        WHERE id = NEW.table_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_update_table_on_order ON orders;
CREATE TRIGGER trg_update_table_on_order
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_table_on_order();

COMMENT ON FUNCTION update_table_on_order IS 'Automatically marks table as occupied when dine-in order is placed';

-- 11. CREATE TRIGGER: Auto-vacate table when payment is complete
CREATE OR REPLACE FUNCTION vacate_table_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- If order is marked as paid and it's a dine-in order
    IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
        -- Check if this is the last order for the table
        IF NOT EXISTS (
            SELECT 1 FROM orders
            WHERE table_id = NEW.table_id
            AND id != NEW.id
            AND payment_status != 'paid'
        ) THEN
            -- Vacate the table
            UPDATE restaurant_tables
            SET 
                status = 'vacant',
                occupied_at = NULL,
                current_order_id = NULL,
                occupied_by_customer_name = NULL,
                occupied_by_customer_email = NULL
            WHERE id = NEW.table_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trg_vacate_table_on_payment ON orders;
CREATE TRIGGER trg_vacate_table_on_payment
    AFTER UPDATE OF payment_status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION vacate_table_on_payment();

COMMENT ON FUNCTION vacate_table_on_payment IS 'Automatically marks table as vacant when all orders are paid';

-- =====================================================
-- PHASE 1 MIGRATION COMPLETE
-- Run this in Supabase SQL Editor to apply changes
-- =====================================================
