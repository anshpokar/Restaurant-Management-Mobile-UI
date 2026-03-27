# 🚀 Quick Start: Supabase Setup

## ⚡ Fast Track (5 Minutes)

### 1️⃣ Run Supplementary Script
```bash
# Open Supabase Dashboard > SQL Editor
# Copy & Paste: supabase-supplement.sql
# Click RUN
```

### 2️⃣ Enable Realtime
```bash
# Dashboard > Database > Replication
# Enable for: orders, table_bookings, restaurant_tables, notifications
```

### 3️⃣ Verify
```sql
-- Run this query to check everything is set up:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show 11 tables
```

---

## 📊 What You Have vs What You Need

### ✅ Already Implemented (7 tables)
```
✓ profiles              - User accounts
✓ restaurant_tables     - Table management  
✓ table_bookings        - Reservations
✓ menu_items            - Menu with specials/availability
✓ offers                - Promotions
✓ orders                - Order workflow
✓ order_items           - Order details
```

### ⚠️ Missing (4 tables) - Add with supplement.sql
```
! addresses             - Saved delivery addresses
! favorites             - Wishlist feature
! notifications         - Push notifications
! support_tickets       - Help & Support
```

---

## 🔧 Common Tasks

### Add Sample Menu Items
```sql
INSERT INTO menu_items (name, price, category, veg, rating, image, is_available, is_special)
VALUES 
  ('Shahi Paneer', 329, 'Main Course', true, 4.7, '🍛', true, true),
  ('Mutton Rogan Josh', 549, 'Main Course', false, 4.8, '🍖', true, false);
```

### Add More Tables
```sql
INSERT INTO restaurant_tables (table_number, capacity, status)
VALUES 
  (11, 4, 'available'),
  (12, 6, 'available'),
  (13, 2, 'occupied');
```

### Create Test Offer
```sql
INSERT INTO offers (title, description, discount_code, discount_percentage, is_active, valid_until)
VALUES 
  ('Festival Special', 'Get 25% off during festivals', 'FESTIVE25', 25.00, true, NOW() + INTERVAL '30 days');
```

### View Today's Orders
```sql
SELECT 
  o.id,
  o.status,
  o.total_amount,
  p.full_name as customer,
  COUNT(oi.id) as items_count
FROM orders o
LEFT JOIN profiles p ON p.id = o.user_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE DATE(o.created_at) = CURRENT_DATE
GROUP BY o.id, p.full_name
ORDER BY o.created_at DESC;
```

### Check Active Bookings for Today
```sql
SELECT 
  tb.*,
  rt.table_number,
  p.full_name,
  p.phone_number
FROM table_bookings tb
JOIN restaurant_tables rt ON rt.id = tb.table_id
JOIN profiles p ON p.id = tb.user_id
WHERE tb.booking_date = CURRENT_DATE
  AND tb.status IN ('pending', 'confirmed')
ORDER BY tb.booking_time;
```

---

## 🎯 Role-Based Testing

### Login as Different Roles

Use these test credentials (after creating users):

```sql
-- Create test admin user (run in auth.users via SQL or use Signup)
-- Then manually update role:
UPDATE profiles SET role = 'admin' WHERE email = 'test@example.com';

-- Create test chef
UPDATE profiles SET role = 'chef' WHERE email = 'chef@test.com';

-- Create test waiter
UPDATE profiles SET role = 'waiter' WHERE email = 'waiter@test.com';

-- Create test delivery
UPDATE profiles SET role = 'delivery' WHERE email = 'delivery@test.com';
```

---

## 🐛 Quick Fixes

### Fix: Can't insert order
```sql
-- Check if policy exists
SELECT * FROM pg_policies WHERE tablename = 'orders';

-- If missing policies, re-run supabase-supplement.sql
```

### Fix: Profile not created on signup
```sql
-- Recreate the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Fix: Can't update table status (Waiter)
```sql
-- Check waiter can update tables
SELECT EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = auth.uid() 
  AND role = 'waiter'
);

-- Should return true. If not, check RLS policies.
```

---

## 📈 Monitoring Queries

### Daily Revenue
```sql
SELECT get_daily_revenue(CURRENT_DATE) as today_revenue;
```

### Orders by Status
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(total_amount) as total
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
GROUP BY status
ORDER BY count DESC;
```

### Table Occupancy
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM restaurant_tables
GROUP BY status;
```

### Popular Menu Items
```sql
SELECT 
  mi.name,
  COUNT(oi.id) as times_ordered,
  SUM(oi.quantity) as total_quantity
FROM menu_items mi
JOIN order_items oi ON oi.menu_item_id = mi.id
GROUP BY mi.id, mi.name
ORDER BY total_quantity DESC
LIMIT 10;
```

---

## 🔐 Security Checklist

- [x] RLS enabled on all tables
- [x] Users can only see their own data (unless staff)
- [x] Admins have full access
- [x] Staff roles have appropriate permissions
- [x] Public can view menu/offers/tables
- [ ] Test with different user roles
- [ ] Verify service role key usage in backend functions

---

## 📁 File Reference

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | Complete schema (comprehensive version) |
| `supabase-supplement.sql` | **RUN THIS** - Adds missing 4 tables |
| `SUPABASE_IMPLEMENTATION_GUIDE.md` | Detailed documentation |
| `QUICK_START.md` | This file - Quick reference |

---

## 🎉 Success Indicators

You're all set when:

✅ 11 tables exist in database  
✅ All tables have RLS enabled  
✅ Realtime enabled for key tables  
✅ Can place orders as customer  
✅ Can update order status as chef  
✅ Can manage tables as waiter  
✅ Can view all data as admin  

---

**Need Help?** Check `SUPABASE_IMPLEMENTATION_GUIDE.md` for detailed troubleshooting!
