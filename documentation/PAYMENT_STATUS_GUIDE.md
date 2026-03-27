# 💳 Payment Status Guide

## Understanding Payment Statuses in Payment History

### 🔄 Two Different Payment Systems

Your app has **TWO** payment systems with **DIFFERENT** status values:

```
1. UPI Payments (Digital)
   └─ Uses upi_payments table statuses

2. COD Payments (Cash)
   └─ Uses orders/dine_in_sessions table statuses
```

---

## 📊 Complete Status Mapping

### UPI Payment Statuses

| Status | Meaning | Display |
|--------|---------|---------|
| `pending` | QR generated, waiting for payment | ⏳ Pending |
| `verification_requested` | Customer submitted UTR, waiting for admin | ⏳ Pending |
| `verified` | Admin verified UPI payment ✅ | ✅ Approved |
| `failed` | Payment failed or rejected | ❌ Rejected |

### COD (Cash) Payment Statuses

| Status | Meaning | Display |
|--------|---------|---------|
| `pending` | Order placed, cash pending | ⏳ Pending |
| `confirming_payment` | Session ended, awaiting admin confirmation | ⏳ Pending |
| `paid` | Admin confirmed cash received ✅ | ✅ Approved |
| `partial` | Partial payment made | ⏳ Pending |

---

## 🎯 Filter Logic Explained

### **"Approved" Filter**
Shows payments where:
- UPI: `status === 'verified'`
- COD: `payment_status === 'paid'`
- Session: `session_status === 'completed'`

**Meaning:** Payment fully completed and verified

---

### **"Pending" Filter**
Shows payments where:
- UPI: `status === 'pending'` OR `verification_requested`
- COD: `payment_status === 'pending'` OR `confirming_payment`

**Meaning:** Waiting for payment or admin verification

---

### **"Rejected" Filter**
Shows payments where:
- UPI: `status === 'failed'`
- COD: `payment_status === 'refunded'` (if applicable)

**Meaning:** Payment failed or was rejected

---

## 🔍 Example Scenarios

### Scenario 1: UPI Payment Flow
```
Customer creates order → ₹500
    ↓
Selects UPI payment
    ↓
Status: 'pending' (QR generated)
    ↓
Customer scans & pays
    ↓
Submits UTR: 42153128123
    ↓
Status: 'verification_requested' ⏳ PENDING
    ↓
Admin checks bank account
    ↓
Admin clicks "Verify Payment"
    ↓
Status: 'verified' ✅ APPROVED
```

---

### Scenario 2: COD Payment Flow
```
Customer creates order → ₹500
    ↓
Selects "Pay Cash" (COD)
    ↓
Status: 'pending' ⏳ PENDING
    ↓
Customer receives order
    ↓
Ends dine-in session
    ↓
Status: 'confirming_payment' ⏳ PENDING
    ↓
Admin verifies cash received
    ↓
Admin clicks "Confirm Cash"
    ↓
Status: 'paid' ✅ APPROVED
```

---

### Scenario 3: Failed UPI Payment
```
Customer creates order → ₹500
    ↓
Selects UPI, submits fake UTR
    ↓
Status: 'verification_requested' ⏳ PENDING
    ↓
Admin checks bank - NO PAYMENT FOUND
    ↓
Admin clicks "Reject Payment"
    ↓
Status: 'failed' ❌ REJECTED
    ↓
Customer must pay again
```

---

## 📱 What Customer Sees

### Payment History Screen

**Summary Cards:**
```
┌──────────┬──────────┬──────────┐
│ Approved │ Pending  │ Rejected │
│    5     │    2     │    1     │
└──────────┴──────────┴──────────┘
```

**Filter Tabs:**
```
[All] [Approved] [Pending] [Rejected]
```

**Payment Card Display:**
```
┌─────────────────────────────────┐
│ 📦 Order: abc12345              │
│ ₹500                            │
│                                 │
│ Date: Jan 15, 2025              │
│ Time: 2:30 PM                   │
│ Amount: ₹500                    │
│ Method: 📦 Order / 💵 Cash      │
│                                 │
│ Status: ✅ Approved             │
│ Transaction ID: 42153128123     │
└─────────────────────────────────┘
```

---

## 🧪 Testing Examples

### Test Approved Filter:
1. **UPI Payment:**
   - Create order → Pay via UPI → Submit UTR
   - Admin verifies payment
   - Should show in "Approved" tab ✅

2. **COD Payment:**
   - Create order → Select COD
   - Admin confirms cash received
   - Should show in "Approved" tab ✅

---

### Test Pending Filter:
1. **UPI Verification Pending:**
   - Create order → Pay via UPI → Submit UTR
   - Don't verify yet
   - Should show in "Pending" tab ⏳

2. **COD Awaiting Confirmation:**
   - Create order → Select COD
   - Don't confirm yet
   - Should show in "Pending" tab ⏳

---

### Test Rejected Filter:
1. **Failed UPI:**
   - Create order → Submit fake UTR
   - Admin rejects payment
   - Should show in "Rejected" tab ❌

---

## 🎨 Visual Indicators

### Status Badges:

**Approved:**
```tsx
<Badge variant="success">
  <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
</Badge>
```

**Pending:**
```tsx
<Badge variant="pending">
  <Clock className="w-3 h-3 mr-1" /> Pending
</Badge>
```

**Rejected:**
```tsx
<Badge variant="error">
  <XCircle className="w-3 h-3 mr-1" /> Rejected
</Badge>
```

---

## 💡 Key Takeaways

1. **"Verified"** = UPI payments (digital)
2. **"Paid"** = COD payments (cash)
3. **Both mean "Approved"** in different contexts
4. **Filter logic handles both** automatically
5. **Customer sees unified view** regardless of payment type

---

## 🔧 Behind the Scenes

### Data Enrichment:
```typescript
// Raw data from database
{
  id: 'xxx',
  order_id: 'yyy',
  status: 'verified',        // UPI status
  amount: 500
}

// After enrichment
{
  ...raw,
  order_type: 'ORDER',       // Detected as order (not session)
  display_status: 'paid',    // From order.payment_status
  display_amount: 500,       // From order.total_amount
  order_details: {           // Full order data
    payment_method: 'cod',
    payment_status: 'paid',
    total_amount: 500
  }
}
```

### Filter Logic:
```typescript
const isApproved = 
  display_status === 'paid' ||      // COD
  status === 'verified' ||          // UPI
  display_status === 'completed';   // Session

// Both COD "paid" and UPI "verified" count as "approved"
```

---

**Status:** Fully implemented ✅  
**Last Updated:** 2025-01-15  
**Files:** `payment-history-screen.tsx`
