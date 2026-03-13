-- =====================================================
-- ADD MISSING payment_method COLUMN TO dine_in_sessions
-- This fixes the 406 error in payment history screen
-- =====================================================

-- Add payment_method column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dine_in_sessions' 
        AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE dine_in_sessions 
        ADD COLUMN payment_method text 
        CHECK (payment_method IN ('cod', 'upi', 'razorpay'));
        
        RAISE NOTICE 'Added payment_method column to dine_in_sessions';
    ELSE
        RAISE NOTICE 'Column payment_method already exists';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'dine_in_sessions'
AND column_name = 'payment_method';

-- Show all columns for reference
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'dine_in_sessions'
ORDER BY ordinal_position;
