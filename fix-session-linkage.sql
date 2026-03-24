-- =====================================================
-- FIX SESSION-ORDER LINKAGE
-- Add session_id to orders table for precise scoping
-- =====================================================

-- Add session_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'orders' AND COLUMN_NAME = 'session_id') THEN
        ALTER TABLE public.orders ADD COLUMN session_id uuid REFERENCES public.dine_in_sessions(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON public.orders(session_id);

-- Update RLS policies (Staff/Admin)
-- Assuming they can already view/edit based on table_id or profile role, 
-- but ensuring they can update session_id.
DO $$
BEGIN
    -- Staff can update session_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Staff can update session_id'
    ) THEN
        CREATE POLICY "Staff can update session_id"
        ON public.orders FOR UPDATE
        USING (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'waiter')
            )
        );
    END IF;
END $$;
