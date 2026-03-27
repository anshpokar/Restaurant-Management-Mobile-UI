-- 1. Create a robust trigger to generate OTP whenever a rider is assigned
CREATE OR REPLACE FUNCTION generate_order_otp()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if a rider is being assigned and no OTP exists yet
    IF NEW.delivery_person_id IS NOT NULL AND (OLD.delivery_person_id IS NULL OR NEW.otp IS NULL) AND NEW.otp IS NULL THEN
        NEW.otp := (floor(random() * 9000 + 1000)::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_order_otp ON orders;
CREATE TRIGGER trigger_generate_order_otp
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_otp();

-- 2. FIX EXISTING ORDERS: Run this to generate OTPs for orders currently in progress
UPDATE orders 
SET otp = (floor(random() * 9000 + 1000)::text) 
WHERE delivery_person_id IS NOT NULL 
AND otp IS NULL 
AND status NOT IN ('delivered', 'cancelled');
