# 📚 Supabase Database - Complete Documentation Index

## 🎯 Quick Navigation

### For Implementation
1. **[QUICK_START.md](./QUICK_START.md)** ⭐ START HERE
   - 5-minute setup guide
   - What you have vs what you need
   - Common tasks and quick fixes

2. **[supabase-supplement.sql](./supabase-supplement.sql)** ⭐ RUN THIS
   - Adds 4 missing tables
   - Improved security policies
   - Helper functions and triggers

### For Understanding
3. **[DATABASE_SCHEMA_DIAGRAM.md](./DATABASE_SCHEMA_DIAGRAM.md)**
   - Visual entity relationship diagram
   - Data flow examples
   - Access control matrix
   - Key queries by feature

4. **[SUPABASE_IMPLEMENTATION_GUIDE.md](./SUPABASE_IMPLEMENTATION_GUIDE.md)**
   - Detailed implementation steps
   - Complete table reference
   - Security breakdown
   - Troubleshooting guide

### Reference
5. **[supabase-schema.sql](./supabase-schema.sql)**
   - Comprehensive schema (for reference)
   - Complete documentation
   - Seed data examples

---

## 🗄️ Database Overview

### Total Tables: **11**

#### Core Business Tables (7) ✅ Already Implemented
1. **profiles** - User accounts with roles
2. **restaurant_tables** - Physical table inventory
3. **table_bookings** - Customer reservations
4. **menu_items** - Restaurant menu
5. **offers** - Promotional campaigns
6. **orders** - Order management
7. **order_items** - Order line items

#### Support Tables (4) ⚠️ Add with supplement.sql
8. **addresses** - Saved delivery addresses
9. **favorites** - User wishlists
10. **notifications** - Push notifications
11. **support_tickets** - Customer support

---

## 👥 User Roles & Permissions

| Role | Capabilities |
|------|-------------|
| **Admin** | Full access to all tables, can manage user roles |
| **Chef** | View all orders, update order status (preparing → cooking → prepared) |
| **Waiter** | View/update tables, manage bookings, take orders |
| **Delivery** | View assigned deliveries, update delivery status |
| **Customer** | Browse menu, place orders, book tables, view own data |

---

## 🔐 Security Features

- ✅ **Row Level Security (RLS)** enabled on all tables
- ✅ **Role-based access control** via profiles.role
- ✅ **User isolation** - customers see only their data
- ✅ **Staff collaboration** - staff can view all relevant data
- ✅ **Admin oversight** - admins have full visibility and control

---

## ⚡ Performance Optimizations

- ✅ **30+ indexes** for fast queries
- ✅ **Composite indexes** for common query patterns
- ✅ **Optimized for Realtime** subscriptions
- ✅ **Foreign key constraints** for data integrity
- ✅ **Check constraints** for business rules

---

## 🔄 Automation

### Triggers
- Auto-update `updated_at` timestamps
- Auto-create profile on user signup

### Functions
- `get_order_with_items()` - Complete order data
- `get_daily_revenue()` - Daily revenue calculation
- `create_notification()` - Create notifications

---

## 📱 App Features Mapped to Database

### Customer App
| Feature | Tables Used |
|---------|-------------|
| Home Screen | menu_items, offers |
| Menu Browsing | menu_items |
| Cart & Checkout | orders, order_items |
| Order Tracking | orders, order_items (realtime) |
| Table Booking | table_bookings, restaurant_tables |
| My Bookings | table_bookings |
| Profile | profiles, addresses |
| Favorites | favorites |
| Notifications | notifications |
| Support | support_tickets |

### Chef Dashboard
| Feature | Tables Used |
|---------|-------------|
| Active Orders | orders, order_items (realtime) |
| Update Status | orders.status |
| Order History | orders, order_items |

### Waiter App
| Feature | Tables Used |
|---------|-------------|
| Table Overview | restaurant_tables (realtime) |
| Take Order | orders, order_items |
| Manage Bookings | table_bookings |
| Update Table Status | restaurant_tables |

### Delivery App
| Feature | Tables Used |
|---------|-------------|
| Assigned Deliveries | orders (realtime) |
| Update Status | orders.status |
| Customer Info | profiles, orders |

### Admin Dashboard
| Feature | Tables Used |
|---------|-------------|
| KPIs & Analytics | orders, table_bookings, restaurant_tables |
| Menu Management | menu_items |
| Order Management | orders, order_items |
| Table Management | restaurant_tables |
| User Management | profiles |
| Offers Management | offers |
| Reports | All tables |

---

## 🚀 Getting Started Checklist

### Phase 1: Setup (Do This First)
- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy & run `supabase-supplement.sql`
- [ ] Verify 11 tables exist
- [ ] Enable Realtime for key tables

### Phase 2: Test Basic Operations
- [ ] Create test user via signup
- [ ] Verify profile created automatically
- [ ] Browse menu items (should see 6 items)
- [ ] View restaurant tables (should see 6 tables)
- [ ] Check active offers (should see 3 offers)

### Phase 3: Test by Role
- [ ] **Customer**: Place an order
- [ ] **Customer**: Book a table
- [ ] **Chef**: View and update order status
- [ ] **Waiter**: Update table status
- [ ] **Admin**: View dashboard, manage menu
- [ ] **Delivery**: View assigned delivery

### Phase 4: Advanced Features
- [ ] Add saved address (profile screen)
- [ ] Add item to favorites
- [ ] Create support ticket
- [ ] Check notifications system
- [ ] Test realtime updates (2 tabs open)

---

## 📊 Current State Summary

### ✅ What's Working in Your Supabase

You have successfully implemented:

1. **User Authentication & Profiles**
   - Email/password login
   - Google OAuth
   - Automatic profile creation
   - Role-based access (5 roles)

2. **Menu System**
   - Categories (Starters, Main Course, Biryani, Breads, Desserts, Beverages)
   - Veg/Non-veg indicators
   - Ratings system
   - Availability toggling
   - Special items marking

3. **Order Management**
   - Complete order workflow (7 statuses)
   - Order items tracking
   - Delivery assignment
   - Payment status
   - Dine-in (table-linked) and delivery orders

4. **Table Booking**
   - Table inventory management
   - Reservation system
   - Status tracking (pending → confirmed → completed)
   - Business hours validation (11 AM - 10 PM)

5. **Promotions**
   - Offer creation
   - Discount codes
   - Active/inactive toggling

6. **Security**
   - RLS on all tables
   - Role-based policies
   - User data isolation

### ⚠️ What Needs the Supplement Script

Add these features by running `supabase-supplement.sql`:

1. **Saved Addresses** - For faster checkout
2. **Favorites/Wishlist** - Save favorite dishes
3. **Notifications** - Push notification system
4. **Support Tickets** - Customer support
5. **Improved Policies** - Better security for orders
6. **Helper Functions** - Revenue calculation, etc.

---

## 🎓 Learning Resources

### Supabase Documentation
- [Supabase Docs](https://supabase.com/docs)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Database Functions](https://supabase.com/docs/guides/database/functions)

### Your Codebase
- Check `src/lib/supabase.ts` for client setup
- Check hooks (`use-auth.ts`, `use-cart.ts`) for usage examples
- Check pages for query implementations

---

## 🆘 Quick Help

### "How do I add a new menu item?"
```sql
INSERT INTO menu_items (name, price, category, veg, rating, image)
VALUES ('New Dish', 299, 'Main Course', true, 4.5, '🍛');
```

### "How do I create an offer?"
```sql
INSERT INTO offers (title, description, discount_code, is_active)
VALUES ('Summer Sale', 'Get 20% off', 'SUMMER20', true);
```

### "How do I make someone admin?"
```sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'user@example.com';
```

### "How do I check today's revenue?"
```sql
SELECT get_daily_revenue(CURRENT_DATE);
```

---

## 📞 Support & Debugging

### Common Issues

**Issue: "Policy violation"**
- Solution: Check if user has correct role in profiles table

**Issue: "Table doesn't exist"**
- Solution: Run supabase-supplement.sql

**Issue: "Can't see data"**
- Solution: Check RLS policies, verify user role

**Issue: "Realtime not working"**
- Solution: Enable replication in Dashboard > Database > Replication

### Debug Queries

```sql
-- Check current user's role
SELECT role FROM profiles WHERE id = auth.uid();

-- Check all policies for a table
SELECT * FROM pg_policies WHERE tablename = 'orders';

-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- View recent errors (if any)
-- Check Supabase Dashboard > Logs
```

---

## 🎉 Success Metrics

Your database is fully set up when:

✅ 11 tables exist  
✅ All tables have RLS enabled  
✅ 30+ indexes created  
✅ Realtime enabled for key tables  
✅ Can perform all CRUD operations by role  
✅ No policy violation errors  
✅ Helper functions work correctly  

---

## 📁 File Summary

| File | Lines | Purpose | Priority |
|------|-------|---------|----------|
| `supabase-supplement.sql` | 389 | **Run this first** | ⭐⭐⭐ |
| `QUICK_START.md` | 250 | Quick reference | ⭐⭐⭐ |
| `DATABASE_SCHEMA_DIAGRAM.md` | 460 | Visual diagrams | ⭐⭐ |
| `SUPABASE_IMPLEMENTATION_GUIDE.md` | 361 | Detailed guide | ⭐⭐ |
| `supabase-schema.sql` | 749 | Complete reference | ⭐ |
| `README_DATABASE.md` | This file | Index/overview | ⭐⭐⭐ |

---

## 🚀 Next Steps

1. **Read** [QUICK_START.md](./QUICK_START.md)
2. **Run** `supabase-supplement.sql` in Supabase SQL Editor
3. **Verify** all 11 tables exist
4. **Enable** Realtime for key tables
5. **Test** with your app
6. **Enjoy** your fully functional database! 🎊

---

**Last Updated:** March 11, 2026  
**Database Version:** 1.0  
**Total Tables:** 11  
**Total Policies:** 40+  
**Total Indexes:** 30+  

**Made with ❤️ for your Restaurant Management App**
