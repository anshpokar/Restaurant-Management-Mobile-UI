# 🗺️ Database Schema Diagram

## Entity Relationship Diagram

```
┌─────────────────────┐
│      profiles       │
├─────────────────────┤
│ id (PK)             │──┐
│ email               │  │
│ full_name           │  │
│ username            │  │
│ phone_number        │  │
│ role                │  │
│ created_at          │  │
│ updated_at          │  │
└─────────────────────┘  
         │
         │ 1:M
         ├──────────────────────────────────────┐
         │                                      │
         │ 1:M                                  │ 1:M
         ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│     orders          │              │   table_bookings    │
├─────────────────────┤              ├─────────────────────┤
│ id (PK)             │              │ id (PK)             │
│ user_id (FK)        │              │ user_id (FK)        │
│ table_id (FK)       │              │ table_id (FK)       │
│ status              │              │ booking_date        │
│ total_amount        │              │ booking_time        │
│ delivery_person_id  │──┐           │ guests_count        │
│ is_paid             │  │           │ status              │
│ created_at          │  │           │ created_at          │
│ updated_at          │  │           └─────────────────────┘
└─────────────────────┘  │                      │
         │               │                      │
         │ 1:M           │                      │
         ▼               │                      ▼
┌─────────────────────┐  │           ┌─────────────────────┐
│    order_items      │  │           │ restaurant_tables   │
├─────────────────────┤  │           ├─────────────────────┤
│ id (PK)             │  │           │ id (PK)             │
│ order_id (FK)       │  │           │ table_number        │
│ menu_item_id (FK)   │◄─┘           │ capacity            │
│ name                │              │ status              │
│ quantity            │              │ created_at          │
│ price               │              │ updated_at          │
│ image               │              └─────────────────────┘
│ created_at          │
└─────────────────────┘
         ▲
         │ M:1
         │
┌─────────────────────┐
│     menu_items      │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ description         │
│ price               │
│ category            │
│ veg                 │
│ rating              │
│ image               │
│ is_available        │
│ is_special          │
│ created_at          │
│ updated_at          │
└─────────────────────┘


┌─────────────────────┐
│       offers        │
├─────────────────────┤
│ id (PK)             │
│ title               │
│ description         │
│ discount_code       │
│ discount_percentage │
│ is_active           │
│ valid_from          │
│ valid_until         │
│ created_at          │
└─────────────────────┘


┌─────────────────────┐
│     addresses       │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ address_label       │
│ address_line1       │
│ address_line2       │
│ city                │
│ state               │
│ pincode             │
│ phone_number        │
│ is_default          │
│ created_at          │
│ updated_at          │
└─────────────────────┘

┌─────────────────────┐
│     favorites       │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ menu_item_id (FK)   │
│ created_at          │
│ UNIQUE(user_id,     │
│        menu_item_id)│
└─────────────────────┘

┌─────────────────────┐
│    notifications    │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ title               │
│ message             │
│ type                │
│ is_read             │
│ created_at          │
└─────────────────────┘

┌─────────────────────┐
│   support_tickets   │
├─────────────────────┤
│ id (PK)             │
│ user_id (FK)        │
│ subject             │
│ description         │
│ status              │
│ priority            │
│ admin_response      │
│ resolved_at         │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

---

## 🔗 Relationships Explained

### Core Business Flow

```
Customer (profiles)
    ↓ places
Order (orders)
    ↓ contains
Order Items (order_items)
    ↓ references
Menu Items (menu_items)
    ↓ prepared by
Chef (profiles as chef)
    ↓ delivered by
Delivery Person (profiles as delivery)
```

### Table Booking Flow

```
Customer (profiles)
    ↓ books
Table Booking (table_bookings)
    ↓ reserves
Restaurant Table (restaurant_tables)
    ↓ managed by
Waiter/Admin (profiles)
```

### User Role Hierarchy

```
┌──────────────────────────────────────┐
│            ADMIN                     │
│  - Full access to all tables         │
│  - Can manage user roles             │
│  - View analytics                    │
└──────────────────────────────────────┘
              │
    ┌─────────┼─────────┐
    │                   │
    ▼                   ▼
┌─────────┐       ┌─────────┐
│  CHEF   │       │ WAITER  │
├─────────┤       ├─────────┤
│View all │       │View all │
│orders   │       │tables   │
│Update   │       │Update   │
│status   │       │status   │
└─────────┘       └─────────┘
                        │
                        │
                        ▼
                  ┌─────────────┐
                  │  DELIVERY   │
                  ├─────────────┤
                  │View assigned│
                  │deliveries   │
                  │Update status│
                  └─────────────┘
    
┌──────────────────────────────────────┐
│           CUSTOMER                   │
│  - Can browse menu                   │
│  - Place orders                      │
│  - Book tables                       │
│  - View own data only                │
└──────────────────────────────────────┘
```

---

## 📊 Data Flow Examples

### Example 1: Customer Places Order

```
1. Customer browses menu_items (public read)
2. Adds items to cart (frontend only)
3. Clicks "Place Order"
   → Creates: orders row (user_id = customer)
   → Creates: multiple order_items rows
4. Chef sees new order (realtime subscription)
5. Chef updates: orders.status = 'preparing'
6. Chef updates: orders.status = 'cooking'
7. Chef updates: orders.status = 'prepared'
8. Admin assigns delivery person
   → Updates: orders.delivery_person_id
   → Updates: orders.status = 'out_for_delivery'
9. Delivery updates: orders.status = 'delivered'
   → Updates: orders.is_paid = true
```

### Example 2: Table Booking

```
1. Customer views restaurant_tables (public read)
2. Selects date, time, guests
3. System filters available tables
4. Customer selects table
5. Creates: table_bookings row
   → status = 'pending'
6. Waiter/Admin sees booking
7. Staff updates: table_bookings.status = 'confirmed'
8. On booking date:
   → Waiter updates: restaurant_tables.status = 'reserved'
9. After dining:
   → Updates: table_bookings.status = 'completed'
   → Updates: restaurant_tables.status = 'available'
```

### Example 3: Admin Menu Management

```
1. Admin views menu_items
2. Clicks "Add Item"
   → Inserts: new menu_items row
3. Toggles availability
   → Updates: menu_items.is_available
4. Marks as special
   → Updates: menu_items.is_special
5. Customers see changes immediately
```

---

## 🔐 Access Control Matrix

| Table | Customer | Chef | Waiter | Delivery | Admin | Public |
|-------|----------|------|--------|----------|-------|--------|
| **profiles** | View self | View all | View all | View all | All | View all |
| **menu_items** | View | View | View | View | CRUD | View |
| **restaurant_tables** | View | View | CRUD | View | CRUD | View |
| **orders** | Own CRUD | View all, Update status | View all, Update | Assigned only | All | - |
| **order_items** | Own | View all | View all | Assigned | All | - |
| **table_bookings** | Own | View | CRUD | View | CRUD | - |
| **offers** | View active | View | View | View | CRUD | View active |
| **addresses** | Own | - | - | - | View | - |
| **favorites** | Own | - | - | - | View | - |
| **notifications** | Own | Own | Own | Own | Create | - |
| **support_tickets** | Own | View assigned | View | - | All | - |

**Legend:**
- View = SELECT only
- CRUD = Full access (Create, Read, Update, Delete)
- Own = Only their own records
- All = All records in table
- - = No access

---

## 🎯 Key Queries by Feature

### Home Screen
```sql
-- Get bestsellers (top rated)
SELECT * FROM menu_items 
ORDER BY rating DESC 
LIMIT 5;

-- Get today's specials
SELECT * FROM menu_items 
WHERE is_special = true 
LIMIT 3;

-- Get active offers
SELECT * FROM offers 
WHERE is_active = true 
ORDER BY created_at DESC 
LIMIT 3;
```

### Menu Screen
```sql
-- Browse by category
SELECT * FROM menu_items 
WHERE category = 'Main Course'
  AND is_available = true
ORDER BY name;

-- Search
SELECT * FROM menu_items 
WHERE name ILIKE '%butter%'
  AND is_available = true;
```

### Orders Screen (Customer)
```sql
-- My orders with items
SELECT 
  o.*,
  array_agg(oi.*) as items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = current_user_id
GROUP BY o.id
ORDER BY o.created_at DESC;
```

### Kitchen Display (Chef)
```sql
-- Active orders needing preparation
SELECT 
  o.*,
  p.full_name as customer,
  array_agg(oi.*) as items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN profiles p ON p.id = o.user_id
WHERE o.status IN ('placed', 'preparing', 'cooking')
GROUP BY o.id, p.full_name
ORDER BY o.created_at;
```

### Table Management (Waiter)
```sql
-- All tables with current status
SELECT 
  rt.*,
  o.id as active_order_id,
  p.full_name as customer
FROM restaurant_tables rt
LEFT JOIN orders o ON o.table_id = rt.id 
  AND o.is_paid = false
LEFT JOIN profiles p ON p.id = o.user_id
ORDER BY rt.table_number;
```

### Admin Dashboard
```sql
-- Today's KPIs
SELECT 
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total_amount) as revenue,
  COUNT(DISTINCT CASE WHEN o.is_paid THEN 1 END) as paid_orders,
  (SELECT COUNT(*) FROM restaurant_tables WHERE status = 'occupied') as occupied_tables,
  (SELECT COUNT(*) FROM table_bookings 
   WHERE booking_date = CURRENT_DATE 
   AND status IN ('confirmed', 'pending')) as todays_bookings
FROM orders o
WHERE DATE(o.created_at) = CURRENT_DATE;
```

---

## 📈 Index Strategy

### High-Traffic Queries → Indexed

```sql
-- Customer looks up own orders
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Kitchen filters by status
CREATE INDEX idx_orders_status ON orders(status);

-- Recent orders display
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Menu category filter
CREATE INDEX idx_menu_items_category ON menu_items(category);

-- Availability filter
CREATE INDEX idx_menu_items_available ON menu_items(is_available);

-- Booking date lookup
CREATE INDEX idx_table_bookings_date ON table_bookings(booking_date);

-- User notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
```

---

## 🔄 Realtime Subscriptions

Your app uses Supabase Realtime for live updates:

### Subscribe to these tables:

```javascript
// Chef dashboard - watch for new orders
supabase.channel('chef-orders')
  .on('postgres_changes', 
      { event: '*', table: 'orders' }, 
      refreshOrders)
  .subscribe();

// Customer orders - track status changes
supabase.channel('my-orders')
  .on('postgres_changes', 
      { event: '*', table: 'orders' }, 
      fetchMyOrders)
  .subscribe();

// Waiter - table status changes
supabase.channel('table-updates')
  .on('postgres_changes', 
      { event: '*', table: 'restaurant_tables' }, 
      fetchTables)
  .subscribe();

// Admin - all order activity
supabase.channel('admin-orders')
  .on('postgres_changes', 
      { event: '*', table: 'orders' }, 
      fetchOrders)
  .subscribe();
```

---

**This diagram shows your complete database structure!** 🎉
