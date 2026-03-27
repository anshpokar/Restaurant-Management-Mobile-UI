# 🧪 TESTING DYNAMIC UPI QR PAYMENT SYSTEM

## Quick Test Guide - Step by Step

---

## 📋 PREREQUISITES

✅ Database table `upi_payments` created  
✅ Code files deployed  
✅ UPI ID configured in `src/lib/upi-payment.ts`  

---

## TEST SCENARIO 1: Basic Payment Flow

### **Step 1: Place Order (As Customer)**

```bash
1. Login as customer
2. Navigate to: /customer/home
3. Add items to cart (e.g., 2 pizzas = ₹500)
4. Go to checkout
5. Select order type: Delivery or Dine-in
6. Payment method: "UPI (QR Code)"
7. Click "Place Order"
```

**Expected Result:**
- ✅ Order created in database
- ✅ Redirected to payment screen
- ✅ URL: `/customer/payment/:orderId`

---

### **Step 2: Generate QR Code**

```bash
1. Payment screen loads automatically
2. QR code appears with:
   - Amount: ₹500
   - Timer: 5:00 countdown
   - Instructions below
```

**Verify:**
- ✅ QR code displays
- ✅ Amount matches order total
- ✅ Timer starts at 5:00
- ✅ UPI link format correct (inspect element)

---

### **Step 3: Make Payment (Real UPI App)**

```bash
1. Open Google Pay / PhonePe / Paytm
2. Scan QR code from screen
3. App shows:
   - Pay to: Your Restaurant
   - Amount: ₹500
   - Note: ORDER_xxxxx-xxxx-xxxx (auto-filled!)
4. Enter UPI PIN
5. Payment successful
6. Note the UTR shown (e.g., 42153128123)
```

**Important:**
- The payment note SHOULD contain the order ID
- This is how you match payment to order

---

### **Step 4: Submit UTR**

```bash
1. Copy UTR from UPI app (e.g., 42153128123)
2. Paste in "UPI Transaction ID" field
3. Click "Submit for Verification"
```

**Expected Result:**
- ✅ Success toast: "Transaction ID submitted for verification!"
- ✅ Status changes to "Verification in Progress"
- ✅ Blue info card appears

---

### **Step 5: Verify Payment (As Admin)**

```bash
1. Open new browser tab (or incognito)
2. Login as admin
3. Navigate to: /admin/upi-verification
4. See payment in "Pending Verification" filter
5. Check details:
   - Order ID matches
   - Amount: ₹500
   - UTR: 42153128123
6. Click "Verify Payment"
```

**Expected Result:**
- ✅ Green success message
- ✅ Payment status changes to "Verified"
- ✅ Stats update: Verified count +1

---

### **Step 6: Confirm Order Updated**

```bash
1. Go back to customer tab
2. Should auto-redirect to: /customer/orders
3. OR refresh payment page
4. See "Payment Successful!" message
5. Check order status: "Confirmed" or "Preparing"
```

**Database Check:**
```sql
-- Run in Supabase SQL Editor
SELECT 
  payment_status,
  is_paid,
  status,
  payment_id,
  paid_at
FROM orders 
WHERE id = 'your-order-id';

-- Expected:
-- payment_status: 'paid'
-- is_paid: true
-- status: 'confirmed' or 'preparing'
-- payment_id: '42153128123' (the UTR)
-- paid_at: [timestamp]
```

---

## TEST SCENARIO 2: QR Expiry

### **Let QR Expire**

```bash
1. Place order and reach payment screen
2. DON'T make payment
3. Wait 5 minutes until timer reaches 0:00
```

**Expected Result:**
- ✅ Yellow warning appears: "QR Code Expired"
- ✅ Message: "For security, this QR code has expired"
- ✅ Button: "Generate New QR Code"

---

### **Regenerate QR**

```bash
1. Click "Generate New QR Code"
2. New QR code appears
3. Timer resets to 5:00
4. Old QR becomes invalid
```

**Verify:**
- ✅ New QR generated
- ✅ Same amount
- ✅ Fresh 5-minute timer
- ✅ Old upi_link marked as expired in DB

---

## TEST SCENARIO 3: Admin Rejects Payment

### **Submit Payment Then Reject**

```bash
1. Customer places order and pays
2. Customer submits UTR
3. Admin sees in pending verification
4. Admin clicks "Reject" instead of "Verify"
5. Prompt: "Enter rejection reason"
6. Enter: "UTR does not match our records"
7. Confirm rejection
```

**Expected Result:**
- ✅ Status changes to "Rejected"
- ✅ Red X badge appears
- ✅ Reason stored in verification_notes
- ✅ Customer sees "Failed" status

**Customer View:**
```bash
1. Refresh customer payment page
2. Sees red "Payment Failed" message
3. Can try again with new QR
```

---

## TEST SCENARIO 4: Real-Time Updates

### **Test Live Subscription**

```bash
1. Customer on payment screen (status: pending)
2. Admin verifies payment in different tab
3. Watch customer screen WITHOUT refreshing
```

**Expected Result:**
- ✅ Customer screen updates automatically (< 2 seconds)
- ✅ Status changes to "verified"
- ✅ Success toast appears
- ✅ Auto-redirect to orders page after 2 seconds

**This proves Supabase Realtime is working!**

---

## TEST SCENARIO 5: Search & Filter

### **Test Admin Dashboard Features**

```bash
1. Create multiple test payments
2. Some verified, some pending, some rejected
3. Go to: /admin/upi-verification
```

**Test Filters:**
```bash
Filter: "Pending Verification"
→ Only shows verification_requested

Filter: "Verified"
→ Only shows verified payments

Filter: "All"
→ Shows everything
```

**Test Search:**
```bash
Search: "42153128123" (UTR)
→ Should find that specific payment

Search: "ORDER_xxx" (Order ID)
→ Should find that order's payment

Search: Customer name
→ Should find if beneficiary_name matches
```

**Expected Result:**
- ✅ Filters work correctly
- ✅ Search returns matching results
- ✅ Stats update when filter changes

---

## TEST SCENARIO 6: Multiple Orders Simultaneously

### **Stress Test**

```bash
1. Customer A places order → Payment pending
2. Customer B places order → Payment pending
3. Customer C places order → Payment pending
4. Admin dashboard shows all 3
5. Admin verifies all 3 one by one
```

**Expected Result:**
- ✅ All 3 appear in admin dashboard
- ✅ Can verify independently
- ✅ No conflicts or errors
- ✅ Each order updates separately

---

## DATABASE VERIFICATION CHECKLIST

Run these SQL queries to verify everything works:

### **Check UPI Payments Table:**
```sql
SELECT 
  up.order_id,
  up.amount,
  up.transaction_id,
  up.status,
  up.created_at,
  o.payment_status,
  o.is_paid
FROM upi_payments up
JOIN orders o ON up.order_id = o.id
ORDER BY up.created_at DESC;
```

**Look for:**
- transaction_id filled
- status = 'verified'
- o.payment_status = 'paid'
- o.is_paid = true

---

### **Check Recent Verifications:**
```sql
SELECT 
  up.order_id,
  up.amount,
  up.transaction_id,
  up.verified_by,
  up.verified_at,
  up.verification_notes,
  p.full_name as verified_by_name
FROM upi_payments up
LEFT JOIN profiles p ON up.verified_by = p.id
WHERE up.status = 'verified'
ORDER BY up.verified_at DESC;
```

**Look for:**
- verified_at timestamp
- verified_by admin ID
- verification_notes if any

---

### **Check Orders Updated:**
```sql
SELECT 
  id,
  total_amount,
  payment_method,
  payment_status,
  payment_id, -- Should contain UTR
  paid_at,
  status
FROM orders
WHERE payment_method = 'upi'
ORDER BY created_at DESC
LIMIT 10;
```

**Look for:**
- payment_status = 'paid'
- payment_id = UTR number
- paid_at timestamp
- status = 'confirmed' or 'preparing'

---

## COMMON ISSUES & FIXES

### **Issue 1: QR Not Generating**

**Symptoms:**
- Blank space where QR should be
- Console error about missing order

**Fix:**
```sql
-- Check if order exists
SELECT id, total_amount FROM orders WHERE id = 'your-order-id';

-- If NULL, order wasn't created
-- If exists, check function
SELECT create_upi_payment('order-id', 500, 'your@upi', 'Name');
```

---

### **Issue 2: Payment Not Showing for Admin**

**Symptoms:**
- Admin dashboard empty
- But customer submitted UTR

**Fix:**
```sql
-- Check RLS policies
SELECT * FROM upi_payments;

-- If permission denied, RLS issue
-- Grant admin access
GRANT SELECT ON upi_payments TO authenticated;
```

---

### **Issue 3: Real-Time Not Working**

**Symptoms:**
- Must refresh to see updates
- No auto-update after admin verifies

**Fix:**
```bash
1. Check Supabase Realtime enabled
2. Verify channel subscription in code
3. Check browser console for errors
4. Ensure same Supabase client used
```

---

## PERFORMANCE TESTS

### **Load Time:**
```bash
✓ Payment screen load: < 2 seconds
✓ QR generation: < 1 second
✓ UTR submission: < 1 second
✓ Admin dashboard load: < 2 seconds
✓ Real-time update: < 1 second
```

### **Concurrent Users:**
```bash
Test with:
- 5 customers paying simultaneously
- 2 admins verifying simultaneously
- No errors or conflicts
```

---

## ✅ FINAL CHECKLIST

Before marking as complete:

**Customer Experience:**
- [ ] QR generates instantly
- [ ] Timer counts down correctly
- [ ] Instructions clear and helpful
- [ ] Can pay via UPI app
- [ ] Can submit UTR easily
- [ ] Gets real-time updates
- [ ] Auto-redirects on success

**Admin Experience:**
- [ ] Dashboard loads fast
- [ ] Filters work correctly
- [ ] Search finds payments
- [ ] Verify button works
- [ ] Reject button works
- [ ] Stats accurate
- [ ] Real-time updates

**System:**
- [ ] Database functions work
- [ ] RLS policies enforced
- [ ] Real-time subscriptions active
- [ ] No console errors
- [ ] No data loss
- [ ] Fraud prevention working

---

## 🎉 SUCCESS INDICATORS

**You'll know it's working when:**

✅ Customer completes payment in < 3 minutes  
✅ Admin verifies in < 2 minutes  
✅ Zero failed verifications (when legitimate payment)  
✅ Fraud prevented (wrong UTR detected)  
✅ Real-time updates instant  
✅ No manual database fixes needed  

---

## 📊 METRICS TO TRACK

After going live, monitor:

1. **Average Payment Time** (customer scans → submits UTR)
   - Target: < 3 minutes

2. **Average Verification Time** (admin sees → verifies)
   - Target: < 2 minutes

3. **Success Rate** (verified / total attempts)
   - Target: > 95%

4. **Fraud Attempts Detected**
   - Target: 0 (or caught by system)

5. **QR Expiry Rate** (expired / total generated)
   - Target: < 10%

---

**Happy Testing! 🧪**

If all tests pass, your Dynamic UPI QR system is production-ready! 🚀
