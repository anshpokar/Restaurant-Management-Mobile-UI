-- =====================================================
-- FIX: RLS POLICIES FOR TABLE_BOOKINGS
-- =====================================================
-- This fixes the "PGRST116: The result contains 0 rows" error
-- when admin tries to view or update table bookings
-- =====================================================

-- =====================================================
-- 1. ENSURE TABLE_BOOKINGS HAS CORRECT RLS
-- =====================================================

-- Enable RLS on table_bookings
ALTER TABLE table_bookings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. SELECT POLICIES (Viewing Bookings)
-- =====================================================

-- Allow admins to view ALL bookings
DROP POLICY IF EXISTS "Admins can view all bookings" ON table_bookings;
CREATE POLICY "Admins can view all bookings"
    ON table_bookings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to view their own bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON table_bookings;
CREATE POLICY "Users can view own bookings"
    ON table_bookings FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Allow waiters to view all bookings (for managing reservations)
DROP POLICY IF EXISTS "Waiters can view all bookings" ON table_bookings;
CREATE POLICY "Waiters can view all bookings"
    ON table_bookings FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- =====================================================
-- 3. INSERT POLICIES (Creating Bookings)
-- =====================================================

-- Allow users to create bookings for themselves
DROP POLICY IF EXISTS "Users can create own bookings" ON table_bookings;
CREATE POLICY "Users can create own bookings"
    ON table_bookings FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow waiters to create bookings on behalf of customers
DROP POLICY IF EXISTS "Waiters can create bookings" ON table_bookings;
CREATE POLICY "Waiters can create bookings"
    ON table_bookings FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- Allow admins to create bookings
DROP POLICY IF EXISTS "Admins can create bookings" ON table_bookings;
CREATE POLICY "Admins can create bookings"
    ON table_bookings FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- 4. UPDATE POLICIES (Managing Bookings)
-- =====================================================

-- Allow admins to update ALL bookings (confirm, cancel, etc.)
DROP POLICY IF EXISTS "Admins can update all bookings" ON table_bookings;
CREATE POLICY "Admins can update all bookings"
    ON table_bookings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to update their own bookings (cancel before confirmation)
DROP POLICY IF EXISTS "Users can update own bookings" ON table_bookings;
CREATE POLICY "Users can update own bookings"
    ON table_bookings FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow waiters to update all bookings
DROP POLICY IF EXISTS "Waiters can update all bookings" ON table_bookings;
CREATE POLICY "Waiters can update all bookings"
    ON table_bookings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- =====================================================
-- 5. DELETE POLICIES (Removing Bookings)
-- =====================================================

-- Allow admins to delete any booking
DROP POLICY IF EXISTS "Admins can delete any booking" ON table_bookings;
CREATE POLICY "Admins can delete any booking"
    ON table_bookings FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to delete their own bookings (before confirmation)
DROP POLICY IF EXISTS "Users can delete own bookings" ON table_bookings;
CREATE POLICY "Users can delete own bookings"
    ON table_bookings FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Allow waiters to delete bookings
DROP POLICY IF EXISTS "Waiters can delete bookings" ON table_bookings;
CREATE POLICY "Waiters can delete bookings"
    ON table_bookings FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
