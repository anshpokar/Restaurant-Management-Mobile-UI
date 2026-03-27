-- Run this query FIRST to check what exists
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname LIKE '%upi%' OR p.proname LIKE '%payment%')
ORDER BY p.proname;

-- Also check the upi_payments table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'upi_payments'
ORDER BY ordinal_position;
