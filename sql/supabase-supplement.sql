-- =====================================================
-- SUPPLEMENTARY SCHEMA FOR MISSING FEATURES
-- Run this AFTER your existing schema to add missing tables
-- =====================================================

-- =====================================================
-- 1. ADDRESSES TABLE (for saved addresses in profile)
-- =====================================================
CREATE TABLE IF NOT EXISTS addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address_label TEXT NOT NULL, -- e.g., "Home", "Work"
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can manage own addresses" ON addresses;

-- Create policies
CREATE POLICY "Users can view own addresses" ON addresses
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own addresses" ON addresses
FOR ALL USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_default ON addresses(user_id, is_default);


-- =====================================================
-- 2. FAVORITES TABLE (menu item wishlist)
-- =====================================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  menu_item_id BIGINT REFERENCES menu_items(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate favorites
  UNIQUE(user_id, menu_item_id)
);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;

-- Create policies
CREATE POLICY "Users can view own favorites" ON favorites
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON favorites
FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_menu_item ON favorites(menu_item_id);


-- =====================================================
-- 3. NOTIFICATIONS TABLE (push notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order', 'booking', 'promotion', 'system'
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;

-- Create policies
CREATE POLICY "Users can view own notifications" ON notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications" ON notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);


-- =====================================================
-- 4. SUPPORT_TICKETS TABLE (Help & Support feature)
-- =====================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  admin_response TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can manage all tickets" ON support_tickets;

-- Create policies
CREATE POLICY "Users can view own tickets" ON support_tickets
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create tickets" ON support_tickets
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets" ON support_tickets
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all tickets" ON support_tickets
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);


-- =====================================================
-- 5. IMPROVED ORDERS POLICIES (Better security)
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Staff can update orders" ON orders;

-- Better insert policy - users can create their own orders
CREATE POLICY "Users can create orders" ON orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Better select policy - users can see their own orders, staff can see all
CREATE POLICY "Users can view orders" ON orders
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id OR
  auth.uid() = delivery_person_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'chef', 'waiter', 'delivery')
  )
);

-- Better update policy - role-based
CREATE POLICY "Users can update orders" ON orders
FOR UPDATE TO authenticated
USING (
  (auth.uid() = user_id AND status IN ('placed', 'cancelled')) OR
  auth.uid() = delivery_person_id OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'chef', 'waiter')
  )
);


-- =====================================================
-- 6. IMPROVED ORDER_ITEMS POLICIES
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;

-- Insert policy - only with own orders
CREATE POLICY "Users can insert order items" ON order_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Select policy - if you can see the order, you can see items
CREATE POLICY "Users can view order items" ON order_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND (
      orders.user_id = auth.uid() OR
      orders.delivery_person_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'chef', 'waiter', 'delivery')
      )
    )
  )
);


-- =====================================================
-- 7. TRIGGERS FOR AUTOMATION
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables that need it
DROP TRIGGER IF EXISTS update_addresses_updated_at ON addresses;
CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- 8. HELPER FUNCTIONS
-- =====================================================

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get daily revenue
CREATE OR REPLACE FUNCTION get_daily_revenue(p_date DATE)
RETURNS NUMERIC AS $$
DECLARE
  v_revenue NUMERIC;
BEGIN
  SELECT COALESCE(SUM(total_amount), 0) INTO v_revenue
  FROM orders
  WHERE DATE(created_at) = p_date
    AND is_paid = true
    AND status != 'cancelled';
  
  RETURN v_revenue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get order with items
CREATE OR REPLACE FUNCTION get_order_with_items(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  v_order JSON;
BEGIN
  SELECT row_to_json(o.*) INTO v_order
  FROM (
    SELECT 
      o.*,
      array_agg(oi.*) as order_items,
      p.full_name as customer_name,
      p.email as customer_email
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN profiles p ON p.id = o.user_id
    WHERE o.id = p_order_id
    GROUP BY o.id, p.full_name, p.email
  ) o;
  
  RETURN v_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- 9. SEED DATA (Optional - for testing)
-- =====================================================

-- Add a few test addresses (optional - users will create their own)
-- Uncomment if you want sample data
/*
INSERT INTO addresses (user_id, address_label, address_line1, city, state, pincode, phone_number, is_default)
SELECT 
  (SELECT id FROM profiles LIMIT 1), -- First user
  'Home',
  '123 Main Street, Connaught Place',
  'New Delhi',
  'Delhi',
  '110001',
  '+91 9876543210',
  true;
*/

-- =====================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE addresses IS 'Saved delivery addresses for users';
COMMENT ON TABLE favorites IS 'User favorite menu items (wishlist)';
COMMENT ON TABLE notifications IS 'Push notifications for users';
COMMENT ON TABLE support_tickets IS 'Customer support requests';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify everything is set up correctly:
/*
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all policies
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check all indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
*/

-- =====================================================
-- END OF SUPPLEMENTARY SCHEMA
-- =====================================================
