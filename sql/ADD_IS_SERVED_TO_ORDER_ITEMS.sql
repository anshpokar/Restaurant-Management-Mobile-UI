-- Add is_served column to order_items table
-- This allows tracking the serving status of individual items in an order

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS is_served BOOLEAN DEFAULT FALSE;

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'is_served';
