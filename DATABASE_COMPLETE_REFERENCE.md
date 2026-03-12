# 📊 COMPLETE DATABASE SCHEMA REFERENCE

## ✅ ALL TABLES & INTERFACES DOCUMENTED

This document provides a complete reference of **all 14 database tables** in your Supabase instance with their corresponding TypeScript interfaces.

---

## 📋 TABLE OVERVIEW

| # | Table Name | Purpose | Interface | Status |
|---|------------|---------|-----------|--------|
| 1 | `profiles` | User accounts & auth | `Profile` | ✅ Complete |
| 2 | `menu_items` | Restaurant menu | `MenuItem` | ✅ Complete |
| 3 | `restaurant_tables` | Dine-in tables | `RestaurantTable` | ✅ Complete |
| 4 | `orders` | Customer orders | `Order` | ✅ Complete |
| 5 | `order_items` | Order line items | `OrderItem` | ✅ Complete |
| 6 | `table_bookings` | Table reservations | `TableBooking` | ✅ Complete |
| 7 | `offers` | Promotional offers | `Offer` | ✅ Complete |
| 8 | `addresses` | Saved addresses | `Address` | ✅ Complete |
| 9 | `favorites` | Favorite items | `Favorite` | ✅ Complete |
| 10 | `notifications` | User notifications | `Notification` | ✅ Complete |
| 11 | `support_tickets` | Help & support | `SupportTicket` | ✅ Complete |
| 12 | `upi_payments` | UPI QR payments | `Upayment` | ✅ **NEW** |
| 13 | `delivery_person_locations` | Delivery tracking | `DeliveryPersonLocation` | ✅ **NEW** |
| 14 | `delivery_config` | Delivery settings | `DeliveryConfig` | ✅ **NEW** |

---

## 🔍 DETAILED TABLE SCHEMAS

### **1. profiles** - User Accounts

**Purpose:** Stores user information linked to Supabase Auth

**Schema:**
```sql
id: uuid (PK, references auth.users)
email: text (unique, not null)
full_name: text
username: text (unique)
phone_number: text (unique)
role: user_role enum ('admin', 'customer', 'delivery', 'waiter', 'chef')
created_at: timestamptz
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface Profile {
  id: string;
  full_name: string;
  username: string;
  phone_number: string;
  role: UserRole;
  email: string;
}
```

**Used In:** Every part of the app - authentication, user management

---

### **2. menu_items** - Restaurant Menu

**Purpose:** All food items available in the restaurant

**Schema:**
```sql
id: bigint (PK, auto-increment)
name: text (not null)
description: text
price: numeric(10,2) (>= 0)
category: text (not null)
veg: boolean (default true)
rating: numeric(3,2) (0-5)
image: text (emoji or URL)
is_available: boolean (default true)
is_special: boolean (default false)
created_at: timestamptz
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  veg: boolean;
  rating: number;
  image: string;
  is_available: boolean;
  is_special?: boolean;
}
```

**Used In:** Menu screen, cart, ordering, chef dashboard

---

### **3. restaurant_tables** - Dine-in Tables

**Purpose:** Physical table management for dine-in service

**Schema:**
```sql
id: uuid (PK)
table_number: integer (unique, not null)
capacity: integer (> 0)
status: table_status enum ('available', 'occupied', 'reserved')
created_at: timestamptz
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface RestaurantTable {
  id: string;
  table_number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}
```

**Used In:** Waiter app, table selection, admin management

---

### **4. orders** - Customer Orders

**Purpose:** Main order tracking from placement to delivery

**Schema:**
```sql
id: uuid (PK)
user_id: uuid (FK → profiles.id)
table_id: uuid (FK → restaurant_tables.id)
status: order_status enum
total_amount: numeric
payment_status: text ('pending', 'paid', 'refunded')
payment_id: text (UTR for UPI payments)
delivery_person_id: uuid (FK → profiles.id)
delivery_address: text
delivery_latitude: numeric
delivery_longitude: numeric
delivery_pincode: text
estimated_delivery_time: text
is_paid: boolean
created_at: timestamptz
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface Order {
  id: string;
  user_id?: string;
  table_id?: string;
  status: 'placed' | 'preparing' | 'cooking' | 'prepared' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total_amount: number;
  delivery_person_id?: string;
  delivery_address?: string;
  is_paid: boolean;
  created_at: string;
  // Join data
  profiles?: Profile;
  delivery_person?: Profile;
  order_items?: OrderItem[];
  restaurant_tables?: RestaurantTable;
}
```

**Used In:** Orders screen, order tracking, kitchen display, admin dashboard

---

### **5. order_items** - Order Line Items

**Purpose:** Individual items within an order

**Schema:**
```sql
id: uuid (PK)
order_id: uuid (FK → orders.id)
menu_item_id: bigint (FK → menu_items.id)
name: text
quantity: integer
price: numeric
image: text
created_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
}
```

**Used In:** Order details, kitchen display, billing

---

### **6. table_bookings** - Table Reservations

**Purpose:** Advance table booking by customers

**Schema:**
```sql
id: uuid (PK)
user_id: uuid (FK → profiles.id)
table_id: uuid (FK → restaurant_tables.id)
booking_date: date
booking_time: time
guests_count: integer
status: booking_status enum ('pending', 'confirmed', 'cancelled', 'completed')
special_requests: text
created_at: timestamptz
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface TableBooking {
  id: string;
  user_id: string;
  table_id: string;
  booking_date: string;
  booking_time: string;
  guests_count: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  // Join data
  restaurant_tables?: RestaurantTable;
}
```

**Used In:** Bookings screen, admin table management

---

### **7. offers** - Promotional Offers

**Purpose:** Discount codes and promotional campaigns

**Schema:**
```sql
id: uuid (PK)
title: text
description: text
discount_code: text (unique)
discount_percentage: numeric(5,2)
is_active: boolean
valid_from: timestamptz
valid_until: timestamptz
created_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface Offer {
  id: string;
  title: string;
  description: string;
  discount_code: string;
  is_active: boolean;
  created_at: string;
}
```

**Used In:** Home screen (offers section), checkout

---

### **8. addresses** - Saved Delivery Addresses

**Purpose:** Customer's saved delivery addresses

**Schema:**
```sql
id: uuid (PK)
user_id: uuid (FK → profiles.id)
address_label: text ("Home", "Work", etc.)
address_line1: text
address_line2: text
city: text
state: text
pincode: text
phone_number: text
is_default: boolean
latitude: numeric (for maps)
longitude: numeric (for maps)
created_at: timestamptz
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface Address {
  id: string;
  user_id: string;
  address_label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone_number: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

**Input Type (for creating):**
```typescript
export interface AddressInput {
  address_label: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone_number: string;
  is_default: boolean;
}
```

**Used In:** Saved addresses screen, delivery address selection, checkout

---

### **9. favorites** - Favorite Menu Items

**Purpose:** Customer's wishlist of favorite items

**Schema:**
```sql
id: uuid (PK)
user_id: uuid (FK → profiles.id)
menu_item_id: bigint (FK → menu_items.id)
created_at: timestamptz

unique(user_id, menu_item_id) -- Prevents duplicates
```

**TypeScript Interface:**
```typescript
export interface Favorite {
  id: string;
  user_id: string;
  menu_item_id: number;
  created_at: string;
}
```

**Used In:** Favorites screen, menu quick-actions

---

### **10. notifications** - User Notifications

**Purpose:** Push notifications and alerts

**Schema:**
```sql
id: uuid (PK)
user_id: uuid (FK → profiles.id)
title: text
message: text
type: text ('order', 'booking', 'promotion', 'system')
is_read: boolean
created_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'booking' | 'promotion' | 'system';
  is_read: boolean;
  created_at: string;
}
```

**Used In:** Notifications screen, real-time updates

---

### **11. support_tickets** - Help & Support

**Purpose:** Customer support requests

**Schema:**
```sql
id: uuid (PK)
user_id: uuid (FK → profiles.id)
subject: text
description: text
status: text ('open', 'in_progress', 'resolved', 'closed')
priority: text ('low', 'normal', 'high', 'urgent')
admin_response: text
resolved_at: timestamptz
created_at: timestamptz
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  admin_response?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}
```

**Used In:** Help & support screen, admin support management

---

### **12. upi_payments** - UPI QR Payment Tracking ⭐ NEW

**Purpose:** Track dynamic UPI QR payments per order

**Schema:**
```sql
id: uuid (PK)
order_id: uuid (FK → orders.id, unique)
qr_id: uuid (unique QR identifier)
amount: numeric
upi_link: text (upi://pay?...)
transaction_id: text (UTR submitted by customer)
status: text ('pending', 'verified', 'failed', 'expired')
expires_at: timestamptz
verified_at: timestamptz
verified_by: uuid (FK → profiles.id - admin who verified)
notes: text (verification notes)
created_at: timestamptz
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface Upayment {
  id: string;
  order_id: string;
  qr_id: string;
  amount: number;
  upi_link: string;
  transaction_id?: string; // UTR number
  status: 'pending' | 'verified' | 'failed' | 'expired';
  expires_at: string;
  verified_at?: string;
  verified_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Join data
  orders?: Order;
  profiles?: Profile;
}
```

**Used In:** UPI payment screen, admin verification dashboard

---

### **13. delivery_person_locations** - Delivery Tracking ⭐ NEW

**Purpose:** Real-time delivery person location updates

**Schema:**
```sql
id: uuid (PK)
delivery_person_id: uuid (FK → profiles.id)
latitude: numeric
longitude: numeric
accuracy: numeric (GPS accuracy in meters)
recorded_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface DeliveryPersonLocation {
  id: string;
  delivery_person_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  recorded_at: string;
  // Join data
  profiles?: Profile;
}
```

**Used In:** Order tracking map, delivery monitoring

---

### **14. delivery_config** - Delivery Settings ⭐ NEW

**Purpose:** Configuration for delivery service

**Schema:**
```sql
id: uuid (PK)
config_key: text (unique)
config_value: text
description: text
is_active: boolean
updated_at: timestamptz
```

**TypeScript Interface:**
```typescript
export interface DeliveryConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
  is_active: boolean;
  updated_at: string;
}
```

**Examples:**
```json
{
  "config_key": "max_delivery_distance_km",
  "config_value": "10",
  "description": "Maximum delivery radius in kilometers"
}

{
  "config_key": "delivery_fee_base",
  "config_value": "30",
  "description": "Base delivery fee in rupees"
}
```

**Used In:** Delivery calculations, admin configuration

---

## 🛒 HELPER INTERFACES (Not Database Tables)

### **CartItem** - Shopping Cart Item

**Purpose:** Temporary cart storage (client-side only)

```typescript
export interface CartItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
  veg: boolean;
}
```

**Note:** Not stored in database - used for cart state management

---

### **TableBookingInput** - Booking Creation Data

**Purpose:** Input type for creating bookings

```typescript
export interface TableBookingInput {
  table_id: string;
  booking_date: string;
  booking_time: string;
  guests_count: number;
}
```

---

### **OrderInput** - Order Creation Data

**Purpose:** Input type for placing new orders

```typescript
export interface OrderInput {
  table_id?: string;
  items: {
    menu_item_id: number;
    quantity: number;
  }[];
  total_amount: number;
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_pincode?: string;
}
```

---

## 🔗 RELATIONSHIP DIAGRAM

```
┌─────────────┐
│   profiles  │
│  (users)    │
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┬──────────────┐
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  orders  │  │ bookings │  │favorites │  │addresses │  │ tickets  │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────┘
     │             │              │
     ├──────┐      │              │
     │      │      │              │
     ▼      ▼      ▼              ▼
┌────────┐ ┌──────┴────┐  ┌────────────┐
│ order_ │ │restaurant │  │menu_items  │
│ items  │ │ _tables   │  │            │
└────────┘ └───────────┘  └────────────┘
     │
     │
┌────▼────────────┐
│ upi_payments    │ ← Links to orders
└─────────────────┘
```

---

## 📊 USAGE BY FEATURE

### **Authentication & Users**
- `profiles` - User data
- `addresses` - Saved addresses
- `favorites` - Wishlist

### **Dine-in System**
- `restaurant_tables` - Table management
- `table_bookings` - Reservations
- `orders` + `order_items` - Food orders
- `profiles` (role: waiter) - Waiter operations

### **Delivery System**
- `orders` + `order_items` - Order processing
- `addresses` - Delivery locations
- `profiles` (role: delivery) - Delivery partners
- `delivery_person_locations` - Live tracking
- `delivery_config` - Settings
- `upi_payments` - Payment verification

### **Kitchen Operations**
- `orders` + `order_items` - Incoming orders
- `profiles` (role: chef) - Chef dashboard

### **Admin Features**
- All tables readable
- `profiles` - User management
- `menu_items` - Menu CRUD
- `offers` - Promotions
- `support_tickets` - Support
- `upi_payments` - Payment verification

### **Customer Features**
- `menu_items` - Browse menu
- `orders` - Order history
- `table_bookings` - Reservations
- `addresses` - Saved addresses
- `favorites` - Wishlist
- `notifications` - Alerts
- `support_tickets` - Help
- `upi_payments` - Payment

---

## 🔐 ROW LEVEL SECURITY (RLS)

All tables have RLS policies enabled. General rules:

### **Public Read Access:**
- `menu_items` (available items)
- `restaurant_tables` (basic info)
- `offers` (active offers)

### **User-Specific Access:**
- `profiles` (own profile)
- `orders` (own orders)
- `addresses` (own addresses)
- `favorites` (own favorites)
- `notifications` (own notifications)
- `table_bookings` (own bookings)
- `support_tickets` (own tickets)
- `upi_payments` (linked to own orders)

### **Role-Based Access:**
- `admin` - Full access to everything
- `delivery` - Assigned delivery orders + profiles
- `waiter` - Tables + orders + customer info
- `chef` - Orders + order_items

---

## 📝 HOW TO USE IN CODE

### **Example 1: Fetch User Orders**

```typescript
import { supabase, Order } from '@/lib/supabase';

async function getUserOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (*),
      profiles (full_name, phone_number),
      restaurant_tables (table_number)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Order[];
}
```

### **Example 2: Create New Order**

```typescript
import { supabase, OrderInput } from '@/lib/supabase';

async function createOrder(orderData: OrderInput) {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      table_id: orderData.table_id,
      total_amount: orderData.total_amount,
      delivery_address: orderData.delivery_address,
      delivery_latitude: orderData.delivery_latitude,
      delivery_longitude: orderData.delivery_longitude,
      delivery_pincode: orderData.delivery_pincode,
      status: 'placed'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Insert order items
  const orderItems = orderData.items.map(item => ({
    order_id: data.id,
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    // ... other fields
  }));
  
  await supabase.from('order_items').insert(orderItems);
  
  return data;
}
```

### **Example 3: UPI Payment Flow**

```typescript
import { supabase, Upayment } from '@/lib/supabase';

// Generate QR for order
async function generatePaymentQR(orderId: string) {
  const { data, error } = await supabase.rpc('create_upi_payment', {
    p_order_id: orderId,
    p_vpa: 'anshjpokar@oksbi',
    p_restaurant_name: 'Navratna Restaurant'
  });
  
  return data as {
    qr_id: string;
    upi_link: string;
    amount: number;
    expires_at: string;
  };
}

// Verify payment (admin)
async function verifyPayment(qrId: string, adminId: string, utr: string) {
  const { data, error } = await supabase.rpc('verify_upi_payment_db', {
    p_qr_id: qrId,
    p_admin_id: adminId,
    p_notes: `UTR: ${utr}`
  });
  
  return data;
}
```

---

## ✅ VERIFICATION CHECKLIST

After running SQL migrations, verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Should return all 14 tables + any auxiliary tables.

---

## 🎯 QUICK REFERENCE

### **File Location:**
All interfaces defined in: [`src/lib/supabase.ts`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/lib/supabase.ts)

### **Database Schema Files:**
- Main schema: [`supabase-schema.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/supabase-schema.sql)
- Phase 1 migration: [`phase-1-database-migration.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/phase-1-database-migration.sql)
- Phase 2 migration: [`phase-2-delivery-migration.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/phase-2-delivery-migration.sql)
- Phase 3 migration: [`phase-3-advanced-migration.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/phase-3-advanced-migration.sql)
- UPI functions: [`SUPABASE_SQL_FINAL.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/SUPABASE_SQL_FINAL.sql)

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Total Tables:** 14  
**Total Interfaces:** 17 (14 table + 3 helper)  
**Status:** ✅ Complete & Documented
