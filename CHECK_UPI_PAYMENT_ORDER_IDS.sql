-- Check what's in upi_payments table and what order_id points to
SELECT 
  up.id as upi_payment_id,
  up.order_id,
  up.amount,
  up.status,
  up.transaction_id,
  CASE 
    WHEN o.id IS NOT NULL THEN 'ORDER'
    WHEN ds.id IS NOT NULL THEN 'SESSION'
    ELSE 'NOT FOUND'
  END as order_id_type,
  COALESCE(o.total_amount::text, ds.total_amount::text) as actual_amount,
  COALESCE(o.payment_status, ds.payment_status) as current_payment_status,
  CASE 
    WHEN o.is_paid = true THEN 'PAID (order)'
    WHEN ds.session_status = 'completed' THEN 'COMPLETED (session)'
    ELSE 'PENDING'
  END as paid_status
FROM upi_payments up
LEFT JOIN orders o ON o.id = up.order_id
LEFT JOIN dine_in_sessions ds ON ds.id = up.order_id
ORDER BY up.created_at DESC
LIMIT 20;

-- Check if there are any mismatched order_ids
SELECT 
  up.id as upi_payment_id,
  up.order_id,
  up.status,
  'ORPHANED - No matching order or session' as status_check
FROM upi_payments up
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = up.order_id)
  AND NOT EXISTS (SELECT 1 FROM dine_in_sessions ds WHERE ds.id = up.order_id);
