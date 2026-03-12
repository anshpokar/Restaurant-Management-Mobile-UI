# 🧪 COMPLETE TESTING GUIDE - RESTAURANT MANAGEMENT SYSTEM

## 📋 TABLE OF CONTENTS

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Test Accounts Creation](#test-accounts-creation)
3. [Customer Flow Testing](#customer-flow-testing)
4. [Waiter Flow Testing](#waiter-flow-testing)
5. [Chef Flow Testing](#chef-flow-testing)
6. [Delivery Flow Testing](#delivery-flow-testing)
7. [Admin Flow Testing](#admin-flow-testing)
8. [UPI Payment Testing](#upi-payment-testing)
9. [End-to-End Scenarios](#end-to-end-scenarios)
10. [Bug Reporting Template](#bug-reporting-template)

---

## 🚀 PRE-TESTING SETUP

### **Step 1: Database Setup** ✅

Run this SQL in Supabase SQL Editor:

```sql
-- File: SUPABASE_SQL_FINAL.sql
-- Run this first to create UPI functions
```

**Verify Functions Created:**
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('generate_upi_link', 'create_upi_payment', 'verify_upi_payment_db');
```

Should return 3 rows.

---

### **Step 2: Environment Check** ✅

Create test `.env` file if not exists:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_GOOGLE_MAPS_API_KEY=
```

**Note:** Google Maps key can be empty - we use Leaflet now!

---

### **Step 3: Install Dependencies** ✅

```bash
npm install
```

**Required packages:**
- ✅ leaflet
- ✅ react-leaflet
- ✅ @types/leaflet
- ✅ @supabase/supabase-js
- ✅ react-router-dom
- ✅ lucide-react

---

### **Step 4: Start Development Server** ✅

```bash
npm run dev
```

Open browser: `http://localhost:5173`

---

## 👥 TEST ACCOUNTS CREATION

### **Create These Test Users:**

You need to create accounts with different roles. Use the signup screen to create:

#### **1. Customer Account**
```
Email: customer@test.com
Password: Test123!
Name: Test Customer
Username: testcustomer
Phone: 9876543210
Role: customer (default)
```

#### **2. Waiter Account** ⚠️ Need Admin Help
```
Email: waiter@test.com
Password: Test123!
Name: Test Waiter
Username: testwaiter
Phone: 9876543211
Role: waiter (admin must set this)
```

#### **3. Chef Account** ⚠️ Need Admin Help
```
Email: chef@test.com
Password: Test123!
Name: Test Chef
Username: testchef
Phone: 9876543212
Role: chef (admin must set this)
```

#### **4. Delivery Partner** ⚠️ Need Admin Help
```
Email: delivery@test.com
Password: Test123!
Name: Test Delivery
Username: testdelivery
Phone: 9876543213
Role: delivery (admin must set this)
```

#### **5. Admin Account** ⚠️ Manual Database Update
```
Email: admin@test.com
Password: Test123!
Name: Test Admin
Username: testadmin
Phone: 9876543214
Role: admin (update in database)
```

**How to Set Roles:**

After creating accounts, update roles in Supabase:

```sql
-- Update user role to admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@test.com';

-- Update other roles
UPDATE profiles 
SET role = 'waiter' 
WHERE email = 'waiter@test.com';

UPDATE profiles 
SET role = 'chef' 
WHERE email = 'chef@test.com';

UPDATE profiles 
SET role = 'delivery' 
WHERE email = 'delivery@test.com';
```

---

## 🛒 CUSTOMER FLOW TESTING

### **Test Scenario 1: User Registration & Login**

**Steps:**
1. Open app → Signup
2. Create account with email `customer@test.com`
3. Verify redirect to home screen
4. Logout
5. Login again with same credentials
6. Verify successful login

**Expected Results:**
- ✅ Account created successfully
- ✅ Redirected to home screen
- ✅ Profile shows correct name
- ✅ Logout works
- ✅ Login works

**Database Check:**
```sql
SELECT * FROM profiles WHERE email = 'customer@test.com';
```

---

### **Test Scenario 2: Browse Menu**

**Steps:**
1. Login as customer
2. Navigate to Menu
3. View categories
4. Check veg/non-veg indicators
5. Search for items
6. Filter by category

**Expected Results:**
- ✅ All menu items displayed
- ✅ Veg (🟢) and Non-veg (🔴) icons visible
- ✅ Prices shown correctly
- ✅ Search works
- ✅ Filters work

---

### **Test Scenario 3: Add to Cart**

**Steps:**
1. Select any item
2. Choose quantity
3. Add to cart
4. Check cart icon badge
5. View cart
6. Update quantity
7. Remove item

**Expected Results:**
- ✅ Item added to cart
- ✅ Cart badge updates
- ✅ Quantity adjustable
- ✅ Total calculates correctly
- ✅ Remove works

---

### **Test Scenario 4: Dine-in Order**

**Steps:**
1. Add items to cart
2. Proceed to checkout
3. Select "Dine-in"
4. Choose table number
5. Enter customer name
6. Place order
7. Note order number

**Expected Results:**
- ✅ Order placed successfully
- ✅ Order number generated
- ✅ Table status updated to "occupied"
- ✅ Order appears in "Orders" screen
- ✅ Status shows "placed"

**Database Check:**
```sql
SELECT o.id, o.order_number, o.status, o.total_amount, t.table_number
FROM orders o
JOIN restaurant_tables t ON o.table_id = t.id
WHERE o.user_id = 'YOUR_USER_ID'
ORDER BY o.created_at DESC
LIMIT 1;
```

---

### **Test Scenario 5: Delivery Order**

**Steps:**
1. Add items to cart
2. Checkout
3. Select "Delivery"
4. Add new delivery address
   - Label: Home
   - Address: 123 Main St
   - City: Mumbai
   - State: Maharashtra
   - Pincode: 400001
   - Phone: 9876543210
5. Save address
6. Place order

**Expected Results:**
- ✅ Address form validates
- ✅ Address saved to database
- ✅ Order created with delivery type
- ✅ Delivery address stored
- ✅ Order shows "out_for_delivery" status

**Database Check:**
```sql
SELECT o.id, o.delivery_address, o.delivery_pincode, 
       a.address_line1, a.city, a.pincode
FROM orders o
JOIN addresses a ON o.delivery_address = a.id
WHERE o.user_id = 'YOUR_USER_ID'
ORDER BY o.created_at DESC
LIMIT 1;
```

---

### **Test Scenario 6: UPI Payment Flow** ⭐ CRITICAL

**Steps:**
1. Go to Orders screen
2. Select unpaid order
3. Click "Pay Now"
4. QR code displays
5. **Scan QR with real UPI app** (PhonePe, GPay, Paytm)
6. Pay ₹1 (test amount)
7. Note UTR number
8. Submit UTR in app
9. Wait for admin verification

**Expected Results:**
- ✅ QR code generates
- ✅ Shows correct amount
- ✅ Shows "Navratna Restaurant"
- ✅ UPI ID: anshjpokar@oksbi
- ✅ QR is scannable
- ✅ UTR submission works
- ✅ Payment status updates to "pending"

**QR Code Verification:**
The QR should contain:
```
upi://pay?pa=anshjpokar@oksbi&pn=Navratna_Restaurant&am=XX.XX&cu=INR&tn=ORDER_ORDER_ID
```

**Database Check:**
```sql
SELECT up.order_id, up.amount, up.upi_link, up.transaction_id, 
       up.status, up.expires_at, o.payment_status
FROM upi_payments up
JOIN orders o ON up.order_id = o.id
WHERE o.id = 'YOUR_ORDER_ID';
```

**Real Payment Test:**
- Actually pay ₹1 to `anshjpokar@oksbi`
- Money should reach your bank account
- Verify in your bank statement

---

### **Test Scenario 7: Table Booking**

**Steps:**
1. Navigate to "Bookings"
2. Select date (tomorrow)
3. Select time (7:00 PM)
4. Choose guests (4 people)
5. Submit booking
6. Check booking status

**Expected Results:**
- ✅ Booking created
- ✅ Status: "pending"
- ✅ Table assigned automatically
- ✅ Booking appears in list

**Database Check:**
```sql
SELECT b.id, b.booking_date, b.booking_time, b.guests_count, 
       b.status, t.table_number
FROM table_bookings b
JOIN restaurant_tables t ON b.table_id = t.id
WHERE b.user_id = 'YOUR_USER_ID'
ORDER BY b.created_at DESC
LIMIT 1;
```

---

### **Test Scenario 8: Saved Addresses**

**Steps:**
1. Go to Profile → Saved Addresses
2. Add new address
3. Mark as default
4. Add another address
5. Delete first address

**Expected Results:**
- ✅ Address added
- ✅ Default flag works
- ✅ Multiple addresses supported
- ✅ Delete works
- ✅ Default address used at checkout

---

### **Test Scenario 9: Favorites**

**Steps:**
1. Browse menu
2. Heart icon on items
3. Add 3 favorites
4. Go to Favorites screen
5. Remove one

**Expected Results:**
- ✅ Items added to favorites
- ✅ Appears in favorites list
- ✅ Remove works
- ✅ No duplicates allowed

**Database Check:**
```sql
SELECT f.menu_item_id, m.name, f.created_at
FROM favorites f
JOIN menu_items m ON f.menu_item_id = m.id
WHERE f.user_id = 'YOUR_USER_ID';
```

---

### **Test Scenario 10: Notifications**

**Steps:**
1. Place an order
2. Wait for status change
3. Check notifications bell
4. Open notification

**Expected Results:**
- ✅ Notification created on order
- ✅ Badge shows unread count
- ✅ Opens relevant screen
- ✅ Marks as read

---

### **Test Scenario 11: Help & Support**

**Steps:**
1. Go to Profile → Help & Support
2. Create ticket
   - Subject: "Test Issue"
   - Description: "Testing support"
   - Priority: Normal
3. Submit
4. Check status

**Expected Results:**
- ✅ Ticket created
- ✅ Status: "open"
- ✅ Appears in tickets list

**Database Check:**
```sql
SELECT id, subject, description, status, priority, created_at
FROM support_tickets
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

---

### **Test Scenario 12: Order Tracking** 🗺️

**Steps:**
1. Place delivery order
2. Wait for admin to assign delivery
3. Open tracking screen
4. Check map displays

**Expected Results:**
- ✅ Leaflet map loads (FREE!)
- ✅ Shows rider location (🛵)
- ✅ Shows delivery destination (🏠)
- ✅ No Google Maps errors
- ✅ Real-time updates work

**Console Check:**
No errors in browser console related to maps.

---

## 👨‍🍳 WAITER FLOW TESTING

### **Prerequisites:**
- Admin must set your role to "waiter"
- Some tables must exist in database

### **Test Scenario 1: Waiter Login**

**Steps:**
1. Login as waiter@test.com
2. App should open Waiter Dashboard

**Expected Results:**
- ✅ Correct dashboard loads
- ✅ Can see table selection

---

### **Test Scenario 2: Table Selection**

**Steps:**
1. View available tables
2. Select occupied table
3. View customer info

**Expected Results:**
- ✅ Tables color-coded
- ✅ Green = vacant
- ✅ Red = occupied
- ✅ Shows customer name

---

### **Test Scenario 3: Take Order**

**Steps:**
1. Select table
2. Enter customer name
3. Add items
4. Submit order

**Expected Results:**
- ✅ Order created for table
- ✅ Customer name recorded
- ✅ Goes to kitchen

**Database Check:**
```sql
SELECT o.id, o.table_id, o.status, p.full_name as customer_name
FROM orders o
LEFT JOIN profiles p ON o.user_id = p.id
WHERE o.table_id IS NOT NULL
ORDER BY o.created_at DESC
LIMIT 1;
```

---

## 👨‍🍳 CHEF FLOW TESTING

### **Prerequisites:**
- Admin must set your role to "chef"
- Waiter must have placed orders

### **Test Scenario 1: Chef Dashboard**

**Steps:**
1. Login as chef@test.com
2. View incoming orders

**Expected Results:**
- ✅ Orders displayed
- ✅ Grouped by status
- ✅ Shows table numbers

---

### **Test Scenario 2: Update Order Status**

**Steps:**
1. Select order
2. Change status: "placed" → "preparing"
3. Then "cooking"
4. Then "prepared"

**Expected Results:**
- ✅ Status updates instantly
- ✅ Color changes
- ✅ Customer sees update

**Database Check:**
```sql
SELECT id, order_number, status, updated_at
FROM orders
ORDER BY updated_at DESC
LIMIT 5;
```

---

## 🚴 DELIVERY FLOW TESTING

### **Prerequisites:**
- Admin must set your role to "delivery"
- Must have delivery orders ready

### **Test Scenario 1: Delivery Tasks**

**Steps:**
1. Login as delivery@test.com
2. View assigned deliveries
3. Accept task

**Expected Results:**
- ✅ Shows delivery address
- ✅ Shows order details
- ✅ Customer contact info

---

### **Test Scenario 2: Update Location** ⭐

**Steps:**
1. Start delivery
2. Browser should ask location permission
3. Allow
4. Move around (if testing on phone)

**Expected Results:**
- ✅ Location updates sent to database
- ✅ Customer sees live tracking
- ✅ Map updates position

**Database Check:**
```sql
SELECT dpl.id, dpl.latitude, dpl.longitude, dpl.accuracy, 
       dpl.recorded_at, p.full_name
FROM delivery_person_locations dpl
JOIN profiles p ON dpl.delivery_person_id = p.id
WHERE p.role = 'delivery'
ORDER BY dpl.recorded_at DESC
LIMIT 10;
```

---

### **Test Scenario 3: Complete Delivery**

**Steps:**
1. Reach customer
2. Mark as delivered
3. Confirm

**Expected Results:**
- ✅ Order status → "delivered"
- ✅ Payment marked complete
- ✅ Task removed from active list

---

## 👑 ADMIN FLOW TESTING

### **Prerequisites:**
- Your role must be "admin" in database

### **Test Scenario 1: Admin Dashboard**

**Steps:**
1. Login as admin@test.com
2. View dashboard

**Expected Results:**
- ✅ Shows all stats
- ✅ Today's orders
- ✅ Revenue
- ✅ Active tables

---

### **Test Scenario 2: Manage Menu**

**Steps:**
1. Go to Menu Management
2. Add new item
   - Name: Test Burger
   - Price: 99
   - Category: Burgers
   - Veg: No
3. Save
4. Edit item
5. Delete item

**Expected Results:**
- ✅ Item added
- ✅ Appears in menu
- ✅ Edit works
- ✅ Delete works

**Database Check:**
```sql
SELECT id, name, price, category, veg, is_available
FROM menu_items
WHERE name = 'Test Burger';
```

---

### **Test Scenario 3: Manage Tables**

**Steps:**
1. Go to Tables
2. Add table (Number: 99, Capacity: 4)
3. Change status
4. Delete table

**Expected Results:**
- ✅ Table created
- ✅ Status updates
- ✅ Delete works

---

### **Test Scenario 4: UPI Payment Verification** ⭐⭐⭐ CRITICAL

**Steps:**
1. Go to "UPI Verification" screen
2. Find pending payment
3. Check transaction ID (UTR)
4. Verify in bank app
5. Click "Verify Payment"
6. Add note: "Verified via UTR"

**Expected Results:**
- ✅ Pending payments listed
- ✅ Can search by UTR/order ID
- ✅ Verify button works
- ✅ Payment status → "verified"
- ✅ Order payment_status → "paid"
- ✅ Real-time update to customer

**Database Check:**
```sql
-- Before verification
SELECT up.id, up.transaction_id, up.status, up.verified_at,
       o.id as order_id, o.payment_status
FROM upi_payments up
JOIN orders o ON up.order_id = o.id
WHERE up.status = 'pending';

-- After verification (wait 1-2 seconds)
SELECT up.id, up.transaction_id, up.status, up.verified_at,
       up.verified_by, up.notes,
       o.id as order_id, o.payment_status
FROM upi_payments up
JOIN orders o ON up.order_id = o.id
WHERE up.status = 'verified';
```

**CRITICAL VERIFICATION:**
- ✅ Money actually reached your bank account
- ✅ Check your bank statement for `anshjpokar@oksbi`
- ✅ Amount matches order total
- ✅ UTR matches what customer submitted

---

### **Test Scenario 5: Assign Delivery**

**Steps:**
1. Go to Orders
2. Select delivery order
3. Assign to delivery partner
4. Notify

**Expected Results:**
- ✅ Delivery person assigned
- ✅ Gets notification
- ✅ Order status → "out_for_delivery"

---

### **Test Scenario 6: User Management**

**Steps:**
1. Go to User Management
2. View all users
3. Change user role
4. Deactivate user

**Expected Results:**
- ✅ All users listed
- ✅ Role dropdown works
- ✅ Changes saved to database

**Database Check:**
```sql
SELECT id, full_name, email, role, created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;
```

---

### **Test Scenario 7: Support Tickets**

**Steps:**
1. Customer creates ticket
2. Admin views tickets
3. Add response
4. Change status to "resolved"

**Expected Results:**
- ✅ Ticket appears
- ✅ Can respond
- ✅ Status updates
- ✅ Customer sees response

---

## 💰 END-TO-END SCENARIOS

### **Scenario 1: Complete Dine-in Experience**

**Actors:** Customer, Waiter, Chef

**Steps:**
1. **Customer:** Browses menu, adds items to cart
2. **Customer:** Places dine-in order at Table 5
3. **System:** Creates order, status "placed"
4. **Waiter:** Sees new order notification
5. **Chef:** Order appears in kitchen
6. **Chef:** Updates status → "preparing" → "cooking" → "prepared"
7. **Waiter:** Serves food to table
8. **Customer:** Requests bill
9. **Customer:** Pays via UPI QR
10. **Admin:** Verifies payment
11. **System:** Order marked paid

**Success Criteria:**
- ✅ Order flows smoothly through all stages
- ✅ Each role sees correct interface
- ✅ Status updates in real-time
- ✅ Payment verified and recorded

---

### **Scenario 2: Complete Delivery Experience**

**Actors:** Customer, Chef, Delivery, Admin

**Steps:**
1. **Customer:** Places delivery order
2. **Customer:** Adds delivery address
3. **Customer:** Pays via UPI
4. **System:** Creates order
5. **Chef:** Prepares order
6. **Admin:** Assigns delivery partner
7. **Delivery:** Accepts task
8. **Delivery:** Picks up order
9. **System:** Tracks delivery location
10. **Customer:** Watches live tracking
11. **Delivery:** Delivers to customer
12. **Admin:** Verifies UPI payment

**Success Criteria:**
- ✅ Address saved correctly
- ✅ Order prepared on time
- ✅ Delivery assigned
- ✅ Live tracking works (Leaflet map)
- ✅ Customer can track rider
- ✅ Payment verified

---

### **Scenario 3: Table Booking + Dine-in**

**Actors:** Customer, Waiter, Chef

**Steps:**
1. **Customer:** Books table for tomorrow
2. **System:** Confirms booking
3. **Next Day:** Customer arrives
4. **Waiter:** Seats customer at reserved table
5. **Customer:** Places order
6. **Chef:** Prepares food
7. **Customer:** Pays via UPI
8. **Admin:** Verifies payment
9. **System:** Marks booking completed

**Success Criteria:**
- ✅ Booking created
- ✅ Table reserved
- ✅ Order linked to booking
- ✅ Payment processed

---

## 🐛 BUG REPORTING TEMPLATE

When you find bugs, document them like this:

```markdown
## Bug Report

**Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Module:** Customer / Waiter / Chef / Delivery / Admin

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Screenshots:**
[Attach if applicable]

**Browser Console Errors:**
```
Paste console errors here
```

**Database Query (if relevant):**
```sql
Relevant query
```

**Environment:**
- Browser: Chrome/Firefox/Safari
- Device: Desktop/Mobile
- OS: Windows/macOS/iOS/Android

**Possible Fix:**
Your suggestion (optional)
```

---

## ✅ FINAL CHECKLIST

Before marking Phase 4 complete:

### **Functionality Tests:**
- [ ] All customer scenarios work
- [ ] All waiter scenarios work
- [ ] All chef scenarios work
- [ ] All delivery scenarios work
- [ ] All admin scenarios work
- [ ] UPI payment works end-to-end
- [ ] Real money received in bank
- [ ] Leaflet maps work (no Google errors)
- [ ] Real-time updates work
- [ ] All CRUD operations work

### **Technical Tests:**
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] No console errors
- [ ] Database queries fast (<1s)
- [ ] RLS policies working
- [ ] All interfaces typed correctly

### **User Experience:**
- [ ] Navigation intuitive
- [ ] Loading states present
- [ ] Error messages clear
- [ ] Forms validate properly
- [ ] Mobile responsive
- [ ] Fast performance

### **Security:**
- [ ] Authentication required
- [ ] RLS prevents unauthorized access
- [ ] UPI payments secure
- [ ] User data protected

---

## 📊 TEST RESULTS TRACKER

Use this table to track tests:

| Test # | Module | Test Name | Status | Date | Notes |
|--------|--------|-----------|--------|------|-------|
| C1 | Customer | Registration | ⏳ | | |
| C2 | Customer | Browse Menu | ⏳ | | |
| C3 | Customer | Add to Cart | ⏳ | | |
| C4 | Customer | Dine-in Order | ⏳ | | |
| C5 | Customer | Delivery Order | ⏳ | | |
| C6 | Customer | UPI Payment | ⏳ | | |
| W1 | Waiter | Login | ⏳ | | |
| W2 | Waiter | Table Selection | ⏳ | | |
| W3 | Waiter | Take Order | ⏳ | | |
| CH1 | Chef | Dashboard | ⏳ | | |
| CH2 | Chef | Update Status | ⏳ | | |
| D1 | Delivery | Tasks | ⏳ | | |
| D2 | Delivery | Location Tracking | ⏳ | | |
| A1 | Admin | Dashboard | ⏳ | | |
| A2 | Admin | Menu Management | ⏳ | | |
| A3 | Admin | UPI Verification | ⏳ | | |
| A4 | Admin | User Management | ⏳ | | |
| E2E-1 | All | Dine-in Flow | ⏳ | | |
| E2E-2 | All | Delivery Flow | ⏳ | | |

**Legend:**
- ⏳ Pending
- ✅ Pass
- ❌ Fail

---

## 🎯 SUCCESS CRITERIA

Phase 4 testing is complete when:

✅ All 20+ test scenarios executed  
✅ All critical bugs fixed  
✅ UPI payment works with real money  
✅ Leaflet maps work perfectly  
✅ No TypeScript errors  
✅ No runtime errors  
✅ All roles can perform their duties  
✅ Real-time updates work  
✅ Database queries fast  
✅ Security policies effective  

---

## 📞 GETTING HELP

If you encounter issues:

1. **Check Console:** Browser DevTools → Console
2. **Check Network:** DevTools → Network tab
3. **Check Database:** Supabase → Table Editor
4. **Check Logs:** Supabase → Logs
5. **Documentation:** Review DATABASE_COMPLETE_REFERENCE.md

---

**Document Version:** 1.0  
**Created:** 2025-01-15  
**Total Tests:** 20+ scenarios  
**Estimated Time:** 2-3 hours for complete testing  
**Status:** Ready for Testing  

**START TESTING NOW!** 🚀
