# 📊 SESSION START COMPARISON - Customer vs Waiter Flow

## 🔍 DETAILED ANALYSIS

---

## ✅ **CUSTOMER SESSION START** (Reference Implementation)

### **File:** `src/pages/customer/checkout-screen.tsx` (Lines 195-285)

### **Trigger:** Customer clicks "Start Session" at checkout

### **Data Flow:**

```typescript
// 1. Create dine_in_sessions record
const { data: session, error: sessionError } = await supabase
  .from('dine_in_sessions')
  .insert({
    table_id: tableId,                    // Selected table
    user_id: user.id,                     // Logged-in customer's ID
    session_status: 'active',             // Session is active
    payment_status: 'pending',            // Payment pending
    total_amount: totalAmount,            // Cart total
    paid_amount: 0,                       // Nothing paid yet
    session_name: sessionName.trim(),     // Custom name (e.g., "Lunch with Friends")
    notes: `Session: ${sessionName.trim()}`  // Auto-generated note
  })
  .select('id, session_name, table_id')
  .single();

// 2. Create orders record (linked to session)
const { data: order, error: orderError } = await supabase
  .from('orders')
  .insert({
    user_id: user.id,
    order_type: 'dine_in',
    table_id: tableId,
    total_amount: totalAmount,
    status: 'placed',
    payment_status: 'pending',
    payment_method: 'cod',
    is_paid: false,
    placed_by: 'customer',
    notes: `Dine-in Session: ${sessionId}`,  // Link to session via ID
    session_name: sessionName.trim()          // Also store name for easy lookup
  })
  .select()
  .single();

// 3. Create order_items records
const orderItemsData = cartItems.map(item => ({
  order_id: order.id,
  menu_item_id: item.menu_item_id,
  name: item.name,
  quantity: item.quantity,
  price: item.price,
  image: item.image || ''
}));

await supabase
  .from('order_items')
  .insert(orderItemsData);

// 4. Update restaurant_tables status
await supabase
  .from('restaurant_tables')
  .update({ 
    status: 'occupied' 
  })
  .eq('id', tableId);
```

### **Database Tables Triggered:**

| Order | Table | Action | Purpose |
|-------|-------|--------|---------|
| 1 | `dine_in_sessions` | INSERT | Create session record |
| 2 | `orders` | INSERT | Create first order linked to session |
| 3 | `order_items` | INSERT | Add items to the order |
| 4 | `restaurant_tables` | UPDATE | Mark table as occupied |

### **Data Sent to `dine_in_sessions`:**

| Field | Value | Required? | Notes |
|-------|-------|-----------|-------|
| `table_id` | UUID | ✅ Yes | From table selection |
| `user_id` | UUID | ✅ Yes | Authenticated user's ID |
| `session_status` | `'active'` | ✅ Yes | Always 'active' on start |
| `payment_status` | `'pending'` | ✅ Yes | Will change when paying |
| `total_amount` | Number | ✅ Yes | Current cart total |
| `paid_amount` | `0` | ✅ Yes | Starting at zero |
| `session_name` | String | ✅ Yes | User-entered name |
| `notes` | String | ✅ Yes | Auto-generated note |
| `started_at` | Timestamp | ⚠️ Auto | DEFAULT: now() |
| `created_at` | Timestamp | ⚠️ Auto | DEFAULT: now() |
| `updated_at` | Timestamp | ⚠️ Auto | DEFAULT: now() |

---

## ❌ **WAITER SESSION START** (Current Broken Implementation)

### **File:** `src/pages/waiter/session-start-screen.tsx` (Lines 55-68)

### **Current Code:**

```typescript
const { data: session, error } = await supabase
  .from('table_sessions')
  .insert({
    table_id: tableId,
    user_id: userId || null,              // May be null for guests
    session_name: sessionName.trim(),
    status: 'active',
    payment_status: 'pending',
    total_amount: 0,                      // ⚠️ Starts at 0 (no order yet)
    started_at: new Date().toISOString(),
    notes: `Created by waiter for ${customerType} customer` + 
           (email ? ` - ${email}` : '')
  })
  .select()
  .single();
```

### **Problems:**

1. ❌ **Missing columns in `table_sessions`:**
   - `session_name` doesn't exist
   - `notes` doesn't exist
   - `user_id` doesn't exist

2. ❌ **Different table used:**
   - Customer uses: `dine_in_sessions`
   - Waiter uses: `table_sessions`

3. ❌ **No initial order created:**
   - Customer flow creates order immediately
   - Waiter flow creates session only (will add orders later)

---

## ✅ **SOLUTION - Align Both Flows**

### **Option A: Use SAME Table (`dine_in_sessions`) for Both**

**Recommended** - Single source of truth for all sessions.

#### **Update Waiter Code to Match Customer Pattern:**

```typescript
// File: src/pages/waiter/session-start-screen.tsx

const handleStartSession = async () => {
  if (!sessionName.trim()) {
    alert('Please enter a session name');
    return;
  }

  setLoading(true);
  try {
    // ✅ Use dine_in_sessions (same as customer flow)
    const { data: session, error } = await supabase
      .from('dine_in_sessions')
      .insert({
        table_id: tableId,
        user_id: userId || auth.uid(),  // Use current waiter's ID if no customer
        session_status: 'active',       // ✅ Match customer field name
        payment_status: 'pending',
        total_amount: 0,                // No orders yet
        paid_amount: 0,
        session_name: sessionName.trim(),
        notes: `Waiter-created session for ${customerType} customer` + 
               (email ? ` - ${email}` : '') +
               (fullName ? ` - ${fullName}` : ''),
        // Optional: Track who created it
        // created_by: profile?.id,  // Would need new column
      })
      .select('id, session_name, table_id')
      .single();

    if (error) throw error;

    // ✅ Update table status (same as customer flow)
    await supabase
      .from('restaurant_tables')
      .update({
        status: 'occupied',
        occupied_at: new Date().toISOString(),
        occupied_by_customer_name: fullName || sessionName.trim(),
        occupied_by_customer_email: email || null,
        current_session_id: session.id  // ✅ Link to session
      })
      .eq('id', tableId);

    alert('✅ Session started successfully!');

    // ✅ Navigate to menu to add items
    navigate(`/waiter/session/${session.id}/menu`, {
      state: {
        sessionId: session.id,
        tableId: tableId,
        customerType: customerType,
        userId: userId,
        sessionName: sessionName.trim()
      }
    });

  } catch (error: any) {
    console.error('Error starting session:', error);
    alert('❌ Failed to start session: ' + error.message);
  } finally {
    setLoading(false);
  }
};
```

---

### **Option B: Keep Separate Tables But Sync Them**

Use trigger to auto-create `table_sessions` when `dine_in_sessions` created.

#### **SQL Trigger (Already exists in your codebase):**

From `INTEGRATE_TABLE_SESSIONS.sql`:

```sql
CREATE OR REPLACE FUNCTION create_table_session_on_dine_in_session()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.table_sessions (
    table_id,
    customer_name,
    customer_email,
    customer_phone,
    started_at,
    status,
    payment_status,
    total_amount
  ) VALUES (
    NEW.table_id,
    (SELECT full_name FROM profiles WHERE id = NEW.user_id),
    (SELECT email FROM profiles WHERE id = NEW.user_id),
    (SELECT phone_number FROM profiles WHERE id = NEW.user_id),
    NEW.started_at,
    'active',
    NEW.payment_status,
    NEW.total_amount
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trg_create_table_session
  AFTER INSERT ON dine_in_sessions
  FOR EACH ROW
  EXECUTE FUNCTION create_table_session_on_dine_in_session();
```

**With this approach:**
- Waiter creates `dine_in_sessions` record
- Trigger automatically creates matching `table_sessions` record
- Both tables stay in sync
- Table occupancy tracked in `restaurant_tables.current_session_id`

---

## 🎯 **RECOMMENDED IMPLEMENTATION**

### **Step 1: Add Missing Columns to `table_sessions`**

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS session_name TEXT;

ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE table_sessions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON table_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_name ON table_sessions(session_name);

-- Add comments
COMMENT ON COLUMN table_sessions.session_name IS 'Custom session name';
COMMENT ON COLUMN table_sessions.notes IS 'Special instructions or notes';
COMMENT ON COLUMN table_sessions.user_id IS 'Link to user account (NULL for guests)';
```

### **Step 2: Update Waiter Session Start Screen**

Edit `src/pages/waiter/session-start-screen.tsx` lines 55-68:

```typescript
// ✅ CHANGE TO MATCH CUSTOMER FLOW
const { data: session, error } = await supabase
  .from('dine_in_sessions')  // ✅ Use same table as customer
  .insert({
    table_id: tableId,
    user_id: userId || null,
    session_status: 'active',      // ✅ Match customer field
    payment_status: 'pending',
    total_amount: 0,
    paid_amount: 0,
    session_name: sessionName.trim(),
    notes: `Waiter-created for ${customerType} customer` + 
           (email ? ` - ${email}` : '') +
           (fullName ? ` - ${fullName}` : ''),
  })
  .select('id, session_name, table_id')
  .single();
```

### **Step 3: Enable Auto-Sync Trigger**

Run the trigger SQL from Option B above to keep both tables synced.

---

## 📊 **FINAL DATA FLOW COMPARISON**

### **Customer Creates Session:**

```
Customer → dine_in_sessions INSERT
    ↓
orders INSERT (with first order)
    ↓
order_items INSERT
    ↓
restaurant_tables UPDATE (status: occupied)
    ↓
Trigger: table_sessions INSERT (auto-sync)
```

### **Waiter Creates Session:**

```
Waiter → dine_in_sessions INSERT
    ↓
restaurant_tables UPDATE (status: occupied)
    ↓
Trigger: table_sessions INSERT (auto-sync)
    ↓
Later: orders INSERT (when waiter adds items)
```

---

## ✅ **BENEFITS OF THIS APPROACH**

1. ✅ **Single Source of Truth:** Both flows use `dine_in_sessions`
2. ✅ **Consistent Data:** Same fields, same validation
3. ✅ **Automatic Sync:** Trigger keeps `table_sessions` updated
4. ✅ **Flexibility:** Can query either table based on use case
5. ✅ **Backwards Compatible:** Existing queries still work

---

## 🧪 **TESTING CHECKLIST**

After implementation:

- [ ] Customer can start session at checkout
- [ ] Waiter can start session from dashboard
- [ ] Both create records in `dine_in_sessions`
- [ ] Trigger creates matching `table_sessions` records
- [ ] Table status updates to "occupied"
- [ ] Session appears in admin dashboard
- [ ] Can add orders to both session types
- [ ] Payment tracking works for both

---

## 📝 **KEY LEARNINGS**

### **What We Discovered:**

1. **Customer flow** creates session + order together
2. **Waiter flow** creates session first, orders later
3. Both should use **same underlying table** (`dine_in_sessions`)
4. **`table_sessions`** is redundant but useful for reporting
5. **Triggers** can keep both in sync automatically

### **Best Practice:**

Always use **the same base table** for the same entity, even if different UI flows create them. Use triggers or database functions to handle special cases.

---

**Status:** ✅ Ready to implement  
**Last Updated:** March 14, 2026
