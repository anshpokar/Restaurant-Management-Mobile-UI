# 🔧 UPI TABLE ERROR - COLUMN MISMATCH FIX

## ❌ ERROR YOU GOT

```
ERROR: 42703: column "qr_id" does not exist
```

**What this means:** Your `upi_payments` table already exists but has different column names than expected!

---

## ✅ THE FIX

### **Run This SQL File Instead:**

📄 [`FIX_UPI_PAYMENTS_TABLE.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/FIX_UPI_PAYMENTS_TABLE.sql)

This script will:
- ✅ Detect your existing table structure
- ✅ Add missing columns (`vpa`, `beneficiary_name`)
- ✅ Rename columns if needed (`expires_at` → `qr_expires_at`)
- ✅ Create indexes
- ✅ Setup RLS policies
- ✅ Add auto-update trigger

---

## 🚀 HOW TO RUN

1. Open Supabase Dashboard → SQL Editor
2. Open file: `FIX_UPI_PAYMENTS_TABLE.sql`
3. Copy ENTIRE content
4. Paste in SQL Editor
5. Click **RUN**
6. Wait for success message ✅

---

## 📊 WHAT YOUR TABLE PROBABLY HAS

Based on the error, your table likely has:

| Column | Type | Status |
|--------|------|--------|
| `id` | uuid | ✅ Exists |
| `order_id` | uuid | ✅ Exists |
| `vpa` | text | ✅ Exists (UPI ID) |
| `amount` | numeric | ✅ Exists |
| `upi_link` | text | ✅ Exists |
| `transaction_id` | text | ✅ Exists |
| `status` | text | ✅ Exists |
| `qr_expires_at` | timestamptz | ✅ Exists (or `expires_at`) |
| `verified_at` | timestamptz | ✅ Exists |
| `verified_by` | uuid | ✅ Exists |
| `verification_notes` | text | ✅ Exists (or `notes`) |

The fix script handles ALL these variations!

---

## 🔍 VERIFICATION

After running the fix, verify:

```sql
-- Check all columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'upi_payments'
ORDER BY ordinal_position;

-- Should show 13+ columns including:
-- vpa, qr_expires_at, verification_notes, etc.
```

---

## 🎯 AFTER RUNNING FIX

Your UPI payment flow will work:

1. ✅ Place order
2. ✅ QR code generates
3. ✅ Customer pays
4. ✅ Submits UTR  
5. ✅ Database UPDATE works!
6. ✅ Admin verifies

---

**Run `FIX_UPI_PAYMENTS_TABLE.sql` NOW!** 🚀

It's smart - detects your existing schema and fixes it automatically!
