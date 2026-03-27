# 🔧 UPI PAYMENT SYSTEM - ERROR FIXES & SETUP

## ✅ ERRORS FIXED

### **1. Badge Component Variants** ✅ FIXED

**File:** `src/components/design-system/badge.tsx`

**Problem:** Admin screen was using `variant="destructive"` and `variant="secondary"` which didn't exist.

**Solution:** Added these variants to the Badge component.

```typescript
// Now supports:
variant?: 'veg' | 'nonveg' | 'success' | 'warning' | 'error' | 'info' | 'paid' | 'pending' | 'vacant' | 'occupied' | 'destructive' | 'secondary'
```

---

## ⚠️ DATABASE FUNCTIONS NEEDED

The code calls database functions that **MUST be created** in Supabase first!

### **Required Database Functions:**

Run this SQL in your **Supabase SQL Editor**:

```sql
-- ============================================
-- DYNAMIC UPI QR - DATABASE FUNCTIONS
-- ============================================

-- 1. FUNCTION TO GENERATE UPI LINK
-- ============================================
CREATE OR REPLACE FUNCTION generate_upi_link(
  p_order_id uuid,
  p_amount numeric,
  p_vpa text DEFAULT 'your-upi-id@bank', -- ⚠️ CHANGE THIS to your UPI ID (e.g., 'myrestaurant@paytm')
  p_restaurant_name text DEFAULT 'Your Restaurant Name' -- ⚠️ CHANGE THIS to your restaurant name
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
  p_vpa text DEFAULT 'your-upi-id@bank', -- ⚠️ CHANGE THIS to your UPI ID
  p_restaurant_name text DEFAULT 'Your Restaurant Name', -- ⚠️ CHANGE THIS to your restaurant name
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

-- 3. HELPER FUNCTION: VERIFY UPI PAYMENT (Optional - can do in app)
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

## 🧪 TESTING AFTER FIXES

### **Step 1: Verify Badge Works**

```bash
1. Go to: /admin/upi-verification
2. Should see badges with different colors:
   - Green: Verified
   - Yellow: Pending Verification
   - Red: Failed
   - Gray: Expired/Pending
```

**If badges show correctly:** ✅ Badge fix working!

---

### **Step 2: Test QR Generation**

```bash
1. Place order as customer (₹10)
2. Reach payment screen
3. QR code should appear
4. Timer should count down from 5:00
```

**If QR appears:** ✅ Database function working!

**If error "Function does not exist":**
```sql
-- Run the SQL above in Supabase SQL Editor
-- Then try again
```

---

### **Step 3: Test Payment Flow**

```bash
1. Make real UPI payment (₹10)
2. Get UTR from UPI app
3. Enter UTR in form
4. Submit for verification
5. Verify as admin
6. Order should update to "confirmed"
```

**If order updates:** ✅ Complete flow working!

---

## 🐛 COMMON ERRORS & SOLUTIONS

### **Error 1: "Badge variant not defined"**

**Symptom:** TypeScript error about variant

**Solution:** Already fixed! Badge component now supports all variants.

---

### **Error 2: "Function create_upi_payment does not exist"**

**Symptom:** 
```
Error: Cannot find function create_upi_payment in schema public
```

**Solution:**
```sql
-- Run the SQL functions above in Supabase
-- Go to: Supabase Dashboard → SQL Editor
-- Paste and execute the SQL
```

---

### **Error 3: "permission denied for table upi_payments"**

**Symptom:** Can't read/write to upi_payments table

**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'upi_payments';

-- If missing, run this:
ALTER TABLE public.upi_payments ENABLE ROW LEVEL SECURITY;

-- Customers can view own payments
CREATE POLICY "Users can view own UPI payments" ON public.upi_payments FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = upi_payments.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Allow insert from authenticated users
CREATE POLICY "Users can create UPI payments" ON public.upi_payments FOR INSERT
TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = upi_payments.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all UPI payments" ON public.upi_payments FOR SELECT
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Admins can update
CREATE POLICY "Admins can verify UPI payments" ON public.upi_payments FOR UPDATE
TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);
```

---

### **Error 4: QR Code Not Displaying**

**Symptoms:** Blank space where QR should be

**Possible Causes:**
1. Order doesn't exist
2. Order has no total_amount
3. `react-qr-code` package not installed

**Solutions:**

```bash
# Check if package installed
npm list react-qr-code

# If not installed:
npm install react-qr-code
```

```sql
-- Check order exists
SELECT id, total_amount FROM orders WHERE id = 'your-order-id';
```

---

### **Error 5: Real-Time Updates Not Working**

**Symptoms:** Must refresh page to see updates

**Solution:**
```typescript
// Check if Supabase Realtime is enabled
// In Supabase Dashboard:
// Database → Replication → Enable realtime for upi_payments table
```

Also check browser console for subscription errors.

---

## ✅ FINAL VERIFICATION CHECKLIST

After applying all fixes:

### **Frontend:**
- [ ] No TypeScript errors in VS Code
- [ ] No console errors in browser
- [ ] Badges display correctly in admin dashboard
- [ ] QR code renders properly
- [ ] Timer counts down
- [ ] Forms are fillable
- [ ] Buttons clickable

### **Backend:**
- [ ] `upi_payments` table exists
- [ ] `create_upi_payment()` function exists
- [ ] RLS policies configured
- [ ] Realtime enabled for table

### **Flow Test:**
- [ ] Can place order
- [ ] QR generates successfully
- [ ] Can make UPI payment
- [ ] Can submit UTR
- [ ] Admin can verify
- [ ] Order updates automatically

---

## 📊 FILES STATUS

### **Fixed Files:**
✅ `src/components/design-system/badge.tsx` - Added destructive/secondary variants

### **Already Created (No Changes Needed):**
✅ `src/pages/customer/upi-payment-screen.tsx` - Customer UI
✅ `src/pages/admin/upi-verification-screen.tsx` - Admin dashboard
✅ `src/lib/upi-payment.ts` - Payment library
✅ `src/routes/index.tsx` - Routes configured

### **Database (YOU MUST RUN SQL):**
⏳ Run SQL functions in Supabase SQL Editor

---

## 🚀 QUICK START AFTER FIXES

### **1. Configure UPI ID** (2 minutes)

Edit `src/lib/upi-payment.ts` line ~25-26:

```typescript
const UPI_PAYMENT_VPA = 'your-real-upi@bank'; // CHANGE THIS!
const RESTAURANT_NAME = 'Your Restaurant Name'; // CHANGE THIS!
```

---

### **2. Run Database SQL** (3 minutes)

```bash
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy SQL from above
4. Click "Run"
5. Verify success message
```

---

### **3. Test System** (5 minutes)

```bash
1. npm run dev
2. Go to /customer/home
3. Add item to cart
4. Checkout with UPI payment
5. See QR code
6. Make ₹10 payment
7. Submit UTR
8. Verify as admin
9. Success! ✅
```

---

## 🎉 YOU'RE DONE!

All errors are now fixed! The system is ready to use once you:

1. ✅ Badge variants added (DONE)
2. ⏳ Run database SQL functions (YOUR TURN)
3. ⏳ Configure your UPI ID (YOUR TURN)
4. ⏳ Test complete flow (YOUR TURN)

**After completing these steps, you'll have a fully functional Dynamic UPI QR payment system!** 🎊

---

## 📞 QUICK REFERENCE

**Files to Edit:**
- `src/lib/upi-payment.ts` - Change UPI ID here

**SQL to Run:**
- Copy from "DATABASE FUNCTIONS NEEDED" section above

**Test URLs:**
- Customer: `/customer/payment/:orderId`
- Admin: `/admin/upi-verification`

**Documentation:**
- `DYNAMIC_UPI_QR_COMPLETE_GUIDE.md` - Full guide
- `TESTING_UPI_PAYMENT.md` - Testing scenarios
- `DYNAMIC_UPI_QUICK_START.md` - Quick reference

---

**Document Version:** 1.1 (with fixes)  
**Created:** 2025-01-15  
**Status:** ✅ All code errors fixed - Ready for deployment!
