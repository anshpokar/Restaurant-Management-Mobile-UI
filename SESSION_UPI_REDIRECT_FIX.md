# ✅ SESSION UPI PAYMENT REDIRECT FIX

## 🐛 Problem

**Issue:** Clicking "Pay & Close Session" → Selecting UPI didn't redirect to payment screen.

**Root Cause:** PaymentScreen component only handled **order payments** (`orderId`), not **session payments** (`sessionId`).

---

## ✅ Solution Applied

### **1. Updated Route Params** (Line 32)

**Before:**
```typescript
const { orderId } = useParams<{ orderId: string }>();
```

**After:**
```typescript
const { orderId, sessionId } = useParams<{ orderId: string; sessionId: string }>();
```

**Result:** Component can now receive both order AND session IDs!

---

### **2. Added Session State** (Lines 36-45)

**Added:**
```typescript
const [session, setSession] = useState<any>(null);
const [paymentAmount, setPaymentAmount] = useState<number>(0);
```

**Result:** Can store and display session payment information!

---

### **3. Dual Fetch Logic** (Lines 48-59)

**Before:**
```typescript
// Only fetches orders
useEffect(() => {
  fetchOrder();
}, [orderId]);
```

**After:**
```typescript
// Fetches either order or session
useEffect(() => {
  if (orderId) {
    fetchOrder();
  } else if (sessionId) {
    fetchSession();
  }
}, [orderId, sessionId]);
```

**Result:** Automatically detects which type of payment and fetches correct data!

---

### **4. New fetchSession Function** (Lines 110-128)

```typescript
const fetchSession = async () => {
  try {
    const { data, error } = await supabase
      .from('dine_in_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    setSession(data);
    setPaymentAmount(data.total_amount);
  } catch (error: any) {
    console.error('Error fetching session:', error);
    toast.error('Failed to load session');
    navigate('/customer/orders');
  } finally {
    setLoading(false);
  }
};
```

**Result:** Loads session details just like fetchOrder does for orders!

---

### **5. Updated QR Generation** (Lines 130-157)

**Before:**
```typescript
const result = await createUPIPayment(
  orderId!,                    // ❌ Only works for orders
  UPI_PAYMENT_VPA,
  RESTAURANT_NAME,
  QR_EXPIRY_MINUTES
);

const link = generateUPILink(
  orderId!,                    // ❌ Hardcoded to orderId
  order.total_amount,          // ❌ Assumes order exists
  UPI_PAYMENT_VPA,
  RESTAURANT_NAME
);
```

**After:**
```typescript
// Use orderId for orders, sessionId for sessions
const paymentId = orderId || sessionId!;

const result = await createUPIPayment(
  paymentId,                   // ✅ Works for both
  UPI_PAYMENT_VPA,
  RESTAURANT_NAME,
  QR_EXPIRY_MINUTES
);

const link = generateUPILink(
  paymentId,                   // ✅ Dynamic ID
  paymentAmount,               // ✅ Works for both
  UPI_PAYMENT_VPA,
  RESTAURANT_NAME
);
```

**Result:** QR code generation works for both orders and sessions!

---

### **6. Updated UI Display** (Lines 205-259)

**Before:**
```typescript
if (!order) {
  return <NotFound />;  // Shows error for sessions!
}

<p>Order #{order.id.slice(0, 8)}</p>
```

**After:**
```typescript
if (!order && !session) {
  return <NotFound />;  // ✅ Shows error only if BOTH missing
}

<p>
  {sessionId ? 
    `Session ${session?.session_name || session?.id.slice(0, 8)}` :
    `Order #${order?.id.slice(0, 8)}`
  }
</p>
```

**Result:** Correctly displays session or order information!

---

## 📊 Complete Flow

### **Customer Journey:**

```
1. Customer clicks "Pay & Close Session"
   ↓
2. Selects UPI payment method
   ↓
3. SessionPaymentModal updates session:
   - payment_method: 'upi'
   - payment_status: 'pending'
   - session_status: stays 'active' ✅
   ↓
4. Navigates to: /customer/payment/session/{sessionId}
   ↓
5. PaymentScreen receives sessionId param
   ↓
6. fetchSession() loads session details
   ↓
7. generateQR() creates QR for session
   ↓
8. Customer sees:
   - Session name/ID
   - Total amount
   - QR code to scan
   ↓
9. Customer scans & pays
   ↓
10. Admin verifies payment
    ↓
11. Session auto-completes (trigger!)
    ↓
12. Redirected to Orders screen ✅
```

---

## 📁 Files Modified

### **Updated:**
1. ✅ `src/pages/customer/upi-payment-screen.tsx`
   - Line 32: Added `sessionId` to route params
   - Lines 36-45: Added session state variables
   - Lines 48-59: Dual fetch logic (order OR session)
   - Lines 110-128: New `fetchSession()` function
   - Lines 130-157: Updated QR generation for both types
   - Lines 205-259: Updated UI to display session info

---

## 🧪 Testing Checklist

### **Test Case 1: Session UPI Payment**
```bash
1. Create dine-in session
2. Add items worth ₹500
3. Click "Pay & Close Session"
4. Select UPI
5. Should redirect to payment screen ✅
6. Should show:
   - Session name ✅
   - Amount: ₹500 ✅
   - QR code ✅
7. Scan QR and pay
8. Admin verifies
9. Session completes ✅
```

### **Test Case 2: Order UPI Payment** (Still Works!)
```bash
1. Place delivery order
2. Select UPI payment
3. Should redirect to payment screen ✅
4. Should show:
   - Order ID ✅
   - Amount ✅
   - QR code ✅
5. Existing functionality preserved ✅
```

---

## ⚠️ Important Notes

### **Session vs Order Payment:**

| Feature | Order Payment | Session Payment |
|---------|--------------|-----------------|
| Route Param | `orderId` | `sessionId` |
| Table | `orders` | `dine_in_sessions` |
| Amount Field | `total_amount` | `total_amount` |
| Display | Order ID | Session Name |
| Status Update | Order only | Session + Orders |

### **Payment Flow Differences:**

**Order Payment:**
```
Order → UPI → Verify → Order marked paid
```

**Session Payment:**
```
Session → UPI → Verify → Session auto-completes (trigger!)
```

---

## 🔍 Debugging Tips

### **If Redirect Still Not Working:**

**Check Console Logs:**
```javascript
// In SessionPaymentModal.tsx line 44:
console.log('Navigating to:', `/customer/payment/session/${sessionId}`);
```

**Verify Route Exists:**
```bash
# Check src/routes/index.tsx line 119:
<Customer path="payment/session/:sessionId" element={<PaymentScreen />} />
```

**Test Navigation Manually:**
```javascript
// In browser console:
window.history.pushState({}, '', '/customer/payment/session/YOUR-SESSION-ID');
```

---

### **If QR Code Not Generating:**

**Check Database:**
```sql
-- Verify session exists
SELECT id, session_name, total_amount, payment_status
FROM dine_in_sessions
WHERE id = 'YOUR-SESSION-ID';

-- Should show session with pending payment
```

**Check UPI Function:**
```typescript
// In generateQR(), add logging:
console.log('Generating QR for:', {
  paymentId,
  amount: paymentAmount,
  isSession: !!sessionId
});
```

---

## ✅ Success Criteria

After these fixes:

✅ **Redirect Works:**
- Click UPI → Immediately redirects
- No errors in console
- Smooth transition

✅ **Display Correct:**
- Shows session name (not order ID)
- Shows correct amount
- Shows "Dine-in Session" label

✅ **QR Generation:**
- QR code appears
- Scannable and valid
- Links to correct UPI address

✅ **Payment Completes:**
- Customer can pay
- Admin can verify
- Session auto-completes

---

## 🎉 Summary

### **Before:**
❌ UPI button clicked → No redirect  
❌ PaymentScreen only handled orders  
❌ Sessions couldn't use UPI  

### **After:**
✅ UPI button clicked → Redirects immediately  
✅ PaymentScreen handles both orders & sessions  
✅ Sessions can use UPI with auto-complete  
✅ Existing order payments still work  

---

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** ✅ COMPLETE - Session UPI Redirect Fixed!
