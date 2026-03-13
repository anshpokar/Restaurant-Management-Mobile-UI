-- =====================================================
-- FIX: RLS POLICIES FOR TABLE_SESSIONS
-- =====================================================
-- This fixes the "403 Forbidden" and 
-- "new row violates row-level security policy" errors
-- when creating table sessions from bookings
-- =====================================================

-- =====================================================
-- 1. ENSURE TABLE_SESSIONS HAS CORRECT RLS
-- =====================================================

-- Enable RLS on table_sessions
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. SELECT POLICIES (Viewing Sessions)
-- =====================================================

-- Allow admins to view ALL sessions
DROP POLICY IF EXISTS "Admins can view all sessions" ON table_sessions;
CREATE POLICY "Admins can view all sessions"
    ON table_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow users to view their own sessions (by email)
DROP POLICY IF EXISTS "Users can view own sessions" ON table_sessions;
CREATE POLICY "Users can view own sessions"
    ON table_sessions FOR SELECT
    TO authenticated
    USING (
        customer_email = (
            SELECT email FROM profiles WHERE id = auth.uid()
        )
    );

-- Allow waiters to view all sessions (for managing tables)
DROP POLICY IF EXISTS "Waiters can view all sessions" ON table_sessions;
CREATE POLICY "Waiters can view all sessions"
    ON table_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- Allow chefs to view active sessions (for order management)
DROP POLICY IF EXISTS "Chefs can view active sessions" ON table_sessions;
CREATE POLICY "Chefs can view active sessions"
    ON table_sessions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'chef'
        )
    );

-- =====================================================
-- 3. INSERT POLICIES (Creating Sessions)
-- =====================================================

-- Allow admins to create sessions
DROP POLICY IF EXISTS "Admins can create sessions" ON table_sessions;
CREATE POLICY "Admins can create sessions"
    ON table_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow waiters to create sessions (when confirming bookings)
DROP POLICY IF EXISTS "Waiters can create sessions" ON table_sessions;
CREATE POLICY "Waiters can create sessions"
    ON table_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- =====================================================
-- 4. UPDATE POLICIES (Managing Sessions)
-- =====================================================

-- Allow admins to update ALL sessions
DROP POLICY IF EXISTS "Admins can update all sessions" ON table_sessions;
CREATE POLICY "Admins can update all sessions"
    ON table_sessions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow waiters to update all sessions
DROP POLICY IF EXISTS "Waiters can update all sessions" ON table_sessions;
CREATE POLICY "Waiters can update all sessions"
    ON table_sessions FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'waiter'
        )
    );

-- Allow users to update their own sessions (payment status, etc.)
DROP POLICY IF EXISTS "Users can update own sessions" ON table_sessions;
CREATE POLICY "Users can update own sessions"
    ON table_sessions FOR UPDATE
    TO authenticated
    USING (
        customer_email = (
            SELECT email FROM profiles WHERE id = auth.uid()
        )
    );

-- =====================================================
-- 5. DELETE POLICIES (Removing Sessions)
-- =====================================================

-- Allow admins to delete any session
DROP POLICY IF EXISTS "Admins can delete any session" ON table_sessions;
CREATE POLICY "Admins can delete any session"
    ON table_sessions FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow waiters to delete sessions
DROP POLICY IF EXISTS "Waiters can delete sessions" ON table_sessions;
CREATE POLICY "Waiters can delete sessions"
    ON table_sessions FOR DELETE
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
