-- =====================================================
-- ADD MISSING COLUMNS TO OFFERS TABLE
-- =====================================================
-- This migration adds the required columns for the 
-- modern offer system (Flat/Percentage discounts)
-- =====================================================

-- 1. Add discount_type with check constraint
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS discount_type text 
CHECK (discount_type IN ('flat', 'percentage')) 
DEFAULT 'percentage';

-- 2. Add discount_value
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS discount_value numeric(10,2) 
DEFAULT 0;

-- 3. Add min_order_amount (Optional)
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS min_order_amount numeric(10,2) 
DEFAULT 0;

-- 4. Ensure created_at is default now() if missing
-- (User schema already had this, but safe to keep)

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_offers_is_active ON public.offers(is_active);

-- Notify about completion
COMMENT ON COLUMN public.offers.discount_type IS 'Type of discount: flat (₹) or percentage (%)';
COMMENT ON COLUMN public.offers.discount_value IS 'Value of the discount based on discount_type';
