# 🧪 Testing Guide - New Features

## ✅ Quick Fix Applied

I've fixed the issue where nothing was displaying when clicking on the new screens. The problem was that the CustomerApp's `getActiveTab()` function didn't recognize the new routes.

**What was changed:**
- Updated `src/pages/customer/customer-app.tsx` to include the new routes in the profile tab check
- Fixed TypeScript errors in the Address hook and screen

---

## 🚀 How to Test Each Feature

### App is Running On: http://localhost:5174/

### 1️⃣ Saved Addresses

**Steps:**
1. Login as a customer
2. Go to Profile (bottom nav)
3. Click "Saved Addresses"
4. You should see:
   - Empty state with "No saved addresses"
   - "Add New Address" button

**Test Adding Address:**
1. Click "Add New Address"
2. Fill in the form:
   - Label: Home
   - Address Line 1: 123 Main Street
   - Address Line 2: Apt 4B (optional)
   - City: New Delhi
   - State: Delhi
   - Pincode: 110001
   - Phone: +91 9876543210
   - Check "Set as default address"
3. Click "Save Address"
4. You should see the address card appear

**Expected Result:**
- Address appears in the list
- Shows "Default" badge if checked
- Can delete or set another as default

---

### 2️⃣ Favorites

**Steps:**
1. First, add items to favorites from Menu or Home screen
2. Go to Profile → Favorites
3. You should see your favorited dishes

**If Empty:**
- Shows heart icon with "No favorites yet"
- Message: "Start adding dishes you love!"

**Test From Menu:**
1. Go to Menu screen
2. Look for heart icon on dishes (you may need to add this feature)
3. Click to add to favorites
4. Go back to Profile → Favorites
5. See the dish listed

**Expected Result:**
- Shows dish name, image, price, rating
- Can remove from favorites with trash icon

---

### 3️⃣ Notifications

**Steps:**
1. First, create a test notification in Supabase
2. Go to Profile → Notifications
3. Should see unread count badge (if any)

**Create Test Notification:**
Open Supabase Dashboard > SQL Editor and run:

```sql
INSERT INTO notifications (user_id, title, message, type)
VALUES (
  'YOUR_USER_ID_HERE', -- Replace with your actual user ID
  'Welcome!',
  'This is your first notification from the app!',
  'system'
);
```

**To Find Your User ID:**
```sql
SELECT id, email, full_name FROM profiles WHERE email = 'your-email@example.com';
```

**Expected Result:**
- Notification appears with system color (purple)
- Shows timestamp
- Can mark as read
- Can delete
- Unread count badge updates

---

### 4️⃣ Help & Support

**Steps:**
1. Login as customer
2. Go to Profile → Help & Support
3. Click "New Ticket" button
4. Fill the form:
   - Subject: Test Issue
   - Description: I'm testing the support system
   - Priority: Normal
5. Click "Submit Ticket"

**Expected Result:**
- Ticket appears in the list below
- Shows status badge: "OPEN"
- Shows priority badge: "NORMAL"
- Shows creation date
- Can create multiple tickets

---

## 🔍 Debugging

### If Still Not Working:

#### Check Console Logs
Open browser DevTools (F12) and check console for errors.

You should see these logs when navigating to Saved Addresses:
```
SavedAddressesScreen - Profile: { ... }
SavedAddressesScreen - Addresses: [...]
```

#### Check Routes
Make sure you're navigating to the correct URLs:
- `/customer/addresses` - Saved Addresses
- `/customer/favorites` - Favorites
- `/customer/notifications` - Notifications
- `/customer/help-support` - Help & Support

#### Check Authentication
Make sure you're logged in as a **customer** role.

Check in Supabase:
```sql
SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';
```

Should show: `role: customer`

---

## 🐛 Common Issues

### Issue: "Page not found" or blank screen

**Solution:** Check that you're on the right URL path. All new screens are under `/customer/`:
- ✅ `/customer/addresses`
- ❌ `/addresses`

### Issue: "Cannot read property of undefined"

**Solution:** Make sure profile is loaded. The hooks wait for `userId` to be non-null.

### Issue: No data showing in lists

**Solution:** Add some test data first:

**Add test address:**
```sql
INSERT INTO addresses (user_id, address_label, address_line1, city, state, pincode, phone_number, is_default)
VALUES (
  'YOUR_USER_ID',
  'Home',
  '123 Test Street',
  'New Delhi',
  'Delhi',
  '110001',
  '+91 9876543210',
  true
);
```

**Add test favorite:**
```sql
-- First get a menu item ID
SELECT id FROM menu_items LIMIT 1;

-- Then add to favorites
INSERT INTO favorites (user_id, menu_item_id)
VALUES ('YOUR_USER_ID', 1); -- Replace 1 with actual menu_item_id
```

**Add test notification:**
```sql
INSERT INTO notifications (user_id, title, message, type)
VALUES (
  'YOUR_USER_ID',
  'Test Alert',
  'This is a test notification',
  'order'
);
```

**Add test support ticket:**
```sql
INSERT INTO support_tickets (user_id, subject, description, status, priority)
VALUES (
  'YOUR_USER_ID',
  'Test Ticket',
  'Testing the support system',
  'open',
  'normal'
);
```

---

## ✅ Success Indicators

You'll know everything is working when:

✅ Clicking "Saved Addresses" shows the addresses screen  
✅ Clicking "Favorites" shows the favorites screen  
✅ Clicking "Notifications" shows notifications screen  
✅ Clicking "Help & Support" shows support tickets screen  
✅ Back button returns to Profile  
✅ Bottom navigation still works  
✅ No console errors  

---

## 📱 Navigation Flow

```
Customer App (Bottom Nav)
└── Profile Tab
    ├── → Saved Addresses (/customer/addresses)
    ├── → Notifications (/customer/notifications)
    ├── → Favorites (/customer/favorites)
    └── → Help & Support (/customer/help-support)
```

All these screens:
- Show within the CustomerApp layout
- Have the bottom navigation visible
- Highlight "Profile" tab in bottom nav
- Can return to Profile with back button

---

## 🎯 Next Steps After Testing

1. **Add Heart Icon to Menu** - Integrate favorites in menu screen
2. **Add Addresses to Checkout** - Use saved addresses in cart
3. **Auto-Notifications** - Trigger on order status changes
4. **Admin Panel** - Create interface to respond to support tickets

---

**Need Help?** Check the browser console for errors and share the error message!
