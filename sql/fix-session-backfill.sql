-- 1. Ensure session_id column exists (already in fix-session-linkage.sql but adding here for safety)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='orders' AND COLUMN_NAME='session_id') THEN
        ALTER TABLE public.orders ADD COLUMN session_id uuid REFERENCES public.dine_in_sessions(id);
    END IF;
END $$;

-- 2. Backfill session_id from the notes column for existing orders
-- Pattern: 'Dine-in Session: [uuid]'
-- We only update if the session actually exists in dine_in_sessions to avoid FK violations
UPDATE public.orders o
SET session_id = (substring(notes from 'Dine-in Session: ([a-f0-9-]{36})'))::uuid
WHERE notes ILIKE 'Dine-in Session: %'
  AND session_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.dine_in_sessions s 
    WHERE s.id = (substring(o.notes from 'Dine-in Session: ([a-f0-9-]{36})'))::uuid
  );
  
-- 2.1 (Optional) For orders where the session was deleted, we might want to clear the notes 
-- or mark them as orphaned, but for now we just leave them with session_id as NULL.

-- 3. Also backfill session_id for orders that have a session_name matching a session
-- (Optional but helpful if notes are missing)
UPDATE public.orders o
SET session_id = s.id
FROM public.dine_in_sessions s
WHERE o.session_name = s.session_name
  AND o.table_id = s.table_id
  AND o.session_id IS NULL
  AND s.session_status = 'active';

-- 4. Enable RLS for session_id column access if needed (usually handled by table-level RLS)
-- But let's make sure waiters can see all orders for a session
DROP POLICY IF EXISTS "Waiters can view all orders" ON public.orders;
CREATE POLICY "Waiters can view all orders" ON public.orders
    FOR SELECT TO authenticated
    USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) IN ('waiter', 'admin')
        OR user_id = auth.uid()
    );
