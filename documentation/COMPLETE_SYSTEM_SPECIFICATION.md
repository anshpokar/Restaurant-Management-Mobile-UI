# 🍽️ Complete Restaurant Management System - Technical Specification

## 📋 Document Purpose
This document contains the complete functional and technical specifications for the restaurant management system with Dine-In and Delivery order flows.

---

## 🎯 System Overview

### **Order Types:**
1. **Dine-In** - Customer sits at table, served by waiter
2. **Delivery** - Order delivered to customer's address (within 20km)

### **Order Channels:**
1. **Customer Direct** - Via mobile app (delivery or dine-in QR)
2. **Waiter-Assisted** - Waiter takes order on behalf of customer (dine-in only)

---

## 📊 COMPLETE USER FLOWS

### **FLOW 1: Dine-In Order by Waiter**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Waiter selects table from UI                        │
│ - View all tables with status (Vacant/Occupied)             │
│ - Select available table                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Optional Customer Information                       │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Customer Name: [Required]                           │    │
│ │ Customer Email: [Optional]                          │    │
│ │                                                      │    │
│ │ ☑ Create account for this customer?                 │    │
│ │                                                      │    │
│ │ If email provided → Send OTP via Supabase Auth      │    │
│ │ If new customer → Quick account creation            │    │
│ │ If existing customer → OTP verification only        │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌──────────────┐
                    │  SKIP BUTTON │
                    │  (No email)  │
                    └──────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Waiter Takes Order                                  │
│ - Browse menu                                               │
│ - Add items to cart                                         │
│ - Specify customizations                                    │
│ - Submit order to kitchen                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Chef Receives Order                                 │
│ - Notification sound                                        │
│ - Order appears in queue                                    │
│ - Update status: Preparing → Prepared                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Waiter Notified                                     │
│ - Push notification: "Order ready to serve"                 │
│ - Waiter collects and serves                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Additional Orders (Optional)                        │
│ - Customer can order more items                             │
│ - Same flow as above                                        │
│ - All orders merge into single bill                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Billing & Payment                                   │
│ Admin presents bill (paper/digital)                         │
│                                                              │
│ Payment Options:                                            │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ○ Cash (COD)                                        │    │
│ │ ○ UPI via Razorpay QR Code                          │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                              │
│ Once payment confirmed → Mark order as PAID                 │
│ Table automatically marked VACANT                           │
└─────────────────────────────────────────────────────────────┘
```

---

### **FLOW 2: Dine-In Order by Customer (QR Scan)**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Customer scans QR code on table                     │
│ - QR contains table ID                                      │
│ - Opens web app / native app                                │
│ - Auto-selects that table                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Customer browses menu & adds to cart                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Customer places order                               │
│ - Order linked to customer profile (if logged in)           │
│ - Order sent to kitchen                                     │
│ - Table marked OCCUPIED if was vacant                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4-7: Same as Waiter flow (Chef → Serve → Pay)          │
└─────────────────────────────────────────────────────────────┘
```

---

### **FLOW 3: Delivery Order (Customer Only)**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Customer selects delivery address                   │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Google Maps Integration:                            │    │
│ │ - Pin location on map                               │    │
│ │ - Auto-detect current location                      │    │
│ │ - Search by address                                 │    │
│ │                                                      │    │
│ │ Validation:                                          │    │
│ │ ✓ Check if within 20km radius from restaurant       │    │
│ │ ✓ Check if pincode is in allowed list               │    │
│ │ ✗ Show error if outside delivery zone               │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Customer browses menu & adds to cart                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Payment Selection                                   │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Payment Method:                                      │    │
│ │ ○ Prepaid (Pay Now)                                 │    │
│ │   - Razorpay integration                            │    │
│ │   - Pay before order confirmation                   │    │
│ │                                                      │    │
│ │ ○ Cash on Delivery (COD)                            │    │
│ │   - Pay when order arrives                          │    │
│ │                                                      │    │
│ │ ○ UPI on Delivery                                   │    │
│ │   - Delivery person shows Razorpay QR               │    │
│ │   - Customer pays when order arrives                │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Order placed → Chef receives                        │
│ - Status: Placed                                            │
│ - If Prepaid: Mark as PAID                                  │
│ - If COD/UPI: Mark as PENDING                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Chef prepares order                                 │
│ - Updates status: Preparing → Prepared                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Automatic Delivery Assignment                       │
│ System finds first available delivery person                │
│                                                              │
│ Assignment Logic:                                           │
│ - Check who is FREE and ON_DUTY                             │
│ - Auto-assign to first available                            │
│ - Notify delivery person                                    │
│                                                              │
│ Delivery person can ACCEPT or REJECT                        │
│ - If REJECT: Must provide reason                            │
│ - System assigns to next available                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 7: Delivery Person Picks Up                            │
│ - Scans order QR / Confirms pickup                          │
│ - Status: Out for Delivery                                  │
│ - Live GPS tracking starts                                  │
│ - Customer sees live location on map                        │
│ - Route optimization suggested                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 8: Delivery & Payment Collection                       │
│                                                              │
│ If Prepaid:                                                 │
│ - Just deliver order                                        │
│ - Customer confirms receipt                                 │
│                                                              │
│ If COD/UPI:                                                 │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ 1. Delivery person arrives                          │    │
│ │ 2. Shows Razorpay QR for UPI payment                │    │
│ │    OR accepts cash                                  │    │
│ │                                                      │    │
│ │ 3. Customer pays:                                    │    │
│ │    - UPI: Scans QR → Pays →Auto confirms            │    │
│ │    - Cash: Gives cash → Delivery marks collected    │    │
│ │                                                      │    │
│ │ 4. Delivery person confirms payment received         │    │
│ │                                                      │    │
│ │ 5. Order marked as DELIVERED & PAID                  │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 9: Order Complete                                      │
│ - Delivery person marked FREE again                         │
│ - Can accept new orders                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE SCHEMA CHANGES

### **Modified Tables:**

#### **1. orders Table**
```sql
ALTER TABLE orders ADD COLUMN 
    -- Order Type
    order_type TEXT NOT NULL CHECK (order_type IN ('dine_in', 'delivery')),
    
    -- Who placed the order
    placed_by TEXT NOT NULL CHECK (placed_by IN ('customer', 'waiter')),
    
    -- For Dine-In
    table_id UUID REFERENCES restaurant_tables(id),
    
    -- Customer Info (for waiter orders without account)
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- For Delivery
    delivery_address TEXT,
    delivery_address_line2 TEXT,
    delivery_pincode TEXT,
    delivery_latitude DECIMAL(10, 8),
    delivery_longitude DECIMAL(11, 8),
    delivery_instructions TEXT,
    
    -- Delivery Assignment
    delivery_person_id UUID REFERENCES profiles(id),
    delivery_status TEXT DEFAULT 'pending',
    assigned_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Payment
    payment_method TEXT CHECK (payment_method IN ('cod', 'upi', 'razorpay', 'cash')),
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    payment_id TEXT, -- Razorpay payment ID
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- OTP Verification
    otp_code TEXT, -- Generated OTP
    otp_verified BOOLEAN DEFAULT FALSE,
    otp_verified_at TIMESTAMP WITH TIME ZONE;

-- Indexes for performance
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_delivery_person ON orders(delivery_person_id);
CREATE INDEX idx_orders_type_status ON orders(order_type, delivery_status);
CREATE INDEX idx_orders_payment ON orders(payment_status);
```

#### **2. restaurant_tables Table**
```sql
ALTER TABLE tables ADD COLUMN 
    status TEXT DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'reserved', 'maintenance')),
    occupied_at TIMESTAMP WITH TIME ZONE,
    occupied_by_customer_name TEXT, -- For current session
    occupied_by_customer_email TEXT,
    current_order_id UUID REFERENCES orders(id);

-- Track which customer is sitting
CREATE INDEX idx_tables_status ON tables(status);
```

#### **3. delivery_addresses Table (NEW)**
```sql
CREATE TABLE delivery_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- Home, Work, etc.
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_default BOOLEAN DEFAULT FALSE,
    
    -- Validation
    is_within_delivery_zone BOOLEAN DEFAULT TRUE,
    distance_from_restaurant NUMERIC, -- in km
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_delivery_addresses_user ON delivery_addresses(user_id);
CREATE INDEX idx_delivery_addresses_pincode ON delivery_addresses(pincode);
```

#### **4. delivery_zones Table (NEW)**
```sql
CREATE TABLE delivery_zones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pincode TEXT NOT NULL UNIQUE,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_distance_km NUMERIC DEFAULT 20,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Insert default allowed pincodes
INSERT INTO delivery_zones (pincode, city, state, max_distance_km) VALUES
('110001', 'New Delhi', 'Delhi', 20),
('110002', 'New Delhi', 'Delhi', 20),
-- Add more as needed
```

#### **5. delivery_assignments Table (NEW)**
```sql
CREATE TABLE delivery_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    delivery_person_id UUID REFERENCES profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_assignments_order ON delivery_assignments(order_id);
CREATE INDEX idx_assignments_person ON delivery_assignments(delivery_person_id);
```

#### **6. delivery_rejections Table (NEW)**
```sql
CREATE TABLE delivery_rejections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES delivery_assignments(id),
    delivery_person_id UUID REFERENCES profiles(id),
    reason TEXT NOT NULL,
    other_reason TEXT, -- If reason is "Other"
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

#### **7. table_sessions Table (NEW)**
```sql
CREATE TABLE table_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_id UUID REFERENCES restaurant_tables(id),
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMP WITH TIME ZONE,
    total_orders INTEGER DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed'))
);

CREATE INDEX idx_sessions_table ON table_sessions(table_id);
CREATE INDEX idx_sessions_status ON table_sessions(status);
```

---

## 🔧 NEW FEATURES TO BUILD

### **Module 1: Waiter Dashboard** ⚠️ NEW

#### **Screens Needed:**
1. **Table Selection Screen**
   - Grid view of all tables
   - Color coding: Green (Vacant), Red (Occupied)
   - Click to select table

2. **Customer Info Form** (Optional)
   - Name (required)
   - Email (optional)
   - Checkbox: "Create account for customer"
   - Skip button

3. **Order Taking Interface**
   - Menu browsing
   - Add to cart
   - Customizations
   - Submit to kitchen

4. **Active Tables View**
   - See all tables they're serving
   - Reorder option
   - View orders per table

5. **Notifications**
   - Order ready notification
   - New order assigned

---

### **Module 2: Chef Dashboard** ⚠️ NEW

#### **Screens Needed:**
1. **Order Queue**
   - List of pending orders
   - Priority indicators
   - Timer showing wait time

2. **Order Detail View**
   - Items to prepare
   - Customizations
   - Table number / Delivery flag

3. **Status Update**
   - Buttons: Start Preparing → Ready
   - Notifications to waiter

---

### **Module 3: Delivery Management** ⚠️ NEW

#### **Features:**
1. **Google Maps Integration**
   - Map picker for address
   - Distance calculation
   - 20km radius validation
   - Pincode checker

2. **Auto-Assignment System**
   ```javascript
   // Algorithm
   function assignDeliveryPerson(order) {
     const available = getAvailableDeliveryPersons();
     
     if (available.length === 0) {
       notifyAdmin("No delivery persons available");
       return null;
     }
     
     // Assign to first available
     const assignee = available[0];
     createAssignment(order.id, assignee.id);
     sendNotification(assignee.id, "New delivery assigned");
     
     return assignee;
   }
   ```

3. **Rejection Handling**
   - Delivery person can reject
   - Mandatory reason field
   - Auto-assign to next available

4. **Live Tracking**
   - GPS updates every 10 seconds
   - Show on customer map
   - Route optimization

5. **Delivery Person App**
   - Available/Busy toggle
   - Assigned orders list
   - Navigation to customer
   - Payment collection (Razorpay QR)
   - Confirm delivery

---

### **Module 4: Payment System** ⚠️ NEW

#### **Razorpay Integration:**

1. **Dine-In (Admin Side)**
   - Generate QR code for bill amount
   - Display to customer
   - Webhook to confirm payment
   - Auto-mark table vacant

2. **Delivery (Delivery Person Side)**
   - Show Razorpay QR to customer
   - Accept cash
   - Confirm payment received
   - Update order status

3. **Prepaid Online (Customer Side)**
   - Razorpay checkout
   - Pay before order
   - Instant confirmation

---

### **Module 5: Enhanced Features** ⚠️ IMPROVED

1. **OTP System (Supabase Auth)**
   - Send OTP to email
   - Verify during waiter order
   - Account creation flow

2. **Real-time Notifications**
   - Waiter: Order ready
   - Chef: New order
   - Customer: Delivery tracking
   - Delivery: New assignment

3. **Table Management**
   - Occupancy tracking
   - Auto-vacate on payment
   - Session management

---

## 📱 SCREEN INVENTORY

### **New Screens to Create:**

#### **Waiter Flow:**
- [ ] `src/pages/waiter/table-selection-screen.tsx`
- [ ] `src/pages/waiter/customer-info-screen.tsx`
- [ ] `src/pages/waiter/order-taking-screen.tsx`
- [ ] `src/pages/waiter/active-tables-screen.tsx`
- [ ] `src/pages/waiter/order-detail-screen.tsx`

#### **Chef Flow:**
- [ ] `src/pages/chef/order-queue-screen.tsx`
- [ ] `src/pages/chef/order-prep-screen.tsx`

#### **Delivery Flow:**
- [ ] `src/pages/delivery/address-picker-screen.tsx` (Customer)
- [ ] `src/pages/delivery/assignment-screen.tsx` (Delivery Person)
- [ ] `src/pages/delivery/tracking-screen.tsx` (Customer)
- [ ] `src/pages/delivery/navigation-screen.tsx` (Delivery Person)
- [ ] `src/pages/delivery/payment-collection-screen.tsx`

#### **Admin/Payment:**
- [ ] `src/pages/admin/billing-screen.tsx`
- [ ] `src/pages/admin/razorpay-qr-screen.tsx`
- [ ] `src/pages/admin/table-management-screen.tsx`

---

## 🔐 SUPABASE FUNCTIONS NEEDED

### **1. Send OTP Function**
```sql
CREATE OR REPLACE FUNCTION send_customer_otp(email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    otp_code TEXT;
BEGIN
    -- Generate 6-digit OTP
    otp_code := floor(random() * 900000 + 100000)::TEXT;
    
    -- Store in temp table or use Supabase Auth
    INSERT INTO customer_otps (email, otp_code, expires_at)
    VALUES (email, otp_code, NOW() + INTERVAL '10 minutes');
    
    -- Send via Supabase Auth
    PERFORM auth.admin_send_otp(email, otp_code);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

### **2. Distance Calculation**
```sql
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS NUMERIC AS $$
BEGIN
    -- Haversine formula
    RETURN ROUND(
        6371 * acos(
            cos(radians(lat1)) * cos(radians(lat2)) *
            cos(radians(lon2) - radians(lon1)) +
            sin(radians(lat1)) * sin(radians(lat2))
        )::NUMERIC,
        2
    );
END;
$$ LANGUAGE plpgsql;
```

### **3. Auto-Assign Delivery**
```sql
CREATE OR REPLACE FUNCTION auto_assign_delivery(order_id UUID)
RETURNS UUID AS $$
DECLARE
    assigned_person_id UUID;
BEGIN
    -- Find first available delivery person
    SELECT id INTO assigned_person_id
    FROM profiles
    WHERE role = 'delivery'
      AND is_available = TRUE
      AND is_on_duty = TRUE
    ORDER BY last_assignment_date ASC -- Fair distribution
    LIMIT 1;
    
    IF assigned_person_id IS NULL THEN
        RAISE EXCEPTION 'No delivery persons available';
    END IF;
    
    -- Create assignment
    INSERT INTO delivery_assignments (order_id, delivery_person_id)
    VALUES (order_id, assigned_person_id);
    
    RETURN assigned_person_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 🚀 IMPLEMENTATION PHASES

### **Phase 1: Core Dine-In (Weeks 1-2)**
- ✅ Waiter table selection
- ✅ Customer info form (optional email)
- ✅ Order taking interface
- ✅ Chef dashboard (basic)
- ✅ Kitchen notifications
- ✅ Table status management

### **Phase 2: Delivery Basic (Weeks 3-4)**
- ✅ Address input with validation
- ✅ Pincode checker
- ✅ Manual delivery assignment
- ✅ Delivery person dashboard
- ✅ Basic tracking (status updates)

### **Phase 3: Advanced Features (Weeks 5-6)**
- ✅ Google Maps integration
- ✅ Auto-assignment algorithm
- ✅ Live GPS tracking
- ✅ Route optimization
- ✅ Razorpay integration

### **Phase 4: Polish & Testing (Week 7)**
- ✅ OTP system
- ✅ Real-time notifications
- ✅ Payment automation
- ✅ Testing & bug fixes

---

## 📝 TECHNICAL REQUIREMENTS

### **APIs Needed:**
1. **Google Maps API** (Paid)
   - Geocoding
   - Distance Matrix
   - Maps JavaScript
   
2. **Razorpay API** (Paid - 2% + GST)
   - Payment links
   - QR codes
   - Webhooks

3. **Supabase Auth** (Free tier sufficient)
   - OTP emails
   - User creation

### **Libraries to Install:**
```bash
npm install @react-google-maps/api razorpay
```

---

## ✅ CURRENT STATUS

### **Already Working:**
✅ User authentication  
✅ Menu display  
✅ Cart functionality  
✅ Basic order placement  
✅ Order history  
✅ Support tickets  
✅ Addresses  
✅ Notifications  

### **Need to Build:**
⚠️ Waiter dashboard  
⚠️ Chef dashboard  
⚠️ Delivery management  
⚠️ Google Maps integration  
⚠️ Razorpay integration  
⚠️ Auto-assignment system  
⚠️ Live tracking  
⚠️ OTP system  
⚠️ Table management  
⚠️ Payment automation  

---

## 📞 NEXT STEPS

1. **Review this document** - Ensure all requirements captured
2. **Prioritize features** - Decide what to build first
3. **Get API keys** - Google Maps, Razorpay
4. **Start Phase 1** - Begin with waiter dashboard
5. **Iterate** - Build, test, refine

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-15  
**Status:** Ready for Implementation  
