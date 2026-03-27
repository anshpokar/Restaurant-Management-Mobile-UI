# 🔧 FIX: "Permission Denied for Table users" Error

## ❌ ERROR MESSAGE:
```
Failed to place order: permission denied for table users
```

## 🎯 ROOT CAUSE:
Supabase Row Level Security (RLS) policies are too restrictive. The database tables need proper permissions for authenticated users to create orders.

---

## ✅ SOLUTION:

### **Step 1: Apply RLS Fix in Supabase**

1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Run the file: `fix-rls-policies.sql`

This will:
- ✅ Enable RLS on all necessary tables
- ✅ Add policies for customers to place orders
- ✅ Add policies for waiters to create orders
- ✅ Add policies for chefs to view orders
- ✅ Add policies for admins full access

---

## 📋 WHAT THE FIX DOES:

### **Profiles Table:**
- ✅ Allow authenticated users to read all profiles
- ✅ Allow users to manage their own profile

### **Orders Table:**
- ✅ Customers can view/create/update their own orders
- ✅ Waiters can view all orders and create orders for customers
- ✅ Chefs can view all orders and update status
- ✅ Admins have full access

### **Restaurant Tables:**
- ✅ Everyone can view tables
- ✅ Waiters & Admins can update table status

### **Delivery Addresses:**
- ✅ Users can manage their own addresses

### **Menu Items:**
- ✅ Everyone can view menu
- ✅ Only admins can modify items

### **Customer OTPs:**
- ✅ Allow OTP creation and verification

---

## 🚀 HOW TO TEST:

### **After applying the fix:**

1. **Login as Customer:**
   ```
   - Browse menu
   - Add items to cart
   - Place delivery order
   - Should work without permission error!
   ```

2. **Login as Waiter:**
   ```
   - Select table
   - Enter customer info
   - Take order
   - Submit to kitchen
   - Should work!
   ```

3. **Login as Chef:**
   ```
   - View orders in dashboard
   - Update order status
   - Should work!
   ```

---

## 🔍 TROUBLESHOOTING:

### **If still getting permission errors:**

1. **Check user role:**
   ```sql
   SELECT id, email, role FROM profiles WHERE id = auth.uid();
   ```

2. **Verify RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public';
   ```

3. **Check existing policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'orders';
   ```

4. **Re-run the migration:**
   - Delete all existing policies first
   - Then run `fix-rls-policies.sql` again

---

## ⚠️ IMPORTANT NOTES:

### **Security Considerations:**
- ✅ RLS is enabled on all tables
- ✅ Users can only access their own data (customers)
- ✅ Staff can access necessary data for their role
- ✅ Admins have full access

### **What Changed:**
Before: No RLS policies or very restrictive policies  
After: Role-based access control with proper permissions

---

## 📝 FILE LOCATIONS:

**SQL Migration:** `fix-rls-policies.sql`  
**Applied In:** Supabase Dashboard → SQL Editor  
**Tables Affected:** profiles, orders, restaurant_tables, delivery_addresses, menu_items, customer_otps

---

## ✅ VERIFICATION CHECKLIST:

After running the migration:

- [ ] RLS enabled on `profiles`
- [ ] RLS enabled on `orders`
- [ ] RLS enabled on `restaurant_tables`
- [ ] RLS enabled on `delivery_addresses`
- [ ] RLS enabled on `menu_items`
- [ ] RLS enabled on `customer_otps`
- [ ] Customer can place order
- [ ] Waiter can create order
- [ ] Chef can view orders
- [ ] Admin has full access

---

## 🎉 EXPECTED RESULT:

✅ **No more "permission denied" errors!**  
✅ **Orders can be placed successfully!**  
✅ **Role-based access working correctly!**

---

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** Ready to apply in Supabase
