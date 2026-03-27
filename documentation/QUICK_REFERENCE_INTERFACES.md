# 📋 QUICK REFERENCE - ALL DATABASE INTERFACES

## ✅ COMPLETE INTERFACE LIST

**File:** `src/lib/supabase.ts`  
**Total Interfaces:** 17 (14 table + 3 helper)

---

## 🔤 TYPE DEFINITIONS

### **UserRole Enum**
```typescript
type UserRole = 'admin' | 'customer' | 'delivery' | 'waiter' | 'chef';
```

---

## 📊 TABLE INTERFACES (14)

### **1. Profile** (User Accounts)
```typescript
interface Profile {
  id: string;
  full_name: string;
  username: string;
  phone_number: string;
  role: UserRole;
  email: string;
}
```

### **2. MenuItem** (Menu Items)
```typescript
interface MenuItem {
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

### **3. RestaurantTable** (Dine-in Tables)
```typescript
interface RestaurantTable {
  id: string;
  table_number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}
```

### **4. Order** (Customer Orders)
```typescript
interface Order {
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

### **5. OrderItem** (Order Line Items)
```typescript
interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
}
```

### **6. TableBooking** (Reservations)
```typescript
interface TableBooking {
  id: string;
  user_id: string;
  table_id: string;
  booking_date: string;
  booking_time: string;
  guests_count: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  restaurant_tables?: RestaurantTable;
}
```

### **7. Offer** (Promotions)
```typescript
interface Offer {
  id: string;
  title: string;
  description: string;
  discount_code: string;
  is_active: boolean;
  created_at: string;
}
```

### **8. Address** (Saved Addresses)
```typescript
interface Address {
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

### **9. Favorite** (Wishlist)
```typescript
interface Favorite {
  id: string;
  user_id: string;
  menu_item_id: number;
  created_at: string;
}
```

### **10. Notification** (Alerts)
```typescript
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order' | 'booking' | 'promotion' | 'system';
  is_read: boolean;
  created_at: string;
}
```

### **11. SupportTicket** (Help Tickets)
```typescript
interface SupportTicket {
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

### **12. Upayment** ⭐ NEW (UPI Payments)
```typescript
interface Upayment {
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
  orders?: Order;
  profiles?: Profile;
}
```

### **13. DeliveryConfig** ⭐ NEW (Delivery Settings)
```typescript
interface DeliveryConfig {
  id: string;
  config_key: string;
  config_value: string;
  description?: string;
  is_active: boolean;
  updated_at: string;
}
```

### **14. DeliveryPersonLocation** ⭐ NEW (Live Tracking)
```typescript
interface DeliveryPersonLocation {
  id: string;
  delivery_person_id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  recorded_at: string;
  profiles?: Profile;
}
```

---

## 🛠️ HELPER TYPES (3)

### **CartItem** (Shopping Cart)
```typescript
interface CartItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
  image: string;
  veg: boolean;
}
```

### **TableBookingInput** (Create Booking)
```typescript
interface TableBookingInput {
  table_id: string;
  booking_date: string;
  booking_time: string;
  guests_count: number;
}
```

### **OrderInput** (Place Order)
```typescript
interface OrderInput {
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

## 💻 USAGE EXAMPLES

### **Example 1: Fetch Data with Types**
```typescript
import { supabase, Order, Profile } from '@/lib/supabase';

const { data } = await supabase
  .from('orders')
  .select(`
    *,
    profiles (full_name, phone_number),
    order_items (*)
  `);

// TypeScript knows the type!
const orders = data as Order[];
```

### **Example 2: Create New Record**
```typescript
import { supabase, AddressInput } from '@/lib/supabase';

const newAddress: AddressInput = {
  address_label: 'Home',
  address_line1: '123 Main St',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  phone_number: '9876543210',
  is_default: true
};

const { data, error } = await supabase
  .from('addresses')
  .insert({
    user_id: userId,
    ...newAddress
  });
```

### **Example 3: UPI Payment Flow**
```typescript
import { supabase, Upayment } from '@/lib/supabase';

// Generate QR
const { data: payment } = await supabase.rpc('create_upi_payment', {
  p_order_id: orderId,
  p_vpa: 'anshjpokar@oksbi',
  p_restaurant_name: 'Navratna Restaurant'
});

// payment.upi_link contains the QR code data
```

---

## 📊 DATABASE TABLES SUMMARY

| # | Table | Interface | Records | Purpose |
|---|-------|-----------|---------|---------|
| 1 | `profiles` | `Profile` | Users | User accounts |
| 2 | `menu_items` | `MenuItem` | Menu | Food items |
| 3 | `restaurant_tables` | `RestaurantTable` | Tables | Dine-in tables |
| 4 | `orders` | `Order` | Orders | Customer orders |
| 5 | `order_items` | `OrderItem` | Line items | Order details |
| 6 | `table_bookings` | `TableBooking` | Reservations | Table bookings |
| 7 | `offers` | `Offer` | Promotions | Discount offers |
| 8 | `addresses` | `Address` | Addresses | Delivery addresses |
| 9 | `favorites` | `Favorite` | Wishlist | Favorite items |
| 10 | `notifications` | `Notification` | Alerts | Push notifications |
| 11 | `support_tickets` | `SupportTicket` | Tickets | Help & support |
| 12 | `upi_payments` | `Upayment` ⭐ | Payments | UPI QR tracking |
| 13 | `delivery_config` | `DeliveryConfig` ⭐ | Config | Delivery settings |
| 14 | `delivery_person_locations` | `DeliveryPersonLocation` ⭐ | Locations | Live tracking |

---

## 🔗 RELATED FILES

- **Type Definitions:** [`src/lib/supabase.ts`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/lib/supabase.ts)
- **Complete Reference:** [`DATABASE_COMPLETE_REFERENCE.md`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/DATABASE_COMPLETE_REFERENCE.md)
- **Database Schema:** [`supabase-schema.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/supabase-schema.sql)
- **UPI Functions:** [`SUPABASE_SQL_FINAL.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/SUPABASE_SQL_FINAL.sql)

---

## ✅ VERIFICATION CHECKLIST

After running SQL in Supabase, verify all tables exist:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return 14+ tables including:
-- - addresses
-- - favorites
-- - menu_items
-- - notifications
-- - order_items
-- - orders
-- - offers
-- - profiles
-- - restaurant_tables
-- - support_tickets
-- - table_bookings
-- - upi_payments ⭐ NEW
-- - delivery_config ⭐ NEW
-- - delivery_person_locations ⭐ NEW
```

---

## 🎯 KEY FEATURES BY ROLE

### **Customer Can:**
- ✅ View `menu_items`
- ✅ Create `orders`
- ✅ Manage `addresses`
- ✅ Create `table_bookings`
- ✅ Manage `favorites`
- ✅ View `notifications`
- ✅ Create `support_tickets`
- ✅ Use `upi_payments` for payment

### **Waiter Can:**
- ✅ View `restaurant_tables`
- ✅ Create `orders` for tables
- ✅ View customer info from `profiles`

### **Chef Can:**
- ✅ View `orders` + `order_items`
- ✅ Update order status

### **Delivery Can:**
- ✅ View assigned `orders`
- ✅ Update `delivery_person_locations`
- ✅ View delivery `addresses`

### **Admin Can:**
- ✅ Full access to ALL tables
- ✅ Verify `upi_payments`
- ✅ Manage `delivery_config`
- ✅ Handle `support_tickets`

---

**Quick Reference Card - All 17 Interfaces Documented!**  
**Last Updated:** 2025-01-15  
**Status:** ✅ Complete & Type-Safe
