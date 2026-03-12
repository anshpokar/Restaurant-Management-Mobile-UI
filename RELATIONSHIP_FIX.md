# 🔧 FIX: Supabase Relationship Ambiguity Error

## ❌ ERROR MESSAGE:
```
Error fetching orders: {
  code: 'PGRST201',
  message: "Could not embed because more than one relationship was found for 'orders' and 'restaurant_tables'"
}
```

## 🎯 ROOT CAUSE:
The `orders` table has **multiple foreign keys** pointing to `restaurant_tables`:
1. `table_id` - links to restaurant table (dine-in orders)
2. Potentially other relationships

When you query `restaurant_tables (...)` without specifying which relationship, Supabase doesn't know which foreign key to use.

---

## ✅ SOLUTION APPLIED:

### **Use Explicit Relationship Syntax:**

Change from:
```typescript
restaurant_tables (
  table_number
)
```

To:
```typescript
restaurant_tables!inner (
  table_number
)
```

The `!inner` syntax tells Supabase to use an INNER JOIN, which resolves the ambiguity.

---

## 📝 FILES FIXED:

### **1. chef-dashboard.tsx**
**Line 71:** Fixed orders query
```diff
- restaurant_tables (
+ restaurant_tables!inner (
    table_number
  ),
```

### **2. bookings-screen.tsx**
**Line 56:** Fixed bookings query
```diff
- restaurant_tables (*)
+ restaurant_tables!inner (*)
```

---

## 🔍 ALTERNATIVE SOLUTIONS:

If `!inner` doesn't work, you can also specify the foreign key explicitly:

### **Option 1: Using Foreign Key Name**
```typescript
// Specify which FK column to use
restaurant_tables!orders_table_id_fkey (
  table_number
)
```

### **Option 2: Using Hint**
```typescript
// Use hint to specify relationship
restaurant_tables(
  table_number
).on('orders.table_id.eq.restaurant_tables.id')
```

### **Option 3: Rename in Query**
```typescript
// Alias the relationship
tables:restaurant_tables!inner (
  table_number
)
```

---

## 🚀 HOW TO VERIFY THE FIX:

### **Step 1: Check Console**
After applying the fix, open browser console and look for:
- ✅ No "PGRST201" errors
- ✅ Orders/bookings load successfully

### **Step 2: Test Functionality**

**Chef Dashboard:**
```
1. Login as chef
2. Navigate to /chef/dashboard
3. Should see dine-in orders with table numbers
4. No errors in console
```

**Bookings Screen:**
```
1. Login as customer
2. Navigate to /customer/bookings
3. Should see your table bookings
4. No errors in console
```

---

## 📊 UNDERSTANDING THE ERROR:

### **Why This Happens:**

In your database schema:
```sql
-- Orders table has table_id foreign key
ALTER TABLE orders 
ADD COLUMN table_id UUID REFERENCES restaurant_tables(id);

-- There might be another relationship (check your schema)
-- For example: delivered_to_table_id, etc.
```

When PostgREST sees `restaurant_tables (...)`, it finds multiple possible joins and throws an error.

### **The `!inner` Syntax:**

```typescript
// Tells PostgREST to use INNER JOIN
restaurant_tables!inner (...)

// This is equivalent to SQL:
SELECT * FROM orders
INNER JOIN restaurant_tables ON orders.table_id = restaurant_tables.id
```

---

## 🔧 OTHER PLACES TO CHECK:

Search your codebase for similar patterns:

```bash
# Look for potential issues
grep -r "restaurant_tables (" src/
```

Common places that might need fixing:
- ✅ `chef-dashboard.tsx` - FIXED
- ✅ `bookings-screen.tsx` - FIXED
- ⚠️ Any other file querying `restaurant_tables`

---

## ✅ VERIFICATION CHECKLIST:

After applying fixes:

- [ ] Chef dashboard loads orders
- [ ] No PGRST201 errors in console
- [ ] Table numbers display correctly
- [ ] Bookings screen works
- [ ] All joins resolve properly

---

## 🐛 IF ERROR PERSISTS:

### **Step 1: Check Database Schema**
```sql
-- Find all foreign keys from orders to restaurant_tables
SELECT 
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    confrelid::regclass AS referenced_table,
    pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid = 'orders'::regclass
  AND confrelid = 'restaurant_tables'::regclass;
```

### **Step 2: List All Relationships**
```sql
-- See all relationships involving orders
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'orders' 
AND constraint_type = 'FOREIGN KEY';
```

### **Step 3: Try Different Join Hints**
```typescript
// If !inner doesn't work, try:
restaurant_tables!left (...)
restaurant_tables!right (...)
restaurant_tables!full (...)
```

---

## 📚 REFERENCES:

- [PostgREST Joins Documentation](https://postgrest.org/en/stable/references/api/tables_views.html#horizontal-resource-embedding)
- [Supabase Query Guide](https://supabase.com/docs/guides/api/rest/filtering)

---

## 🎉 EXPECTED RESULT:

✅ **No more PGRST201 errors!**  
✅ **Orders load correctly with table information!**  
✅ **Bookings display properly!**

---

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** ✅ Applied to chef-dashboard.tsx and bookings-screen.tsx
