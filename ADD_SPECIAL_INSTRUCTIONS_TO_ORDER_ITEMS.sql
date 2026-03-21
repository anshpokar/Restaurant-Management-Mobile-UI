-- =====================================================
-- ADD SPECIAL INSTRUCTIONS AND SPICE LEVEL TO ORDER_ITEMS
-- =====================================================

-- Add special_instructions column
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS spice_level TEXT DEFAULT 'medium' CHECK (spice_level IN ('mild', 'medium', 'spicy', 'extra_spicy'));

-- Add comments
COMMENT ON COLUMN order_items.special_instructions IS 'Customer special requests for this item (e.g., no onions, extra cheese)';
COMMENT ON COLUMN order_items.spice_level IS 'Spice level preference: mild, medium, spicy, extra_spicy';

-- Create index for kitchen filtering (optional, for spicy orders report)
CREATE INDEX IF NOT EXISTS idx_order_items_spice_level ON order_items(spice_level);
