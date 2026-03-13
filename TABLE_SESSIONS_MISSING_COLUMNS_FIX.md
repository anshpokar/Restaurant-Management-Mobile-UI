# 🔧 TABLE_SESSIONS MISSING COLUMNS FIX

## ✅ ERROR IDENTIFIED

### **Error Message:**
```
Could not find the 'notes' column of 'table_sessions' in the schema cache
```

### **Root Cause:**
The code in [`session-start-screen.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/waiter/session-start-screen.tsx#L55-L70) is trying to insert into `table_sessions` with these columns:

```typescript
.from('table_sessions')
.insert({
  table_id: tableId,
  user_id: userId || null,
  session_name: sessionName.trim(),      // ❌ MISSING COLUMN
  status: 'active',
  payment_status: 'pending',
  total_amount: 0,
  started_at: new Date().toISOString(),
  notes: `Created by waiter for ${customerType} customer`  // ❌ MISSING COLUMN
})
```

But your database schema only has these columns:
- ✅ `id`, `table_id`, `customer_name`, `customer_email`, `customer_phone`
- ✅ `started_at`, `ended_at`, `total_orders`, `total_amount`
- ✅ `payment_status`, `status`, `created_at`, `updated_at`
- ❌ **Missing:** `session_name`, `notes`, `user_id`

---

## 🛠️ SOLUTION

### **Step 1: Run SQL Script to Add Missing Columns**

Run this in **Supabase Dashboard → SQL Editor**:

```sql
-- ============================================
-- ADD MISSING COLUMNS TO TABLE_SESSIONS
-- ============================================

-- Add notes column (for special instructions)
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN table_sessions.notes IS 'Additional notes or special instructions for the session';

-- Add session_name column (for custom names like "Table 5 Dinner")
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS session_name TEXT;

COMMENT ON COLUMN table_sessions.session_name IS 'Custom name for the session (e.g., "Table 5 Dinner", "John''s Lunch")';

-- Add user_id column (to link to user accounts)
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN table_sessions.user_id IS 'Reference to user account (null for guest customers)';

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON table_sessions(user_id);

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'table_sessions'
ORDER BY ordinal_position;
```

### **Step 2: Verify Columns Added**

After running the SQL, check in Supabase Dashboard:
1. Go to **Table Editor**
2. Select `table_sessions` table
3. Scroll right to see all columns
4. Confirm you now have: `notes`, `session_name`, `user_id`

### **Step 3: Restart Your App**

```bash
# Stop dev server (Ctrl+C)
# Restart it
npm run dev
```

This clears the Supabase schema cache.

---

## 📊 UPDATED TABLE SCHEMA

After adding columns, your `table_sessions` table will have:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `table_id` | UUID | Reference to restaurant_tables |
| `user_id` | UUID | **NEW** - Reference to profiles (user account) |
| `customer_name` | TEXT | Customer name (from profile or manual entry) |
| `customer_email` | TEXT | Customer email |
| `customer_phone` | TEXT | Customer phone |
| `session_name` | TEXT | **NEW** - Custom session name (e.g., "Team Lunch") |
| `notes` | TEXT | **NEW** - Special instructions or notes |
| `started_at` | TIMESTAMP | When session started |
| `ended_at` | TIMESTAMP | When session ended |
| `total_orders` | INTEGER | Number of orders in session |
| `total_amount` | NUMERIC | Total bill amount |
| `payment_status` | TEXT | pending/paid/pending_partial/completed |
| `status` | TEXT | active/completed |
| `created_at` | TIMESTAMP | Record creation time |
| `updated_at` | TIMESTAMP | Last update time |

---

## 🎯 WHAT EACH NEW COLUMN DOES

### **1. `session_name`**
**Purpose:** Give sessions memorable names for easy identification

**Example Values:**
- `"Table 5 Dinner"`
- `"John's Birthday Lunch"`
- `"Team Meeting"`
- `"Anniversary Celebration"`

**Used In:**
- Waiter session start screen
- Session list views
- Order history displays

### **2. `notes`**
**Purpose:** Store special instructions or additional information

**Example Values:**
- `"Created by waiter for existing customer - john@example.com"`
- `"VIP customer - handle with care"`
- `"Allergic to nuts - kitchen notified"`
- `"Celebrating 50th anniversary"`

**Used In:**
- Session creation logging
- Staff handover notes
- Customer service tracking

### **3. `user_id`**
**Purpose:** Link session to user account (for existing customers)

**Values:**
- `UUID` - For registered customers (links to profiles table)
- `NULL` - For walk-in/guest customers

**Benefits:**
- Track customer order history
- Link to loyalty programs
- Enable personalized marketing
- Fetch customer preferences automatically

---

## 🔄 DATA FLOW WITH NEW COLUMNS

### **Starting a Session (Waiter Flow):**

```
Waiter enters customer info
    ↓
Customer type: Existing/New/Guest
    ↓
If Existing/New → user_id assigned
If Guest → user_id = NULL
    ↓
Waiter enters session name: "Table 5 Lunch"
    ↓
System adds notes: "Created for existing customer"
    ↓
INSERT INTO table_sessions {
  table_id: "...",
  user_id: "...",        ← NEW
  session_name: "Table 5 Lunch",  ← NEW
  notes: "Created for...",  ← NEW
  status: "active",
  ...
}
```

### **Querying Sessions:**

```sql
-- Get all active sessions with user info
SELECT 
  ts.session_name,
  ts.customer_name,
  ts.customer_email,
  ts.total_amount,
  p.full_name as user_full_name,
  p.phone_number
FROM table_sessions ts
LEFT JOIN profiles p ON ts.user_id = p.id
WHERE ts.status = 'active';

-- Get sessions by session name
SELECT * FROM table_sessions
WHERE session_name ILIKE '%Table 5%';

-- Get sessions with notes
SELECT * FROM table_sessions
WHERE notes IS NOT NULL
  AND notes != '';
```

---

## ✅ TESTING THE FIX

### **Test 1: Start New Session**

1. Open app as waiter
2. Select a table
3. Enter customer info (or choose guest)
4. Enter session name: "Test Lunch"
5. Click "Start Session & Add Items"

**Expected Result:**
✅ Session created successfully  
✅ No "missing column" error  
✅ Navigates to menu screen

### **Test 2: Check Database**

In Supabase Dashboard → Table Editor → table_sessions:

Find your new session and verify:
- ✅ `session_name` = "Test Lunch"
- ✅ `notes` = "Created by waiter for..."
- ✅ `user_id` = UUID (if existing customer) or NULL (if guest)

### **Test 3: Query Sessions**

Run in SQL Editor:
```sql
SELECT session_name, notes, user_id, customer_name
FROM table_sessions
WHERE status = 'active'
ORDER BY started_at DESC;
```

Should return your active sessions with all columns populated.

---

## 🆘 TROUBLESHOOTING

### **"Column still not found after running SQL"**

**Cause:** Supabase schema cache needs refresh

**Fix:**
```bash
# Stop dev server
Ctrl+C

# Clear node_modules/.vite cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

### **"Foreign key constraint error on user_id"**

**Cause:** Trying to insert invalid user_id

**Fix:** Ensure user_id exists in profiles table:
```sql
-- Check if user exists
SELECT id FROM profiles WHERE id = 'YOUR-USER-ID';

-- If doesn't exist, either:
-- 1. Create the user first
-- OR
-- 2. Set user_id to NULL for guest customers
```

### **"Session name not showing in UI"**

**Cause:** UI components not reading the new column

**Fix:** Update components to use `session_name`:
```typescript
// In your display components
<h3>{session.session_name || `Table ${session.table_id}`}</h3>
```

---

## 📝 ALTERNATIVE APPROACH

If you don't want to add these columns, you need to **remove them from the INSERT**:

### **Edit `session-start-screen.tsx`:**

```typescript
// REMOVE these lines:
session_name: sessionName.trim(),      // ❌ Delete
notes: `Created by waiter...`,         // ❌ Delete
user_id: userId || null,               // ❌ Delete

// Keep only existing columns:
const { data: session, error } = await supabase
  .from('table_sessions')
  .insert({
    table_id: tableId,
    customer_name: fullName || sessionName.trim(),
    customer_email: email || null,
    customer_phone: phoneNumber || null,
    status: 'active',
    payment_status: 'pending',
    total_amount: 0,
    started_at: new Date().toISOString()
  })
```

**But this breaks the intended functionality**, so **adding columns is RECOMMENDED**.

---

## 🎉 VERIFICATION CHECKLIST

After applying fix:

- [ ] SQL script executed successfully in Supabase
- [ ] Columns visible in Table Editor
- [ ] Can start new session without errors
- [ ] Session name saved correctly
- [ ] Notes field populated
- [ ] User_id linked (for registered customers)
- [ ] Menu screen loads after session start
- [ ] Can add items to session
- [ ] Can view session details with all fields

---

## 📚 RELATED FILES

- [`ADD_NOTES_COLUMN_TO_TABLE_SESSIONS.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/ADD_NOTES_COLUMN_TO_TABLE_SESSIONS.sql) - SQL script to add columns
- [`session-start-screen.tsx`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/src/pages/waiter/session-start-screen.tsx) - Code that uses these columns
- [`phase-1-database-migration.sql`](file:///c:/Users/ANSH/OneDrive/Desktop/Restaurant%20Management%20Mobile%20UI/phase-1-database-migration.sql#L59-L73) - Original table creation

---

## 💡 WHY THIS HAPPENED

The code was written expecting certain columns to exist, but:
1. Database migrations weren't fully applied
2. OR code was updated after initial schema design
3. OR different developers worked on schema vs code

**Best Practice:** Always keep database schema and code in sync by:
- Running migration scripts immediately after code changes
- Using version control for SQL files
- Testing inserts/updates after schema changes

---

**Status:** ✅ **FIX READY** - Just run the SQL script!  
**Last Updated:** March 14, 2026
