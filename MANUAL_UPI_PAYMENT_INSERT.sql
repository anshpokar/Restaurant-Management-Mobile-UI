-- First check what columns exist
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'upi_payments'
ORDER BY ordinal_position;

-- Then use this corrected INSERT based on your actual table structure
-- If qr_id doesn't exist, we'll use id as the QR identifier
INSERT INTO upi_payments (
  order_id, 
  amount, 
  upi_link, 
  expires_at, 
  status
) VALUES (
  '87d5da7d-7ebd-4dde-bb62-cfb7fa1becaa',  -- Your session ID
  1446,  -- Your session total_amount
  'upi://pay?pa=anshjpokar@oksbi&pn=Navratna%20Restaurant&am=1446&cu=INR&tn=ORDER_87d5da7d-7ebd-4dde-bb62-cfb7fa1becaa',
  NOW() + INTERVAL '5 minutes',
  'pending'
)
RETURNING id, order_id, amount;
