# 🗄️ Supabase Database Implementation Guide

## ✅ What You Already Have

Based on your SQL Editor content, you've successfully implemented:

### Core Tables:
1. ✅ **profiles** - User management with roles (admin, customer, delivery, waiter, chef)
2. ✅ **restaurant_tables** - Table management with status tracking
3. ✅ **table_bookings** - Table reservations
4. ✅ **menu_items** - Menu with categories, pricing, availability, specials
5. ✅ **offers** - Promotional offers
6. ✅ **orders** - Order management with status workflow
7. ✅ **order_items** - Order line items

### Features Implemented:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Role-based access control
- ✅ Automatic profile creation trigger (`handle_new_user`)
- ✅ Username uniqueness constraint
- ✅ Admin policies for user management
- ✅ Staff can update table status
- ✅ Menu management by admins
- ✅ Order workflow policies

---

## 📋 What's Missing (Added by supabase-supplement.sql)

### Additional Tables:
1. ⚠️ **addresses** - Saved delivery addresses (Profile feature)
2. ⚠️ **favorites** - Menu item wishlist (Favorites feature)
3. ⚠️ **notifications** - Push notifications system
4. ⚠️ **support_tickets** - Help & Support feature

### Improved Policies:
- Better order/ order_items security policies
- Automated `updated_at` triggers
- Helper functions for common operations

---

## 🚀 Implementation Steps

### Step 1: Run the Supplementary Script

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the entire content of `supabase-supplement.sql`
3. Paste into a **New Query**
4. Click **"Run"** (or press Ctrl+Enter)

This will add:
- 4 new tables (addresses, favorites, notifications, support_tickets)
- Proper RLS policies
- Indexes for performance
- Triggers for automation
- Helper functions

### Step 2: Enable Realtime (Optional but Recommended)

Go to **Database** → **Replication**:

Enable realtime for these tables:
- ✅ `orders` - For live order tracking
- ✅ `table_bookings` - For booking updates
- ✅ `restaurant_tables` - For table status changes
- ✅ `notifications` - For instant notifications
- ✅ `orders` - For kitchen display

**How to enable:**
1. Click on each table name
2. Toggle **"Enable Realtime"**
3. Save

### Step 3: Verify Installation

Run these verification queries in SQL Editor:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected result: 11 tables
-- addresses, favorites, menu_items, notifications, 
-- order_items, orders, profiles, restaurant_tables, 
-- support_tickets, table_bookings, offers

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- All tables should show rowsecurity = true

-- Check policies count
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

---

## 🔧 Testing Your Database

### Test 1: Create a Test User

```sql
-- This simulates what happens when someone signs up via Google/Auth
-- The trigger handle_new_user should automatically create a profile

-- Check if the trigger works by viewing auth.users and profiles
SELECT 
  au.id,
  au.email,
  p.full_name,
  p.username,
  p.role
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LIMIT 5;
```

### Test 2: View Menu Items

```sql
-- Should show 6 items from your insert
SELECT * FROM menu_items;
```

### Test 3: View Restaurant Tables

```sql
-- Should show 6 tables
SELECT * FROM restaurant_tables ORDER BY table_number;
```

### Test 4: Test Helper Functions

```sql
-- Test revenue function (will show 0 until you have paid orders)
SELECT get_daily_revenue(CURRENT_DATE) as today_revenue;

-- Test notification creation
SELECT create_notification(
  (SELECT id FROM profiles LIMIT 1), -- First user
  'Test Notification',
  'This is a test message',
  'system'
);

-- Check if notification was created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1;
```

---

## 📊 Complete Table Schema Reference

| Table | Purpose | Key Fields | RLS Enabled |
|-------|---------|------------|-------------|
| **profiles** | User accounts | id, email, full_name, username, phone_number, role | ✅ |
| **restaurant_tables** | Physical tables | table_number, capacity, status | ✅ |
| **table_bookings** | Reservations | user_id, table_id, booking_date, booking_time, guests_count, status | ✅ |
| **menu_items** | Menu | name, price, category, veg, rating, image, is_available, is_special | ✅ |
| **offers** | Promotions | title, description, discount_code, is_active | ✅ |
| **orders** | Orders | user_id, table_id, status, total_amount, delivery_person_id, is_paid | ✅ |
| **order_items** | Order details | order_id, menu_item_id, name, quantity, price | ✅ |
| **addresses** ⚠️ | Saved addresses | user_id, address_label, address_line1, city, state, pincode, phone | ✅ |
| **favorites** ⚠️ | Wishlist | user_id, menu_item_id | ✅ |
| **notifications** ⚠️ | Push notifications | user_id, title, message, type, is_read | ✅ |
| **support_tickets** ⚠️ | Support | user_id, subject, description, status, priority, admin_response | ✅ |

⚠️ = Added by supplementary script

---

## 🔐 Security Summary

### Who Can Do What?

#### **profiles**
- **View**: Everyone can see all profiles (needed for staff coordination)
- **Insert**: Users create their own profile during signup
- **Update**: Users update their own profile; Admins can update anyone's role

#### **restaurant_tables**
- **View**: Everyone
- **Update**: Only waiters and admins (mark as occupied/available)

#### **table_bookings**
- **View/Insert**: Users manage their own bookings
- **Update**: Users can cancel pending bookings; Staff can confirm/update

#### **menu_items**
- **View**: Everyone (public menu)
- **CRUD**: Only admins

#### **offers**
- **View**: Everyone (active offers only)
- **CRUD**: Only admins

#### **orders**
- **View**: Own orders + all staff (admin, chef, waiter, delivery)
- **Insert**: Authenticated users (for their own orders)
- **Update**: 
  - Customers: Can cancel placed orders
  - Chef: Update status (preparing → cooking → prepared)
  - Waiter: Update status
  - Delivery: Update when delivered
  - Admin: Full control

#### **order_items**
- **View**: Anyone who can view the order
- **Insert**: With own orders only

#### **addresses** (NEW)
- **All operations**: Only the owner

#### **favorites** (NEW)
- **All operations**: Only the owner

#### **notifications** (NEW)
- **View/Update**: Only the recipient (mark as read)
- **Insert**: Admins/system

#### **support_tickets** (NEW)
- **View/Update**: Own tickets
- **Admin**: Full access to all tickets

---

## 🎯 Feature-to-Table Mapping

### Customer Features:
| Feature | Tables Used |
|---------|-------------|
| Browse Menu | menu_items |
| Place Order | orders, order_items |
| Track Order | orders, order_items (realtime) |
| Book Table | table_bookings, restaurant_tables |
| View Bookings | table_bookings |
| Saved Addresses | addresses |
| Favorites | favorites |
| Notifications | notifications |
| Support | support_tickets |
| Profile | profiles |

### Staff Features:
| Role | Tables Used |
|------|-------------|
| **Chef** | orders, order_items (view & update status) |
| **Waiter** | orders, order_items, restaurant_tables, table_bookings |
| **Delivery** | orders (assigned deliveries) |
| **Admin** | ALL tables (full management) |

---

## 🐛 Troubleshooting

### Issue: "Policy violation" when creating order

**Solution**: Make sure the user is authenticated and the policy exists:
```sql
-- Check policies
SELECT * FROM pg_policies 
WHERE tablename = 'orders';

-- If missing, re-run the supplementary script
```

### Issue: Can't see other users' profiles (for delivery assignment)

**Solution**: The view policy should allow this:
```sql
-- This policy already allows viewing all profiles
-- Check it exists:
SELECT * FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'Users can view other profiles';
```

### Issue: Realtime not working

**Solution**: 
1. Check replication is enabled in Dashboard
2. Verify in SQL:
```sql
SELECT schemaname, tablename, rowlevelsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('orders', 'table_bookings', 'restaurant_tables');
```

### Issue: Trigger not creating profile on signup

**Solution**: Check the trigger exists and is active:
```sql
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- If missing, recreate:
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 📈 Performance Tips

Your database has these indexes for speed:

### Critical Indexes:
- `idx_orders_user_id` - Fast lookup of user's orders
- `idx_orders_status` - Filter by status (kitchen display)
- `idx_orders_created_at` - Recent orders sorting
- `idx_menu_items_category` - Category filtering
- `idx_table_bookings_date` - Booking lookups
- `idx_notifications_user_id` - User notifications
- `idx_favorites_user_id` - User favorites

### Composite Indexes:
- `idx_orders_status_created` - Status + date filtering
- `idx_addresses_default` - Find default address quickly
- `idx_notifications_read` - Unread notifications count

---

## 🎉 Next Steps

After running the supplementary script:

1. ✅ **Test in your app** - Try creating an order, booking a table
2. ✅ **Check console logs** - Ensure no RLS policy errors
3. ✅ **Test different roles** - Login as admin, chef, waiter, customer
4. ✅ **Verify realtime** - Open two tabs, watch updates sync
5. ✅ **Test notifications** - Place an order, check if notifications are created

---

## 📞 Support

If you encounter issues:

1. Check **Supabase Logs** (Dashboard > Logs)
2. Review **Database Errors** in browser console
3. Verify **RLS policies** match the expected behavior
4. Test with **anon key** vs **service role key** if needed

---

**Last Updated**: March 11, 2026  
**Schema Version**: 1.0  
**Tables**: 11 total (7 core + 4 supplementary)
