# ⚡ QUICK TESTING CHECKLIST

## 🎯 PRIORITY 1 - CRITICAL TESTS (Do These First!)

### **1. UPI Payment Test** ⭐⭐⭐
```
□ Create test order (₹10)
□ Generate QR code
□ Scan with real UPI app (PhonePe/GPay/Paytm)
□ Pay ₹1 to anshjpokar@oksbi
□ Submit UTR number
□ Admin verifies payment
□ Order marked as "paid"
□ Check bank statement - money received!
```

**Expected QR Content:**
```
upi://pay?pa=anshjpokar@oksbi&pn=Navratna_Restaurant&am=10&cu=INR&tn=ORDER_xxx
```

---

### **2. Leaflet Map Test** 🗺️
```
□ Place delivery order
□ Open tracking screen
□ Map loads without errors
□ Shows rider icon (🛵)
□ Shows destination icon (🏠)
□ No Google Maps errors in console
```

**Console should be CLEAN (no red errors)**

---

### **3. Complete Order Flow** 📦
```
□ Browse menu
□ Add items to cart
□ Checkout (dine-in)
□ Select table
□ Place order
□ Chef updates status
□ Customer sees update
□ Pay via UPI
```

---

## 🔥 PRIORITY 2 - CORE FEATURES

### **Customer Tests:**
```
□ Signup/Login
□ Browse menu (veg/non-veg icons)
□ Add to cart
□ Update cart quantity
□ Place dine-in order
□ Place delivery order
□ Add delivery address
□ Save favorite items
□ Book table
□ View notifications
□ Create support ticket
□ Track order (Leaflet map)
```

---

### **Waiter Tests:**
```
□ Login as waiter
□ View tables (color-coded)
□ Select table
□ Enter customer info
□ Take order
□ Send to kitchen
```

---

### **Chef Tests:**
```
□ Login as chef
□ View incoming orders
□ Update order status:
  - placed → preparing
  - preparing → cooking
  - cooking → prepared
  - prepared → out_for_delivery
```

---

### **Delivery Tests:**
```
□ Login as delivery
□ View assigned deliveries
□ Accept task
□ See customer address
□ Update location (allow GPS)
□ Mark as delivered
```

---

### **Admin Tests:**
```
□ Login as admin
□ View dashboard
□ Manage menu (add/edit/delete)
□ Manage tables
□ Verify UPI payments ⭐
□ Assign delivery partners
□ Manage users
□ Handle support tickets
```

---

## 🧪 QUICK VERIFICATION COMMANDS

### **Check Database Tables:**
```sql
-- Should return 14+ tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

### **Check UPI Functions:**
```sql
-- Should return 3 functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%upi%';
```

### **Test UPI Link Generation:**
```sql
SELECT generate_upi_link(
  '00000000-0000-0000-0000-000000000001'::uuid,
  500,
  'anshjpokar@oksbi',
  'Navratna Restaurant'
);

-- Should return:
-- upi://pay?pa=anshjpokar@oksbi&pn=Navratna_Restaurant&am=500&cu=INR&tn=ORDER_...
```

### **Check Recent Orders:**
```sql
SELECT id, order_number, status, total_amount, payment_status, created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;
```

### **Check UPI Payments:**
```sql
SELECT up.order_id, up.amount, up.status, up.transaction_id,
       o.payment_status, o.total_amount
FROM upi_payments up
JOIN orders o ON up.order_id = o.id
ORDER BY up.created_at DESC
LIMIT 5;
```

---

## 🐛 COMMON ISSUES & FIXES

### **Issue 1: QR Code Not Generating**
**Symptoms:** Error on payment screen

**Fix:**
1. Check if SQL functions exist (run query above)
2. If missing, run `SUPABASE_SQL_FINAL.sql`
3. Restart dev server

---

### **Issue 2: Map Not Showing**
**Symptoms:** Blank space, console errors

**Fix:**
```bash
npm install leaflet react-leaflet @types/leaflet
```

Check import in order-tracking-screen.tsx:
```typescript
import { LeafletOrderTracking } from './leaflet-order-tracking';
```

---

### **Issue 3: Payment Verification Fails**
**Symptoms:** Can't verify as admin

**Fix:**
1. Check your role in database:
```sql
SELECT email, role FROM profiles WHERE email = 'your@email.com';
```

2. Update to admin if needed:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

### **Issue 4: Real-time Updates Not Working**
**Symptoms:** Status doesn't update automatically

**Fix:**
1. Check Supabase Realtime is enabled
2. Verify RLS policies allow subscription
3. Clear browser cache and reload

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before going live:

```
□ All Priority 1 tests pass
□ All Priority 2 tests pass
□ No TypeScript errors
□ No runtime errors
□ Console is clean
□ UPI payment works with REAL money
□ Money reaches YOUR bank account
□ Leaflet maps work perfectly
□ All user roles functional
□ Real-time updates working
□ Database queries fast (<1s)
□ Mobile responsive
□ HTTPS enabled (production)
□ Environment variables set
□ Backup database
```

---

## 📊 TEST TRACKING

Use this simple tracker:

| Priority | Test | Status | Notes |
|----------|------|--------|-------|
| P1 | UPI Payment | ⏳/✅/❌ | |
| P1 | Leaflet Map | ⏳/✅/❌ | |
| P1 | Order Flow | ⏳/✅/❌ | |
| P2 | Customer Features | ⏳/✅/❌ | |
| P2 | Waiter Features | ⏳/✅/❌ | |
| P2 | Chef Features | ⏳/✅/❌ | |
| P2 | Delivery Features | ⏳/✅/❌ | |
| P2 | Admin Features | ⏳/✅/❌ | |

**Legend:**
- ⏳ Not started
- ✅ Pass
- ❌ Fail (see bug report)

---

## 🎯 SUCCESS METRICS

Testing is successful when:

✅ **Critical Tests:** 3/3 pass  
✅ **Core Features:** 80%+ pass  
✅ **No Critical Bugs:** Zero show-stoppers  
✅ **UPI Works:** Real payment successful  
✅ **Maps Work:** No Google Maps dependency  
✅ **Performance:** <3s page load  

---

## 📞 QUICK REFERENCE

**Full Testing Guide:** [`COMPLETE_TESTING_GUIDE.md`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/COMPLETE_TESTING_GUIDE.md)  
**Database Reference:** [`DATABASE_COMPLETE_REFERENCE.md`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/DATABASE_COMPLETE_REFERENCE.md)  
**Interfaces:** [`QUICK_REFERENCE_INTERFACES.md`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/QUICK_REFERENCE_INTERFACES.md)  
**Phase 4 Summary:** [`PHASE_4_COMPLETION_SUMMARY.md`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/PHASE_4_COMPLETION_SUMMARY.md)  

---

**Quick Checklist - Print and Use!**  
**Last Updated:** 2025-01-15  
**Total Tests:** 20+  
**Priority 1:** 3 critical tests  
**Priority 2:** 8 core features  
**Status:** Ready for Testing 🚀
