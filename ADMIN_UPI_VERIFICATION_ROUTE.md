# 🛡️ ADMIN UPI VERIFICATION - COMPLETE GUIDE

## ✅ ROUTE EXISTS

**Route:** `/admin/upi-verification`  
**Component:** [`AdminUPIVerificationScreen`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/admin/upi-verification-screen.tsx)  
**File Location:** `src/pages/admin/upi-verification-screen.tsx`

---

## 🗺️ NAVIGATION STRUCTURE

### **Access Points:**

1. **From Admin Dashboard:**
   ```
   Admin Dashboard → "UPI Verifications" button
   URL: /admin/upi-verification
   ```

2. **Direct Navigation:**
   ```
   http://localhost:5173/admin/upi-verification
   ```

3. **From Admin Menu:**
   ```
   Admin App → Menu → UPI Verification
   ```

---

## 🎯 WHAT THE SCREEN DOES

### **Features:**

1. **View All Pending Payments**
   - Shows payments with status: `verification_requested`
   - Real-time updates via Supabase Realtime
   - Auto-refresh every 30 seconds

2. **Filter & Search**
   - Filter by status: pending, verified, failed
   - Search by order ID, transaction ID, amount
   - Sort by date/time

3. **Verify Payments**
   - Click "Verify" button
   - Confirms payment received in bank
   - Updates order status to "paid"
   - Notifies customer

4. **Reject Payments**
   - Click "Reject" button
   - Provides rejection reason
   - Customer notified to retry

---

## 📊 UI LAYOUT

```
┌─────────────────────────────────────────┐
│  UPI Payment Verification               │
│  ─────────────────────────────────────  │
│                                         │
│  [Search Box]     [Filter: Pending ▼]   │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 🔍 PENDING VERIFICATIONS (3)      │  │
│  ├───────────────────────────────────┤  │
│  │                                   │  │
│  │ Order #12345                      │  │
│  │ Amount: ₹500.00                   │  │
│  │ UTR: 42153128123                  │  │
│  │ Time: 2 mins ago                  │  │
│  │                                   │  │
│  │ [✓ Verify]  [✗ Reject]           │  │
│  │                                   │  │
│  ├───────────────────────────────────┤  │
│  │ Order #12346                      │  │
│  │ ...                               │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ 📊 TODAY'S SUMMARY                │  │
│  ├───────────────────────────────────┤  │
│  │ Total: ₹15,250                    │  │
│  │ Verified: 28                      │  │
│  │ Pending: 3                        │  │
│  │ Rejected: 1                       │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🔧 HOW IT WORKS

### **Step-by-Step Flow:**

#### **1. Customer Submits UTR**
```typescript
Customer pays via UPI app
        ↓
Enters UTR number in payment screen
        ↓
Clicks "Submit for Verification"
        ↓
Database update:
{
  status: 'verification_requested',
  transaction_id: '42153128123' // UTR
}
```

#### **2. Admin Gets Notification**
```typescript
Real-time subscription detects change
        ↓
Payment appears in admin dashboard
        ↓
Shows in "Pending Verification" list
        ↓
Admin sees:
- Order ID
- Amount
- UTR number
- Customer name
- Timestamp
```

#### **3. Admin Verifies Payment**
```typescript
Admin clicks "Verify" button
        ↓
Checks bank account/UPI app
        ↓
Confirms money received
        ↓
Calls verifyUPIPayment(qrId, adminId)
        ↓
Database updates:
{
  status: 'verified',
  verified_at: NOW(),
  verified_by: adminId
}
```

#### **4. Order Status Updated**
```typescript
Orders table updated:
{
  payment_status: 'paid',
  status: 'confirmed'
}
        ↓
Chef receives order
        ↓
Customer gets notification
```

---

## 💻 CODE BREAKDOWN

### **Key Functions:**

#### **fetchUpiPayments()**
```typescript
async function fetchUpiPayments() {
  const { data, error } = await supabase
    .from('upi_payments')
    .select(`
      *,
      orders:user_id (
        id,
        total_amount,
        status
      )
    `)
    .eq('status', filter)
    .order('created_at', { ascending: false });
}
```

#### **handleVerify()**
```typescript
async function handleVerify(paymentId: string) {
  setVerifyingId(paymentId);
  
  try {
    const result = await verifyUPIPayment(
      paymentId,
      currentUser.id,
      'Verified via bank confirmation'
    );
    
    if (result.success) {
      toast.success('✅ Payment verified successfully!');
      fetchUpiPayments(); // Refresh list
    } else {
      toast.error('Failed to verify');
    }
  } catch (error) {
    toast.error('Error verifying payment');
  } finally {
    setVerifyingId(null);
  }
}
```

---

## 🧪 TESTING THE FLOW

### **Test Scenario:**

#### **Setup (5 minutes)**
```
1. Login as customer
2. Place order (₹10)
3. Go to payment screen
4. Note order ID
```

#### **Customer Side (2 minutes)**
```
1. QR code displays
2. Open PhonePe/GPay/Paytm
3. Scan QR or use UPI ID: anshjpokar@oksbi
4. Pay ₹10
5. Note UTR number (e.g., 42153128123)
6. Enter UTR in form
7. Click "Submit for Verification"
8. Status → "Verification Requested"
```

#### **Admin Side (2 minutes)**
```
1. Logout from customer
2. Login as admin
3. Go to Dashboard → UPI Verification
   OR navigate to: /admin/upi-verification
4. See your payment in pending list
5. Check your bank app for ₹10 receipt
6. Click "Verify Payment"
7. Status → "Verified" ✅
```

#### **Verification (1 minute)**
```
1. Check database:
   SELECT status FROM upi_payments WHERE id = '...';
   -- Should show: 'verified'
   
2. Check order:
   SELECT payment_status FROM orders WHERE id = '...';
   -- Should show: 'paid'
   
3. Customer gets notification
4. Chef receives order
```

---

## 🎨 UI COMPONENTS USED

### **From Design System:**

```typescript
import { Button } from '@/components/design-system/button';
import { Card } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
```

### **Icons:**

```typescript
import { 
  CheckCircle,   // Success/Verified
  XCircle,       // Reject/Failed
  Clock,         // Pending/Time
  RefreshCw,     // Reload/Refresh
  Search,        // Search box
  Filter,        // Filter dropdown
  DollarSign,    // Amount/Money
  CreditCard     // Payment method
} from 'lucide-react';
```

---

## 📡 REAL-TIME UPDATES

### **Supabase Realtime Subscription:**

```typescript
const channel = supabase.channel('upi-payments-admin')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'upi_payments'
    },
    () => {
      fetchUpiPayments(); // Auto-refresh on changes
    }
  )
  .subscribe();
```

**What this means:**
- ✅ New payment submitted → List updates automatically
- ✅ Payment verified → Status changes instantly
- ✅ No manual refresh needed!

---

## 🔒 SECURITY & PERMISSIONS

### **RLS Policies:**

```sql
-- Only admins can view all payments
CREATE POLICY "Admins can view all UPI payments"
ON upi_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Only admins can verify
CREATE POLICY "Admins can verify UPI payments"
ON upi_payments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```

**Access Control:**
- ✅ Admin role required
- ✅ Authenticated users only
- ✅ Audit trail (who verified what)

---

## 📊 DATABASE OPERATIONS

### **Query to Fetch Pending:**

```sql
SELECT 
  up.id,
  up.order_id,
  up.amount,
  up.transaction_id,
  up.status,
  up.created_at,
  o.total_amount,
  o.status as order_status
FROM upi_payments up
JOIN orders o ON up.order_id = o.id
WHERE up.status = 'verification_requested'
ORDER BY up.created_at DESC;
```

### **Update on Verify:**

```sql
UPDATE upi_payments
SET 
  status = 'verified',
  verified_by = 'admin-uuid-here',
  verified_at = NOW(),
  verification_notes = 'Confirmed in bank account'
WHERE id = 'payment-uuid-here';

UPDATE orders
SET 
  payment_status = 'paid',
  status = 'confirmed'
WHERE id = 'order-uuid-here';
```

---

## 🚨 TROUBLESHOOTING

### **Issue 1: Can't Access Screen**

**Problem:** Getting redirected or 403 error

**Solution:**
```sql
-- Check user role
SELECT role FROM profiles WHERE id = 'your-user-id';
-- Should show: 'admin'

-- If not admin, update:
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'your-user-id';
```

---

### **Issue 2: No Payments Showing**

**Problem:** List is empty but customer submitted UTR

**Solution:**
```sql
-- Check if payment exists
SELECT * FROM upi_payments 
WHERE status = 'verification_requested';

-- If empty, check other statuses
SELECT status, COUNT(*) 
FROM upi_payments 
GROUP BY status;
```

---

### **Issue 3: Verify Button Not Working**

**Problem:** Clicking verify does nothing

**Possible causes:**
1. RLS policy blocking
2. Missing admin role
3. Database function error

**Debug:**
```sql
-- Check current user permissions
SELECT auth.uid();
SELECT role FROM profiles WHERE id = auth.uid();

-- Test manual update
UPDATE upi_payments 
SET status = 'verified' 
WHERE id = 'test-id';
-- If fails, check RLS policies
```

---

## 🎯 QUICK ACCESS LINKS

### **Development:**
```
http://localhost:5173/admin/upi-verification
```

### **Production:**
```
https://your-domain.com/admin/upi-verification
```

### **Related Routes:**
```
/admin/dashboard          - Main admin dashboard
/admin/orders             - All orders view
/admin/reports            - Payment reports
```

---

## 📱 MOBILE RESPONSIVE

The screen is fully responsive:

- **Desktop:** Full table view with all columns
- **Tablet:** Compact cards layout
- **Mobile:** Single column with action buttons

---

## ✅ COMPLETION STATUS

| Feature | Status |
|---------|--------|
| Route configured | ✅ |
| Component built | ✅ |
| Real-time updates | ✅ |
| Filter & search | ✅ |
| Verify action | ✅ |
| Reject action | ✅ |
| Admin permissions | ✅ |
| Mobile responsive | ✅ |
| Toast notifications | ✅ |
| Audit trail | ✅ |

---

## 🚀 NEXT STEPS

1. **Test the flow** - Place order and verify
2. **Customize UI** - Add restaurant branding
3. **Add filters** - Date range, amount range
4. **Export feature** - Download CSV reports
5. **Bulk actions** - Verify multiple payments

---

**Route Ready!** ✅  
**Status:** Fully functional and ready to use  
**Access:** `/admin/upi-verification`  
**Permissions:** Admin role required
