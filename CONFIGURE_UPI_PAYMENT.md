# ⚙️ UPI PAYMENT CONFIGURATION GUIDE

## 🎯 WHAT YOU NEED TO DO NOW

Your UPI payment system is **95% complete**! You just need to update **2 constants** with your actual UPI details.

---

## 📝 STEP 1: UPDATE YOUR UPI ID

### **Find Your UPI ID:**

Your UPI ID (also called VPA - Virtual Payment Address) looks like:
- `yourname@paytm`
- `restaurant@ybl` (PhonePe)
- `shop@ibl` (IndusPay)
- `business@okaxis` (Axis Bank)
- `store@okhdfcbank` (HDFC Bank)

**Examples:**
```
✅ myrestaurant@paytm
✅ foodhub@ybl
✅ pizza_shop@okaxis
✅ cafe@ibl
```

---

### **Update in TWO Files:**

#### **File 1: src/pages/customer/upi-payment-screen.tsx**

Open this file and find lines 25-27:

```typescript
// ⚠️ IMPORTANT: UPDATE THESE WITH YOUR ACTUAL UPI DETAILS!
const UPI_PAYMENT_VPA = 'your-upi-id@bank'; // Example: 'myrestaurant@paytm' or 'foodhub@ybl'
const RESTAURANT_NAME = 'Your Restaurant Name'; // Example: 'Food Hub Restaurant'
const QR_EXPIRY_MINUTES = 5; // QR code expires after 5 minutes
```

**Change to YOUR details:**

```typescript
// Example for "Food Hub Restaurant" with UPI ID "foodhub@paytm"
const UPI_PAYMENT_VPA = 'foodhub@paytm'; // YOUR actual UPI ID
const RESTAURANT_NAME = 'Food Hub Restaurant'; // YOUR restaurant name
const QR_EXPIRY_MINUTES = 5;
```

---

#### **File 2: src/lib/upi-payment.ts**

Open this file and find lines 12-16 and 29-32:

You'll see two functions with default parameters:

**Function 1: generateUPILink (around line 15-16)**
```typescript
export const generateUPILink = (
  orderId: string,
  amount: number,
  vpa: string = 'your-upi-id@bank', // ⚠️ CHANGE THIS to your UPI ID
  restaurantName: string = 'Your Restaurant Name' // ⚠️ CHANGE THIS to your restaurant name
): string => {
```

**Function 2: createUPIPayment (around line 31-32)**
```typescript
export const createUPIPayment = async (
  orderId: string,
  vpa: string = 'your-upi-id@bank', // ⚠️ CHANGE THIS to your UPI ID
  restaurantName: string = 'Your Restaurant Name', // ⚠️ CHANGE THIS to your restaurant name
  expiryMinutes: number = 5
) => {
```

**Change BOTH to match your details:**

```typescript
// Use the SAME values in both places
vpa: string = 'foodhub@paytm', // Your UPI ID
restaurantName: string = 'Food Hub Restaurant', // Your restaurant name
```

---

## ✅ VERIFICATION CHECKLIST

After updating:

- [ ] Both files have the **same** UPI ID
- [ ] Both files have the **same** restaurant name
- [ ] UPI ID format is correct (something@bank)
- [ ] No typos in UPI ID
- [ ] Restaurant name is readable (can have spaces)

**Example of correct configuration:**
```typescript
// File 1: upi-payment-screen.tsx
const UPI_PAYMENT_VPA = 'foodhub@paytm';
const RESTAURANT_NAME = 'Food Hub Restaurant';

// File 2: upi-payment.ts (both functions)
vpa: string = 'foodhub@paytm',
restaurantName: string = 'Food Hub Restaurant',
```

---

## 🧪 TEST YOUR CONFIGURATION

### **Quick Test:**

1. **Save both files**
2. **Restart development server:**
   ```bash
   npm run dev
   ```

3. **Place a test order:**
   ```
   - Go to /customer/home
   - Add any item (₹10-50)
   - Checkout with UPI payment
   ```

4. **Check QR Code:**
   ```
   - QR should appear on payment screen
   - Amount should be correct
   - Timer should count down from 5:00
   ```

5. **Test Payment:**
   ```
   - Open PhonePe/Google Pay/Paytm
   - Scan the QR code
   - Your UPI app should show:
     ✓ Pay to: [Your Restaurant Name]
     ✓ Amount: ₹XX.XX
     ✓ Note: ORDER_xxxxx
   ```

6. **Verify it works:**
   ```
   - Make small payment (₹1-10)
   - Get UTR from UPI app
   - Enter UTR in form
   - Submit for verification
   - Verify as admin
   - Order should update to "confirmed"
   ```

---

## 🐛 TROUBLESHOOTING

### **Issue 1: QR Shows Wrong UPI ID**

**Symptom:** When scanning QR, it shows different UPI ID than expected

**Solution:**
```typescript
// Check both files have SAME UPI ID:
// 1. src/pages/customer/upi-payment-screen.tsx (line 25)
const UPI_PAYMENT_VPA = 'your-upi@bank';

// 2. src/lib/upi-payment.ts (lines 15 and 31)
vpa: string = 'your-upi@bank',
```

All THREE places must match!

---

### **Issue 2: Restaurant Name Not Showing**

**Symptom:** UPI app shows generic name instead of your restaurant

**Solution:**
```typescript
// Update restaurantName in both files:
// 1. upi-payment-screen.tsx (line 26)
const RESTAURANT_NAME = 'Food Hub Restaurant';

// 2. upi-payment.ts (lines 16 and 32)
restaurantName: string = 'Food Hub Restaurant',
```

---

### **Issue 3: Payment Goes to Wrong Person**

**⚠️ CRITICAL:** This means UPI ID is wrong!

**Immediate Fix:**
1. Stop accepting payments
2. Update UPI_ID to correct one
3. Test with ₹1 before going live

**How to avoid:**
```typescript
// ALWAYS double-check your UPI ID format:
✅ Correct: 'restaurant@paytm'
✅ Correct: 'foodhub@ybl'
❌ Wrong: 'restaurant@upi' (generic)
❌ Wrong: 'my-upi-id@bank' (placeholder)
```

---

## 💡 PRO TIPS

### **1. Use Production UPI ID**

For testing, you can use a personal UPI ID:
```typescript
const UPI_PAYMENT_VPA = 'your-personal@paytm';
```

For production, use business UPI ID:
```typescript
const UPI_PAYMENT_VPA = 'your-business@paytm';
```

---

### **2. Test with Small Amounts First**

Before going live:
```
Day 1: Test with ₹1-10 payments
Day 2: Test with ₹50-100 payments  
Day 3: Go live with real orders
```

---

### **3. Keep Backup Configuration**

Create a `.env.example` file:
```env
# UPI Payment Configuration
VITE_UPI_VPA=your-upi@bank
VITE_RESTAURANT_NAME=Your Restaurant
VITE_QR_EXPIRY_MINUTES=5
```

Then use in code:
```typescript
const UPI_PAYMENT_VPA = import.meta.env.VITE_UPI_VPA || 'default@upi';
```

---

## 📊 COMPLETE CONFIGURATION SUMMARY

### **What to Update:**

| File | Line | Variable | Example Value |
|------|------|----------|---------------|
| `upi-payment-screen.tsx` | 25 | `UPI_PAYMENT_VPA` | `'foodhub@paytm'` |
| `upi-payment-screen.tsx` | 26 | `RESTAURANT_NAME` | `'Food Hub Restaurant'` |
| `upi-payment.ts` | 15 | `vpa` (default) | `'foodhub@paytm'` |
| `upi-payment.ts` | 16 | `restaurantName` (default) | `'Food Hub Restaurant'` |
| `upi-payment.ts` | 31 | `vpa` (default) | `'foodhub@paytm'` |
| `upi-payment.ts` | 32 | `restaurantName` (default) | `'Food Hub Restaurant'` |

**Total: 6 places to update (2 files)**

---

## ✅ FINAL CHECKLIST

Before accepting real payments:

- [ ] Updated UPI ID in both files
- [ ] Updated restaurant name in both files
- [ ] Tested with ₹1-10 payment
- [ ] Verified money goes to YOUR account
- [ ] Checked QR displays correctly
- [ ] Tested UTR submission
- [ ] Tested admin verification
- [ ] No console errors
- [ ] Real-time updates working

---

## 🎉 YOU'RE READY!

Once you've updated these constants and tested, your Dynamic UPI QR payment system will be **100% ready for production!**

**Next Steps:**
1. ✅ Update constants (above)
2. ⏳ Run database SQL (from UPI_PAYMENT_FIXES.md)
3. ⏳ Test with real payment
4. ⏳ Go live! 🚀

---

**Need help?** Read [`UPI_PAYMENT_FIXES.md`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/UPI_PAYMENT_FIXES.md) for complete setup guide!

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** ⚠️ Configuration Required Before Use
