-- =====================================================
-- FIX: RLS POLICIES FOR ORDER PLACEMENT
-- =====================================================
-- This fixes "permission denied for table users" error
-- when placing orders
-- =====================================================

-- =====================================================
-- 1. ENSURE PROFILES TABLE HAS CORRECT RLS
-- =====================================================

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all profiles (needed for order placement)
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
CREATE POLICY "Allow authenticated users to read profiles"
    ON profiles FOR SELECT
    TO authenticated
    USING (TRUE);

-- Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- =====================================================
-- 2. ORDERS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow customers to view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow customers to create orders
DROP POLICY IF EXISTS "Users can create orders" ON orders;
CREATE POLICY "Users can create orders"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow customers to update their own orders
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
    ON orders FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow waiters to view all orders (for taking orders)
DROP POLICY IF EXISTS "Waiters can view all orders" ON orders;
CREATE POLICY "Waiters can view all orders"
    ON orders FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- Allow waiters to create orders on behalf of customers
DROP POLICY IF EXISTS "Waiters can create orders" ON orders;
CREATE POLICY "Waiters can create orders"
    ON orders FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- Allow chefs to view all orders
DROP POLICY IF EXISTS "Chefs can view all orders" ON orders;
CREATE POLICY "Chefs can view all orders"
    ON orders FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'chef'
        )
    );

-- Allow chefs to update order status
DROP POLICY IF EXISTS "Chefs can update orders" ON orders;
CREATE POLICY "Chefs can update orders"
    ON orders FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'chef'
        )
    );

-- Allow admins to do everything with orders
DROP POLICY IF EXISTS "Admins full access to orders" ON orders;
CREATE POLICY "Admins full access to orders"
    ON orders FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 3. RESTAURANT_TABLES RLS POLICIES
-- =====================================================

-- Enable RLS on restaurant_tables
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view tables
DROP POLICY IF EXISTS "Allow public to view tables" ON restaurant_tables;
CREATE POLICY "Allow public to view tables"
    ON restaurant_tables FOR SELECT
    TO authenticated
    USING (TRUE);

-- Allow waiters and admins to update tables
DROP POLICY IF EXISTS "Waiters and admins can update tables" ON restaurant_tables;
CREATE POLICY "Waiters and admins can update tables"
    ON restaurant_tables FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND role IN ('waiter', 'admin')
        )
    );

-- =====================================================
-- 4. DELIVERY_ADDRESSES RLS POLICIES
-- =====================================================

-- Enable RLS on delivery_addresses
ALTER TABLE delivery_addresses ENABLE ROW LEVEL SECURITY;

-- Users can view own addresses
DROP POLICY IF EXISTS "Users can view own addresses" ON delivery_addresses;
CREATE POLICY "Users can view own addresses"
    ON delivery_addresses FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can insert own addresses
DROP POLICY IF EXISTS "Users can insert own addresses" ON delivery_addresses;
CREATE POLICY "Users can insert own addresses"
    ON delivery_addresses FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update own addresses
DROP POLICY IF EXISTS "Users can update own addresses" ON delivery_addresses;
CREATE POLICY "Users can update own addresses"
    ON delivery_addresses FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Users can delete own addresses
DROP POLICY IF EXISTS "Users can delete own addresses" ON delivery_addresses;
CREATE POLICY "Users can delete own addresses"
    ON delivery_addresses FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- =====================================================
-- 5. MENU_ITEMS RLS POLICIES
-- =====================================================

-- Enable RLS on menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view menu items
DROP POLICY IF EXISTS "Allow public to view menu items" ON menu_items;
CREATE POLICY "Allow public to view menu items"
    ON menu_items FOR SELECT
    TO authenticated
    USING (TRUE);

-- Only admins can modify menu items
DROP POLICY IF EXISTS "Admins can modify menu items" ON menu_items;
CREATE POLICY "Admins can modify menu items"
    ON menu_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 6. CUSTOMER_OTPS RLS POLICIES
-- =====================================================

-- Enable RLS on customer_otps
ALTER TABLE customer_otps ENABLE ROW LEVEL SECURITY;

-- Allow insertion of OTP records (for waiter creating orders)
DROP POLICY IF EXISTS "Allow inserting OTPs" ON customer_otps;
CREATE POLICY "Allow inserting OTPs"
    ON customer_otps FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- Allow reading OTP for verification
DROP POLICY IF EXISTS "Allow reading OTPs for verification" ON customer_otps;
CREATE POLICY "Allow reading OTPs for verification"
    ON customer_otps FOR SELECT
    TO authenticated
    USING (email IS NOT NULL);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
