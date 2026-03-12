# 🍽️ ORDER TYPE SELECTION FLOW - DINE-IN vs DELIVERY

## 📍 WHERE CUSTOMERS CHOOSE ORDER TYPE

### **Current Implementation Status:**

⚠️ **IMPORTANT:** The customer-facing cart/checkout screen with order type selection is **NOT YET IMPLEMENTED** in the current codebase.

---

## 🗺️ CURRENT FLOW (What's Implemented)

### **1. Waiter Flow - Dine-in Only** ✅

**File:** [`src/pages/waiter/table-selection-screen.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/waiter/table-selection-screen.tsx)

**Flow:**
```
1. Waiter selects vacant table
   ↓
2. Enter customer info (name, email, phone)
   ↓
3. Take order (menu browsing)
   ↓
4. Submit order
   ↓
5. Order created with:
   - order_type: 'dine_in'
   - table_id: [selected table]
   - placed_by: 'waiter'
```

**Code Reference:**
```typescript
// src/pages/waiter/take-order-screen.tsx (Line 123)
const { data: order } = await supabase
  .from('orders')
  .insert({
    user_id: userId,
    table_id: tableId,
    order_type: 'dine_in', // ✅ Hardcoded for waiter
    placed_by: 'waiter',
    // ... other fields
  });
```

---

### **2. Customer App - Missing Checkout** ⏳

**Current State:**
- ✅ Customer can browse menu ([`menu-screen.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/customer/menu-screen.tsx))
- ✅ Customer can add to cart (cart state in context)
- ❌ **NO checkout screen implemented yet**
- ❌ **NO order type selection UI**

**What's Missing:**
A checkout screen where customer chooses:
```
┌─────────────────────────────────────┐
│     SELECT ORDER TYPE               │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐  │
│  │  🍽️ DINE-IN                  │  │
│  │                              │  │
│  │  Eat at restaurant           │  │
│  │  Select table number         │  │
│  │  Pay after eating            │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  🚴 DELIVERY                 │  │
│  │                              │  │
│  │  Delivered to your address   │  │
│  │  Enter delivery location     │  │
│  │  Pay online or COD           │  │
│  └──────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 RECOMMENDED IMPLEMENTATION

### **Where to Add Order Type Selection:**

#### **Option A: After Cart Review (Recommended)**

**Create New File:** `src/pages/customer/checkout-screen.tsx`

**Flow:**
```
Customer adds items to cart
        ↓
Clicks "View Cart" / "Checkout"
        ↓
┌─────────────────────────────────┐
│  CART & CHECKOUT SCREEN          │
├─────────────────────────────────┤
│                                  │
│  📦 Cart Items:                  │
│  - Item 1 x 2      ₹200         │
│  - Item 2 x 1      ₹150         │
│  --------------------           │
│  Total: ₹350                    │
│                                  │
│  ─────────────────────────────  │
│                                  │
│  🎯 SELECT ORDER TYPE:           │
│                                  │
│  ○ 🍽️ Dine-In                   │
│     Choose table number          │
│                                  │
│  ○ 🚴 Delivery                  │
│     Enter delivery address       │
│                                  │
│  [CONTINUE]                      │
└─────────────────────────────────┘
```

---

#### **Option B: Before Menu Browsing**

**Modify:** [`src/pages/customer/home-screen.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/customer/home-screen.tsx)

**Add Two Big Buttons:**
```
┌─────────────────────────────────┐
│        WELCOME TO NAVRATNA       │
│           RESTAURANT             │
├─────────────────────────────────┤
│                                  │
│  How would you like to order?    │
│                                  │
│  ┌──────────────────────────┐   │
│  │                          │   │
│  │   🍽️  DINE-IN            │   │
│  │                          │   │
│  │   Eat at restaurant      │   │
│  │   [SELECT TABLE]         │   │
│  │                          │   │
│  └──────────────────────────┘   │
│                                  │
│  ┌──────────────────────────┐   │
│  │                          │   │
│  │   🚴  DELIVERY           │   │
│  │                          │   │
│  │   Get food delivered     │   │
│  │   [ENTER ADDRESS]        │   │
│  │                          │   │
│  └──────────────────────────┘   │
│                                  │
└─────────────────────────────────┘
```

---

## 💡 QUICK IMPLEMENTATION GUIDE

### **Create Checkout Screen NOW:**

**File:** `src/pages/customer/checkout-screen.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, CartItem } from '@/lib/supabase';

export function CheckoutScreen() {
  const navigate = useNavigate();
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery'>('dine_in');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]); // Get from context

  const handleSubmit = async () => {
    // Validate based on order type
    if (orderType === 'dine_in' && !tableNumber) {
      alert('Please select a table number');
      return;
    }
    
    if (orderType === 'delivery' && !deliveryAddress) {
      alert('Please enter delivery address');
      return;
    }

    // Create order
    const { data: order, error } = await supabase.from('orders').insert({
      order_type: orderType,
      table_id: orderType === 'dine_in' ? tableNumber : null,
      delivery_address: orderType === 'delivery' ? deliveryAddress : null,
      total_amount: calculateTotal(),
      status: 'placed',
      payment_status: 'pending'
    });

    if (order) {
      // Redirect to payment
      navigate(`/customer/payment/${order.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {/* Cart Summary */}
      <div className="bg-card rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-3">Your Order</h2>
        {cartItems.map(item => (
          <div key={item.menu_item_id} className="flex justify-between py-2">
            <span>{item.quantity}x {item.name}</span>
            <span>₹{item.price * item.quantity}</span>
          </div>
        ))}
        <div className="border-t mt-3 pt-3">
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>₹{calculateTotal()}</span>
          </div>
        </div>
      </div>

      {/* Order Type Selection */}
      <div className="space-y-4 mb-6">
        <h2 className="font-semibold">Select Order Type</h2>
        
        {/* Dine-in Option */}
        <button
          onClick={() => setOrderType('dine_in')}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            orderType === 'dine_in' 
              ? 'border-primary bg-primary/10' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">🍽️</div>
            <div className="text-left flex-1">
              <h3 className="font-semibold">Dine-in</h3>
              <p className="text-sm text-muted-foreground">
                Eat at our restaurant
              </p>
            </div>
            {orderType === 'dine_in' && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <✓ className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          
          {orderType === 'dine_in' && (
            <div className="mt-4">
              <label className="block text-sm mb-2">Select Table</label>
              <select
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="">Choose a table...</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                  <option key={num} value={num}>Table {num}</option>
                ))}
              </select>
            </div>
          )}
        </button>

        {/* Delivery Option */}
        <button
          onClick={() => setOrderType('delivery')}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            orderType === 'delivery' 
              ? 'border-primary bg-primary/10' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚴</div>
            <div className="text-left flex-1">
              <h3 className="font-semibold">Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Get it delivered to your door
              </p>
            </div>
            {orderType === 'delivery' && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <✓ className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          
          {orderType === 'delivery' && (
            <div className="mt-4">
              <label className="block text-sm mb-2">Delivery Address</label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Enter your complete address"
                className="w-full p-3 border rounded-lg"
                rows={3}
              />
            </div>
          )}
        </button>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        className="w-full bg-primary text-white py-4 rounded-lg font-semibold"
      >
        Proceed to Payment →
      </button>
    </div>
  );
}
```

---

## 🔧 ADD TO ROUTES

**File:** `src/routes/index.tsx`

```typescript
// Add import
import { CheckoutScreen } from '@/pages/customer/checkout-screen';

// Add route inside customer protected route
<Route path="checkout" element={<CheckoutScreen />} />
```

---

## 📊 DATABASE FIELDS USED

When customer selects order type, these fields are populated:

### **For Dine-in:**
```typescript
{
  order_type: 'dine_in',
  table_id: 'uuid-of-table',
  delivery_address: null,
  delivery_latitude: null,
  delivery_longitude: null,
  delivery_pincode: null
}
```

### **For Delivery:**
```typescript
{
  order_type: 'delivery',
  table_id: null,
  delivery_address: 'complete address string',
  delivery_latitude: 28.6139,
  delivery_longitude: 77.2090,
  delivery_pincode: '110001'
}
```

---

## 🎨 UI/UX BEST PRACTICES

### **Visual Design:**
- Use large, touch-friendly buttons
- Clear icons (🍽️ for dine-in, 🚴 for delivery)
- Show selected state clearly
- Disable continue until valid selection made

### **Validation:**
- Dine-in: Must select table
- Delivery: Must enter complete address
- Check delivery zone (optional, advanced)

### **User Flow:**
```
1. Clear visual choice
2. Additional inputs appear when selected
3. Validate before proceeding
4. Show summary before payment
5. Redirect to UPI payment
```

---

## 🚀 IMMEDIATE NEXT STEPS

### **To Implement This Feature:**

1. **Create Checkout Screen** (30 minutes)
   - Copy code above
   - Customize design
   - Add to routes

2. **Test Flow** (15 minutes)
   - Add items to cart
   - Go to checkout
   - Select dine-in
   - Verify order created correctly

3. **Verify Database** (5 minutes)
```sql
-- Check order_type is saved
SELECT id, order_type, table_id, delivery_address 
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 📝 SUMMARY

### **Current State:**
- ✅ Waiter can place dine-in orders
- ✅ Customer can browse menu
- ❌ Customer cannot select order type yet
- ❌ No checkout screen exists

### **What's Needed:**
Create a checkout screen where customers choose:
- 🍽️ **Dine-in** → Select table number
- 🚴 **Delivery** → Enter delivery address

### **Impact:**
Once implemented, customers can:
1. Browse menu ✅
2. Add to cart ✅
3. **Checkout** ← MISSING
4. Select order type ← MISSING
5. Pay via UPI ✅

---

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Status:** ⏳ Feature Not Yet Implemented - Ready for Development  
**Priority:** HIGH - Critical for customer ordering
