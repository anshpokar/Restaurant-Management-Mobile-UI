# 🗄️ UPDATE DATABASE SQL WITH YOUR UPI DETAILS

## 🎯 WHAT TO DO

You need to update the SQL functions in Supabase with your **actual UPI ID and restaurant name** before running them.

---

## 📝 STEP-BY-STEP GUIDE

### **Step 1: Find Your UPI Details**

Write these down:

```
Your UPI ID: ____________________
(e.g., foodhub@paytm, shop@ybl, restaurant@okaxis)

Your Restaurant Name: ____________________
(e.g., Food Hub Restaurant, Pizza Corner, Café Coffee Day)
```

---

### **Step 2: Open Supabase SQL Editor**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**

---

### **Step 3: Copy & Edit the SQL**

Open [`UPI_PAYMENT_FIXES.md`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/UPI_PAYMENT_FIXES.md) and scroll to the SQL section (around line 57).

**Copy the SQL code, but BEFORE pasting in Supabase, edit these values:**

#### **Find this line:**
```sql
p_vpa text DEFAULT 'your-upi-id@bank', -- ⚠️ CHANGE THIS to your UPI ID
```

**Replace with YOUR UPI ID:**
```sql
p_vpa text DEFAULT 'foodhub@paytm', -- Example: my actual UPI ID
```

---

#### **Find this line:**
```sql
p_restaurant_name text DEFAULT 'Your Restaurant Name', -- ⚠️ CHANGE THIS to your restaurant name
```

**Replace with YOUR restaurant name:**
```sql
p_restaurant_name text DEFAULT 'Food Hub Restaurant', -- My restaurant name
```

---

### **Step 4: Complete Example**

Here's what the edited SQL should look like (with example values):

```sql
-- ============================================
-- DYNAMIC UPI QR - DATABASE FUNCTIONS
-- ============================================

-- 1. FUNCTION TO GENERATE UPI LINK
-- ============================================
CREATE OR REPLACE FUNCTION generate_upi_link(
  p_order_id uuid,
  p_amount numeric,
  p_vpa text DEFAULT 'foodhub@paytm', -- ✅ MY UPI ID
  p_restaurant_name text DEFAULT 'Food Hub Restaurant' -- ✅ MY RESTAURANT NAME
) RETURNS TEXT AS $$
DECLARE
  v_upi_link text;
BEGIN
  -- Format: upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=ORDER_ID
  v_upi_link := format(
    'upi://pay?pa=%s&pn=%s&am=%s&cu=INR&tn=ORDER_%s',
    p_vpa,
    replace(p_restaurant_name, ' ', '_'),
    p_amount::text,
    p_order_id::text
  );
  
  RETURN v_upi_link;
END;
$$ LANGUAGE plpgsql;

-- 2. FUNCTION TO CREATE UPI PAYMENT RECORD
-- ============================================
CREATE OR REPLACE FUNCTION create_upi_payment(
  p_order_id uuid,
  p_vpa text DEFAULT 'foodhub@paytm', -- ✅ MY UPI ID (SAME as above)
  p_restaurant_name text DEFAULT 'Food Hub Restaurant', -- ✅ MY RESTAURANT NAME (SAME as above)
  p_expiry_minutes integer DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
  v_amount numeric;
  v_upi_link text;
  v_qr_id uuid;
BEGIN
  -- Get order amount
  SELECT total_amount INTO v_amount
  FROM orders
  WHERE id = p_order_id;
  
  IF v_amount IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;
  
  -- Generate UPI link
  v_upi_link := generate_upi_link(p_order_id, v_amount, p_vpa, p_restaurant_name);
  
  -- Create or update UPI payment record
  INSERT INTO upi_payments (
    order_id,
    amount,
    vpa,
    upi_link,
    qr_expires_at,
    status
  ) VALUES (
    p_order_id,
    v_amount,
    p_vpa,
    v_upi_link,
    NOW() + (p_expiry_minutes || ' minutes')::interval,
    'pending'
  )
  ON CONFLICT (order_id) DO UPDATE SET
    amount = EXCLUDED.amount,
    vpa = EXCLUDED.vpa,
    upi_link = EXCLUDED.upi_link,
    qr_expires_at = EXCLUDED.qr_expires_at,
    status = 'pending',
    transaction_id = NULL,
    verified_by = NULL,
    verified_at = NULL
  RETURNING id INTO v_qr_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'qr_id', v_qr_id,
    'upi_link', v_upi_link,
    'amount', v_amount,
    'expires_at', NOW() + (p_expiry_minutes || ' minutes')::interval
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_upi_payment TO authenticated;

-- 3. HELPER FUNCTION: VERIFY UPI PAYMENT (Optional)
-- ============================================
CREATE OR REPLACE FUNCTION verify_upi_payment_db(
  p_qr_id uuid,
  p_admin_id uuid,
  p_notes text DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_order_id uuid;
  v_transaction_id text;
BEGIN
  -- Get UPI payment details
  SELECT order_id, transaction_id INTO v_order_id, v_transaction_id
  FROM upi_payments
  WHERE id = p_qr_id;
  
  IF v_order_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment record not found');
  END IF;
  
  -- Update UPI payment status
  UPDATE upi_payments
  SET 
    status = 'verified',
    verified_by = p_admin_id,
    verified_at = NOW(),
    verification_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_qr_id;
  
  -- Update orders table
  UPDATE orders
  SET 
    payment_status = 'paid',
    payment_id = v_transaction_id,
    paid_at = NOW(),
    status = 'confirmed',
    is_paid = true,
    updated_at = NOW()
  WHERE id = v_order_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Payment verified successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_upi_payment_db TO authenticated;
```

---

### **Step 5: Run the SQL**

1. **Paste** your edited SQL into Supabase SQL Editor
2. **Double-check** that UPI ID and restaurant name are correct
3. Click **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
4. Wait for success message

**Expected Result:**
```
✅ Success. No rows returned
✅ Function created: generate_upi_link
✅ Function created: create_upi_payment
✅ Function created: verify_upi_payment_db
✅ Permissions granted
```

---

### **Step 6: Verify Functions Created**

Run this SQL to check:

```sql
-- Check if functions exist
SELECT 
  routine_name as function_name,
  routine_schema as schema_name
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name IN ('generate_upi_link', 'create_upi_payment', 'verify_upi_payment_db');
```

**Expected Output:**
```
| function_name         | schema_name |
|----------------------|-------------|
| generate_upi_link     | public      |
| create_upi_payment    | public      |
| verify_upi_payment_db | public      |
```

---

## ✅ VERIFICATION CHECKLIST

After running SQL:

- [ ] All 3 functions created successfully
- [ ] No error messages
- [ ] UPI ID matches what you want
- [ ] Restaurant name matches what you want
- [ ] Both values are consistent across all functions

---

## 🧪 TEST THE FUNCTIONS

### **Test 1: Generate UPI Link**

```sql
-- Test the generate_upi_link function
SELECT generate_upi_link(
  '123e4567-e89b-12d3-a456-426614174000'::uuid, -- test order ID
  500, -- ₹5.00
  'foodhub@paytm', -- your UPI ID
  'Food Hub Restaurant' -- your restaurant name
) as upi_link;
```

**Expected Output:**
```
upi://pay?pa=foodhub@paytm&pn=Food_Hub_Restaurant&am=500&cu=INR&tn=ORDER_123e4567-e89b-12d3-a456-426614174000
```

✅ If you see your UPI ID and restaurant name in the link → **Working!**

---

### **Test 2: Create UPI Payment**

First, create a test order:

```sql
-- Create test order (if you don't have one)
INSERT INTO orders (user_id, total_amount, payment_method, order_type)
VALUES (
  (SELECT id FROM auth.users LIMIT 1), -- use any user ID
  500,
  'upi',
  'dine_in'
) RETURNING id;
```

Then test the function:

```sql
-- Replace with your actual order ID from above
SELECT create_upi_payment(
  'YOUR-ORDER-ID-HERE'::uuid, -- paste the order ID from above
  'foodhub@paytm', -- your UPI ID
  'Food Hub Restaurant', -- your restaurant name
  5 -- expiry in 5 minutes
);
```

**Expected Output:**
```json
{
  "success": true,
  "qr_id": "xxxx-xxxx-xxxx-xxxx",
  "upi_link": "upi://pay?pa=foodhub@paytm&pn=Food_Hub_Restaurant...",
  "amount": 500,
  "expires_at": "2025-01-15 12:35:00+00"
}
```

✅ If you see success → **Database functions working perfectly!**

---

## 🐛 TROUBLESHOOTING

### **Error: "Function already exists"**

**Solution:** Drop old functions first:

```sql
DROP FUNCTION IF EXISTS generate_upi_link(uuid, numeric, text, text);
DROP FUNCTION IF EXISTS create_upi_payment(uuid, text, text, integer);
DROP FUNCTION IF EXISTS verify_upi_payment_db(uuid, uuid, text);

-- Then run the CREATE FUNCTION statements again
```

---

### **Error: "permission denied"**

**Solution:** Make sure you're logged in as project owner or have admin rights in Supabase.

---

### **Wrong UPI ID Entered!**

**Don't worry!** Just re-run the functions with correct values:

```sql
-- Drop old functions
DROP FUNCTION IF EXISTS generate_upi_link(uuid, numeric, text, text);
DROP FUNCTION IF EXISTS create_upi_payment(uuid, text, text, integer);

-- Re-create with correct values (edit the SQL first!)
-- [Paste the corrected SQL here]
```

---

## 📊 SUMMARY

### **What You Updated:**

| Function | Parameter | Old Value | New Value |
|----------|-----------|-----------|-----------|
| `generate_upi_link` | `p_vpa` | 'restaurant@upi' | **'foodhub@paytm'** ✅ |
| `generate_upi_link` | `p_restaurant_name` | 'Restaurant' | **'Food Hub Restaurant'** ✅ |
| `create_upi_payment` | `p_vpa` | 'restaurant@upi' | **'foodhub@paytm'** ✅ |
| `create_upi_payment` | `p_restaurant_name` | 'Restaurant' | **'Food Hub Restaurant'** ✅ |

---

## 🎉 YOU'RE DONE!

After completing these steps:

✅ Database functions created with YOUR UPI details  
✅ Ready to generate QR codes with YOUR UPI ID  
✅ Ready to accept payments in YOUR account  

**Next:** Update the frontend code constants (see [`CONFIGURE_UPI_PAYMENT.md`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/CONFIGURE_UPI_PAYMENT.md))

---

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** ⚠️ Must be customized before running in Supabase
