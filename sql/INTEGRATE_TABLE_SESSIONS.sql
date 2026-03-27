-- =====================================================
-- INTEGRATE TABLE_SESSIONS WITH DINE_IN_SESSIONS
-- Links existing dine_in_sessions to table_sessions
-- Ensures proper table occupancy tracking
-- =====================================================

-- Step 1: Create a function to auto-create table_session when dine_in_session starts
CREATE OR REPLACE FUNCTION create_table_session_on_dine_in_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into table_sessions when new dine_in_session is created
  INSERT INTO public.table_sessions (
    table_id,
    customer_name,
    customer_email,
    customer_phone,
    started_at,
    status,
    payment_status,
    total_amount
  ) VALUES (
    NEW.table_id,
    (SELECT full_name FROM profiles WHERE id = NEW.user_id),
    (SELECT email FROM profiles WHERE id = NEW.user_id),
    (SELECT phone_number FROM profiles WHERE id = NEW.user_id),
    NEW.started_at,
    'active',
    NEW.payment_status,
    NEW.total_amount
  )
  ON CONFLICT DO NOTHING; -- Avoid duplicates if trigger fires twice
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger on dine_in_sessions
DROP TRIGGER IF EXISTS trg_create_table_session ON dine_in_sessions;
CREATE TRIGGER trg_create_table_session
  AFTER INSERT ON dine_in_sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_table_session_on_dine_in_session();

-- Step 3: Update table_session when dine_in_session is updated
CREATE OR REPLACE FUNCTION sync_table_session_with_dine_in_session()
RETURNS TRIGGER AS $$
BEGIN
  -- Update corresponding table_session
  UPDATE public.table_sessions
  SET 
    total_amount = NEW.total_amount,
    payment_status = NEW.payment_status,
    status = CASE 
      WHEN NEW.session_status = 'completed' THEN 'completed'
      WHEN NEW.session_status = 'cancelled' THEN 'cancelled'
      ELSE 'active'
    END,
    ended_at = CASE 
      WHEN NEW.session_status IN ('completed', 'cancelled') THEN NEW.completed_at
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE table_id = NEW.table_id
    AND status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create update trigger
DROP TRIGGER IF EXISTS trg_sync_table_session_update ON dine_in_sessions;
CREATE TRIGGER trg_sync_table_session_update
  AFTER UPDATE ON dine_in_sessions
  FOR EACH ROW
  EXECUTE FUNCTION sync_table_session_with_dine_in_session();

-- Step 5: Update restaurant_tables status when table_session changes
CREATE OR REPLACE FUNCTION update_table_status_on_session_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When session becomes active, mark table as occupied
  IF NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active' THEN
    UPDATE public.restaurant_tables
    SET 
      status = 'occupied',
      occupied_at = NEW.started_at,
      current_order_id = NEW.id
    WHERE id = NEW.table_id;
  
  -- When session completes/cancels, mark table as available
  ELSIF NEW.status IN ('completed', 'cancelled') AND OLD.status = 'active' THEN
    UPDATE public.restaurant_tables
    SET 
      status = 'available',
      occupied_at = NULL,
      current_order_id = NULL
    WHERE id = NEW.table_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for table status updates
DROP TRIGGER IF EXISTS trg_update_table_status ON table_sessions;
CREATE TRIGGER trg_update_table_status
  AFTER UPDATE OF status ON table_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_table_status_on_session_change();

-- Step 7: Migrate existing active dine_in_sessions to table_sessions
INSERT INTO table_sessions (
  table_id,
  customer_name,
  customer_email,
  customer_phone,
  started_at,
  status,
  payment_status,
  total_amount
)
SELECT 
  d.table_id,
  p.full_name,
  p.email,
  p.phone_number,
  d.started_at,
  'active',
  d.payment_status,
  d.total_amount
FROM dine_in_sessions d
LEFT JOIN profiles p ON d.user_id = p.id
WHERE d.session_status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM table_sessions ts 
    WHERE ts.table_id = d.table_id 
    AND ts.status = 'active'
  );

-- Step 8: Verify the integration
SELECT 
  'Active Table Sessions' as metric,
  COUNT(*) as count
FROM table_sessions
WHERE status = 'active';

SELECT 
  'Active Dine-in Sessions' as metric,
  COUNT(*) as count
FROM dine_in_sessions
WHERE session_status = 'active';

SELECT 
  'Occupied Tables' as metric,
  COUNT(*) as count
FROM restaurant_tables
WHERE status = 'occupied';

-- Show linked data
SELECT 
  rt.table_number,
  rt.status as table_status,
  ts.id as session_id,
  ts.status as session_status,
  ts.customer_name,
  ts.started_at,
  ds.id as dinein_session_id,
  ds.session_status
FROM restaurant_tables rt
LEFT JOIN table_sessions ts ON rt.id = ts.table_id AND ts.status = 'active'
LEFT JOIN dine_in_sessions ds ON rt.id = ds.table_id AND ds.session_status = 'active'
WHERE rt.status = 'occupied'
ORDER BY rt.table_number;
