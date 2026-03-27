-- Check existing UPI payment functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
AND routine_schema = 'public'
AND routine_name LIKE '%create_upi_payment%';

-- Also check upi_payments table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'upi_payments';
