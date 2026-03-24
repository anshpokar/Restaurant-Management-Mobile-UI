-- =====================================================
-- 🛠️ SURGICAL RLS & SCHEMA FIX (WAITER ACCESS + SERVED STATUS)
-- =====================================================

-- 1. ADD 'served' TO ORDER STATUS
-- Fixed syntax: Consolidated onto single lines to avoid parser errors
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('placed', 'preparing', 'cooking', 'prepared', 'served', 'out_for_delivery', 'delivered', 'cancelled'));

-- 2. ALLOW WAITERS TO INSERT ORDER ITEMS
DROP POLICY IF EXISTS "Waiters can insert order items" ON order_items;
CREATE POLICY "Waiters can insert order items" ON order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));

-- 3. ALLOW ADMINS TO INSERT ORDER ITEMS
DROP POLICY IF EXISTS "Admins can insert order items" ON order_items;
CREATE POLICY "Admins can insert order items" ON order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. ALLOW WAITERS TO UPDATE ORDERS (for serving and total_amount)
DROP POLICY IF EXISTS "Waiters can update orders" ON orders;
CREATE POLICY "Waiters can update orders" ON orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));

-- 5. ALLOW ADMINS TO UPDATE ORDERS
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 6. ALLOW WAITERS TO UPDATE SESSIONS (for sync)
DROP POLICY IF EXISTS "Waiters can update sessions" ON dine_in_sessions;
CREATE POLICY "Waiters can update sessions" ON dine_in_sessions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'waiter'));

-- =====================================================
-- ✅ VERIFICATION: NO CONFLICTS
-- Existing customer policies remains untouched.
-- =====================================================
