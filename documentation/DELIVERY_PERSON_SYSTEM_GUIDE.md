# Complete Delivery Person System Implementation Guide

## Overview
This guide explains the complete delivery person management system with automatic order assignment.

## Database Schema

### 1. Delivery Personnel Table
**Location:** `CREATE_DELIVERY_PERSONNEL_TABLE.sql`

**Purpose:** Stores delivery person availability and duty status separately from profiles.

**Columns:**
- `id` - Primary key
- `profile_id` - Links to profiles table (unique)
- `is_available` - Whether free to take new orders
- `is_on_duty` - Whether currently on shift
- `current_order_id` - Current order being delivered (NULL if free)
- `rating` - Delivery person rating (default 5.00)
- `total_deliveries` - Total completed deliveries
- `created_at`, `updated_at` - Timestamps

### 2. Key Functions

#### `assign_order_to_delivery(p_order_id UUID)`
**Purpose:** Automatically assigns an order to the nearest available delivery person.

**Logic:**
1. Gets order location from orders table
2. Finds available delivery persons (is_available=TRUE, is_on_duty=TRUE, current_order_id=NULL)
3. Selects randomly (can be enhanced with distance calculation)
4. Updates order with delivery_person_id and status='out_for_delivery'
5. Updates delivery_personnel to mark as unavailable
6. Creates record in delivery_assignments table

**Returns:** UUID of assigned delivery person (or NULL if none available)

#### `trigger_auto_assign_delivery()`
**Purpose:** Trigger function that automatically calls assignment when order status changes to 'prepared'.

**Trigger:** Fires AFTER UPDATE on orders table when status becomes 'prepared'

#### `complete_delivery_and_free_person(p_order_id UUID)`
**Purpose:** Marks delivery as complete and frees up the delivery person.

**Actions:**
1. Updates order status to 'delivered'
2. Sets delivered_at timestamp
3. Marks delivery person as available again
4. Increments total_deliveries counter
5. Clears current_order_id

#### `update_delivery_person_status(p_is_available, p_is_on_duty)`
**Purpose:** Helper function for delivery persons to update their status.

**Usage:** Called from mobile app when toggling availability/duty switches.

**Security:** SECURITY DEFINER - can modify delivery_personnel even without direct table access.

### 3. Views

#### `available_delivery_persons`
**Purpose:** Quick view of all available delivery persons for dashboard/admin use.

**Shows:** Profile info, availability status, current order, rating, total deliveries.

## Mobile App Integration

### Delivery Tasks Screen Updates

#### Loading Profile (Line ~147)
```typescript
async function loadDeliveryProfile() {
  // Loads from delivery_personnel instead of profiles
  const { data } = await supabase
    .from('delivery_personnel')
    .select('is_available, is_on_duty')
    .eq('profile_id', user.id)
    .single();
  
  // Creates initial record if doesn't exist
  if (!data) {
    await supabase.rpc('update_delivery_person_status', {
      p_is_available: true,
      p_is_on_duty: false
    });
  }
}
```

#### Toggle Availability (Line ~215)
```typescript
async function toggleAvailability() {
  const newStatus = !isAvailable;
  
  // Use RPC function for atomic update
  await supabase.rpc('update_delivery_person_status', {
    p_is_available: newStatus,
    p_is_on_duty: isOnDuty
  });
  
  setIsAvailable(newStatus);
}
```

#### Toggle Duty (Line ~234)
```typescript
async function toggleDuty() {
  const newStatus = !isOnDuty;
  
  await supabase.rpc('update_delivery_person_status', {
    p_is_available: isAvailable,
    p_is_on_duty: newStatus
  });
  
  setIsOnDuty(newStatus);
}
```

## Order Flow

### 1. Order Placed → Preparing
- Chef sees order in "Pending" section
- Clicks "Start Preparing"
- Order moves to "Preparing" section

### 2. Order Prepared → Auto-Assignment
- Chef clicks "Ready to Serve"
- **TRIGGER FIRES:** `auto_assign_delivery_trigger`
- **FUNCTION CALLS:** `assign_order_to_delivery(order_id)`
- **RESULT:**
  - Order gets assigned to available delivery person
  - Order status changes to 'out_for_delivery'
  - Delivery person gets notification (via real-time subscription)
  - Delivery person appears in "Tasks" screen

### 3. Delivery Person Picks Up
- Delivery person sees order in "Active Orders"
- Clicks "Pickup Order"
- Order status updates to 'out_for_delivery'

### 4. Delivery Complete
- Delivery person clicks "Complete Delivery"
- **FUNCTION CALLS:** `complete_delivery_and_free_person(order_id)`
- **RESULT:**
  - Order status changes to 'delivered'
  - Delivery person marked as available again
  - total_deliveries counter increments

## Automatic Assignment Logic

### Current Implementation (Random Selection)
```sql
SELECT dp.profile_id
FROM delivery_personnel dp
WHERE dp.is_available = TRUE 
  AND dp.is_on_duty = TRUE
  AND dp.current_order_id IS NULL
ORDER BY RANDOM()
LIMIT 1;
```

### Enhanced Implementation (Distance-Based)
Future enhancement to select nearest delivery person:
```sql
-- Calculate distance using Haversine formula
SELECT dp.profile_id,
       (6371 * acos(
         cos(radians(order_lat)) * cos(radians(dp.latitude)) *
         cos(radians(dp.longitude) - radians(order_lon)) +
         sin(radians(order_lat)) * sin(radians(dp.latitude))
       )) AS distance
FROM delivery_personnel dp
WHERE dp.is_available = TRUE 
  AND dp.is_on_duty = TRUE
  AND dp.current_order_id IS NULL
ORDER BY distance ASC
LIMIT 1;
```

## RLS Policies

### Delivery Personnel Table Policies

1. **SELECT:** Anyone can view (needed for order assignment)
   ```sql
   CREATE POLICY "Anyone can view delivery personnel"
   ON delivery_personnel FOR SELECT
   USING (true);
   ```

2. **UPDATE:** Only own profile
   ```sql
   CREATE POLICY "Delivery persons can update own status"
   ON delivery_personnel FOR UPDATE
   USING (auth.uid() = profile_id);
   ```

3. **INSERT:** Only own profile
   ```sql
   CREATE POLICY "Users can insert own delivery profile"
   ON delivery_personnel FOR INSERT
   WITH CHECK (auth.uid() = profile_id);
   ```

## Testing Checklist

### Setup
1. Run `CREATE_DELIVERY_PERSONNEL_TABLE.sql` in Supabase SQL Editor
2. Verify table created with all columns
3. Verify RLS policies are active
4. Verify trigger exists on orders table

### Delivery Person Status
1. Login as delivery person
2. Toggle "Available" switch - verify database updates
3. Toggle "On Duty" switch - verify database updates
4. Check both switches work independently

### Order Assignment
1. Create a delivery order
2. As chef, mark order as "Prepared"
3. Verify order automatically gets assigned to delivery person
4. Check delivery_personnel.current_order_id is set
5. Check order.delivery_person_id is populated
6. Check order.status changed to 'out_for_delivery'

### Delivery Completion
1. As delivery person, click "Complete Delivery"
2. Verify order status = 'delivered'
3. Verify delivery person is available again
4. Verify total_deliveries incremented by 1

### Edge Cases
1. No delivery persons available → order stays unassigned
2. All delivery persons busy → order waits in queue
3. Delivery person goes off duty while delivering → finishes current order first
4. Multiple orders prepared simultaneously → each gets assigned to different person

## Admin Dashboard Features

### View Available Delivery Persons
```sql
SELECT * FROM available_delivery_persons;
```

### Manual Override
Admin can manually assign orders if needed:
```sql
-- Free up delivery person manually
UPDATE delivery_personnel 
SET is_available = TRUE, current_order_id = NULL
WHERE profile_id = 'xxx';

-- Assign order manually
SELECT assign_order_to_delivery('order-uuid');
```

## Future Enhancements

1. **Distance-based assignment** using GPS coordinates
2. **Load balancing** - distribute orders evenly among delivery persons
3. **Priority assignment** - higher rated delivery persons get preference
4. **Shift scheduling** - scheduled on-duty times
5. **Performance tracking** - average delivery time, customer ratings
6. **Batch deliveries** - assign multiple nearby orders to same person

## Troubleshooting

### Orders Not Auto-Assigning
1. Check trigger exists: `\d orders` in psql
2. Verify delivery persons have is_available=TRUE and is_on_duty=TRUE
3. Check no NULL current_order_id (means they're free)
4. Review logs: `SELECT * FROM logs WHERE message LIKE '%assign%'`

### Toggle Switches Not Working
1. Verify RLS policies allow updates
2. Check RPC function exists: `\df update_delivery_person_status`
3. Ensure user is authenticated as delivery person
4. Check browser console for errors

### Delivery Person Not Freed After Delivery
1. Verify complete_delivery_and_free_person function works
2. Check trigger fires on order completion
3. Ensure order status actually changes to 'delivered'

## Migration Notes

### From Old System (profiles.is_available/is_on_duty)
If migrating from old system where these fields were in profiles:

```sql
-- Migrate existing data
INSERT INTO delivery_personnel (profile_id, is_available, is_on_duty)
SELECT id, is_available, is_on_duty
FROM profiles
WHERE role = 'delivery';

-- Remove old columns (optional, after testing)
ALTER TABLE profiles 
DROP COLUMN IF EXISTS is_available,
DROP COLUMN IF EXISTS is_on_duty;
```

## Performance Considerations

1. **Indexing:** Created indexes on (is_available, is_on_duty) for fast filtering
2. **Real-time:** Uses Supabase real-time subscriptions for instant updates
3. **Caching:** Consider caching available delivery persons list (5 min TTL)
4. **Connection pooling:** RPC functions use efficient connection handling

## Security

- Delivery persons can only update their own status
- Order assignment happens server-side (secure)
- Location tracking requires user permission
- All sensitive operations logged for audit
