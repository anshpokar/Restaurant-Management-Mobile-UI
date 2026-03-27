-- =====================================================
-- ADD ORDER_NUMBER COLUMN AND AUTO-GENERATION TRIGGER
-- =====================================================
-- This migration adds the 'order_number' column to the 
-- orders table and a trigger to automatically generate 
-- a human-readable identifier (e.g., ORD-1001).
-- =====================================================

-- 1. Add order_number column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number text;

-- 2. Create a sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1001;

-- 3. Create function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORD-' || nextval('order_number_seq')::text;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS tr_generate_order_number ON public.orders;
CREATE TRIGGER tr_generate_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- 5. Backfill existing orders with order numbers
WITH numbered_orders AS (
  SELECT id, 'ORD-' || (1000 + row_number() OVER (ORDER BY created_at))::text as new_number
  FROM public.orders
  WHERE order_number IS NULL
)
UPDATE public.orders
SET order_number = numbered_orders.new_number
FROM numbered_orders
WHERE public.orders.id = numbered_orders.id;

-- 6. Update sequence to start after backfilled values
SELECT setval('order_number_seq', (SELECT COALESCE(MAX(SUBSTRING(order_number FROM 5)::int), 1000) FROM public.orders) + 1);

-- Notify about completion
COMMENT ON COLUMN public.orders.order_number IS 'Human-readable order identifier generated automatically (e.g., ORD-1001)';
