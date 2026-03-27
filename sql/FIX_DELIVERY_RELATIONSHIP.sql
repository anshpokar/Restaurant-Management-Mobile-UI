-- Run this in the Supabase SQL Editor to fix the relationship error
-- This adds the missing Foreign Key constraint between Orders and Profiles

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS fk_orders_delivery_person;

ALTER TABLE public.orders
ADD CONSTRAINT fk_orders_delivery_person
FOREIGN KEY (delivery_person_id) 
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- Verify the column type and link
COMMENT ON COLUMN public.orders.delivery_person_id IS 'Link to profiles(id) for the delivery person';
