# 🐛 UPI PAYMENT ERROR - TABLE MISSING

## ❌ ERROR YOU'RE SEEING

```
Error: Cannot coerce the result to a single JSON object
Code: PGRST116
Details: The result contains 0 rows
```

**What this means:** The `upi_payments` table doesn't exist in your database yet!

---

## ✅ SOLUTION - CREATE THE TABLE

### **Step 1: Run This SQL NOW** ⚠️ CRITICAL

Open Supabase Dashboard → SQL Editor → Run this entire script:

📄 **File:** [`CREATE_UPI_PAYMENTS_TABLE.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/CREATE_UPI_PAYMENTS_TABLE.sql)

Copy and paste the ENTIRE content into Supabase SQL Editor and click **RUN**.

This will create:
- ✅ `upi_payments` table
- ✅ Proper indexes for performance
- ✅ Row Level Security (RLS) policies
- ✅ Auto-update trigger

---

### **Step 2: Verify Table Created**

After running the SQL, verify:

```sql
-- Check if table exists
SELECT tablename 
FROM pg_tables 
WHERE tablename = 'upi_payments';

-- Should return: upi_payments ✅

-- Check columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'upi_payments'
ORDER BY ordinal_position;

-- Should show all columns including:
-- - id
-- - order_id
-- - qr_id
-- - amount
-- - upi_link
-- - transaction_id
-- - status
-- - expires_at
-- - verified_at
-- - etc.
```

---

### **Step 3: Test Payment Flow Again**

Now try the payment flow:

1. Place an order (dine-in or delivery)
2. Go to payment screen
3. QR code should generate
4. Submit test UTR
5. ✅ Should work now!

---

## 🔍 WHY THIS HAPPENED

The UPI payment system was implemented in code, but the database table wasn't created yet.

**Files that need the table:**
- `src/pages/customer/upi-payment-screen.tsx` - Creates payment record
- `src/lib/upi-payment.ts` - Updates payment with UTR
- `src/pages/admin/upi-verification-screen.tsx` - Reads payments

All these files query the `upi_payments` table which didn't exist!

---

## 📊 WHAT THE TABLE DOES

### **Purpose:**
Tracks each UPI QR payment separately from the order itself.

### **Data Flow:**

```
1. Customer places order
        ↓
2. Order created in `orders` table
        ↓
3. Payment screen calls createUPIPayment()
        ↓
4. Record created in `upi_payments`:
   - qr_id: unique QR identifier
   - upi_link: actual UPI link
   - amount: ₹XXX.XX
   - status: 'pending'
        ↓
5. Customer scans QR & pays
        ↓
6. Customer submits UTR
        ↓
7. UPDATE upi_payments SET:
   - transaction_id: "UTR number"
   - status: 'verification_requested'
        ↓
8. Admin verifies
        ↓
9. UPDATE upi_payments SET:
   - status: 'verified'
   - verified_at: NOW()
   - verified_by: admin_id
        ↓
10. Order marked as paid ✅
```

---

## 🎯 COMPLETE DATABASE SCHEMA

After running the SQL, your `upi_payments` table will have:

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `order_id` | uuid | Links to orders.id |
| `qr_id` | uuid | Unique QR code ID |
| `amount` | numeric | Payment amount |
| `upi_link` | text | The actual UPI link |
| `transaction_id` | text | UTR submitted by customer |
| `beneficiary_name` | text | Name shown in UPI app |
| `status` | text | pending/verified/failed/etc. |
| `expires_at` | timestamptz | QR expiry time (5 min) |
| `verified_at` | timestamptz | When admin verified |
| `verified_by` | uuid | Which admin verified |
| `notes` | text | Verification notes |
| `created_at` | timestamptz | Creation timestamp |
| `updated_at` | timestamptz | Last update timestamp |

---

## 🧪 TEST THE COMPLETE FLOW

### **Test Scenario:**

1. **Place Order** (₹10)
   ```
   Menu → Add items → Checkout → Dine-in → Pay
   ```

2. **Payment Screen Appears**
   ```
   Shows:
   - QR code with UPI link
   - Amount: ₹10
   - Timer: 5 minutes
   - Instructions
   ```

3. **Customer Pays**
   ```
   - Open PhonePe/GPay/Paytm
   - Scan QR (or use UPI ID: anshjpokar@oksbi)
   - Pay ₹10
   - Note the UTR number (e.g., 42153128123)
   ```

4. **Submit UTR**
   ```
   - Enter UTR in form
   - Click "Submit for Verification"
   - Status updates to 'verification_requested'
   ```

5. **Admin Verifies**
   ```
   - Login as admin
   - Go to UPI Verification screen
   - Find your payment
   - Click "Verify Payment"
   - Status → 'verified'
   ```

6. **Order Confirmed**
   ```
   - Order.payment_status → 'paid'
   - Chef receives order
   - Customer sees confirmation
   ```

---

## 🐛 ADDITIONAL FIXES NEEDED

### **Also Need: Database Functions**

After creating the table, you ALSO need to run:

📄 **File:** [`SUPABASE_SQL_FINAL.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/SUPABASE_SQL_FINAL.sql)

This creates the functions:
- `generate_upi_link()` - Generates UPI links
- `create_upi_payment()` - Creates payment records
- `verify_upi_payment_db()` - Admin verification

**Run BOTH SQL files in order:**

1. First: `CREATE_UPI_PAYMENTS_TABLE.sql` (creates table)
2. Then: `SUPABASE_SQL_FINAL.sql` (creates functions)

---

## ✅ VERIFICATION CHECKLIST

After running both SQL files:

```sql
-- 1. Check table exists
SELECT tablename FROM pg_tables WHERE tablename = 'upi_payments';
-- Should return 1 row ✅

-- 2. Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('generate_upi_link', 'create_upi_payment', 'verify_upi_payment_db');
-- Should return 3 rows ✅

-- 3. Test function
SELECT generate_upi_link(
  '00000000-0000-0000-0000-000000000001'::uuid,
  500,
  'anshjpokar@oksbi',
  'Navratna Restaurant'
);
-- Should return: upi://pay?pa=anshjpokar@oksbi&pn=Navratna_Restaurant&am=500&cu=INR&tn=ORDER_... ✅
```

---

## 🚨 COMMON MISTAKES

### **❌ Mistake 1: Running Only One File**
You need BOTH:
- ✅ CREATE_UPI_PAYMENTS_TABLE.sql (table)
- ✅ SUPABASE_SQL_FINAL.sql (functions)

### **❌ Mistake 2: Not Checking RLS**
Make sure RLS policies are created:
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'upi_payments';

-- Should show 5 policies ✅
```

### **❌ Mistake 3: Skipping Verification**
Always test after running SQL:
```sql
-- Try inserting test payment
INSERT INTO upi_payments (order_id, qr_id, amount, upi_link, expires_at)
VALUES (
  'some-order-id',
  gen_random_uuid(),
  100,
  'upi://pay?...',
  NOW() + INTERVAL '5 minutes'
);
-- Should succeed ✅
```

---

## 📞 NEXT STEPS

1. **RIGHT NOW:** Run `CREATE_UPI_PAYMENTS_TABLE.sql`
2. **THEN:** Run `SUPABASE_SQL_FINAL.sql`
3. **TEST:** Place order → Pay via UPI
4. **VERIFY:** Check database has payment record
5. **COMPLETE:** Admin verifies payment

---

**Once you run both SQL files, the UPI payment flow will work perfectly!** 🎉

**Files to run:**
1. [`CREATE_UPI_PAYMENTS_TABLE.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/CREATE_UPI_PAYMENTS_TABLE.sql) - Creates table
2. [`SUPABASE_SQL_FINAL.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/SUPABASE_SQL_FINAL.sql) - Creates functions

**Status:** ⏳ Waiting for SQL execution  
**Priority:** CRITICAL - Blocks UPI payments completely
