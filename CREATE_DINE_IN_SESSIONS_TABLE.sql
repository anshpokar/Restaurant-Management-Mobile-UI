-- =====================================================
-- DINE-IN SESSIONS TABLE
-- For tracking dine-in orders with pay-later option
-- =====================================================

-- Create dine_in_sessions table
CREATE TABLE IF NOT EXISTS dine_in_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id uuid REFERENCES restaurant_tables(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_status text DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'cancelled')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
  payment_method text CHECK (payment_method IN ('cod', 'upi', 'razorpay')),
  total_amount numeric(10,2) DEFAULT 0,
  paid_amount numeric(10,2) DEFAULT 0,
  started_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamptz,
  payment_completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_table_id ON dine_in_sessions(table_id);
CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_user_id ON dine_in_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_status ON dine_in_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_dine_in_sessions_started_at ON dine_in_sessions(started_at DESC);

-- Enable RLS
ALTER TABLE dine_in_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Customers can view their own sessions
CREATE POLICY "Users can view own dine-in sessions"
ON dine_in_sessions FOR SELECT
USING (auth.uid() = user_id);

-- Customers can create their own sessions
CREATE POLICY "Users can create own dine-in sessions"
ON dine_in_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Customers can update their own sessions
CREATE POLICY "Users can update own dine-in sessions"
ON dine_in_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- Staff/Admin can view all sessions
CREATE POLICY "Staff can view all dine-in sessions"
ON dine_in_sessions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter', 'chef')
  )
);

-- Staff can update all sessions
CREATE POLICY "Staff can update all dine-in sessions"
ON dine_in_sessions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'waiter')
  )
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_dine_in_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dine_in_session_updated_at
BEFORE UPDATE ON dine_in_sessions
FOR EACH ROW
EXECUTE FUNCTION update_dine_in_session_updated_at();

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'dine_in_sessions'
ORDER BY ordinal_position;
