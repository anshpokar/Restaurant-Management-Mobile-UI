-- Run this in the Supabase SQL Editor to enable automatic OTP generation
-- This updates the auto-assignment function to generate a 4-digit OTP

CREATE OR REPLACE FUNCTION auto_assign_delivery_smart(order_id UUID)
RETURNS JSONB AS $$
DECLARE
    assigned_person_id UUID;
    order_lat numeric;
    order_lng numeric;
    generated_otp text;
BEGIN
    -- Get order coordinates
    SELECT delivery_latitude, delivery_longitude 
    INTO order_lat, order_lng
    FROM orders 
    WHERE id = order_id;
    
    -- Find nearest available delivery person
    SELECT id INTO assigned_person_id
    FROM find_nearest_available_driver(order_lat, order_lng, 5);
    
    IF assigned_person_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No riders available nearby');
    END IF;

    -- Generate a random 4-digit OTP
    generated_otp := (floor(random() * 9000 + 1000)::text);
    
    -- Update order with rider, status and the NEW OTP
    UPDATE orders 
    SET 
        delivery_person_id = assigned_person_id,
        delivery_status = 'assigned',
        assignment_status = 'pending',
        assigned_at = now(),
        otp = generated_otp
    WHERE id = order_id;
    
    -- Create assignment record
    INSERT INTO delivery_assignments (order_id, delivery_person_id, status)
    VALUES (order_id, assigned_person_id, 'assigned');
    
    -- Send notification
    INSERT INTO notifications (user_id, title, message, type, metadata)
    VALUES (
        assigned_person_id,
        'New Delivery Task',
        'A new order is waiting for you. OTP: ' || generated_otp,
        'delivery_assignment',
        jsonb_build_object('order_id', order_id, 'otp', generated_otp)
    );
    
    RETURN jsonb_build_object('success', true, 'rider_id', assigned_person_id, 'otp', generated_otp);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
