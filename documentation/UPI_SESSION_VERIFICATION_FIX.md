# 🐛 UPI Session Payment Verification Fix

## Problem Identified

When admin verifies a UPI payment for a dine-in session:
1. ✅ UPI payment record gets marked as "verified" 
2. ✅ Session payment_status gets updated to "paid"
3. ✅ Session session_status gets updated to "completed"
4. ❌ **BUT user still sees session as "active"**

---

## Root Cause Analysis

### Issue 1: Error Handling Logic
**File:** `src/lib/upi-payment.ts` (Lines 202-247)

```typescript
try {
  // Try to update orders table first
  const { error: orderError } = await supabase
    .from('orders')
    .update({ /* ... */ })
    .eq('id', upiPayment.order_id);

  if (orderError) {
    console.log('Order update failed:', orderError.message);
    console.log('Trying to update dine_in_sessions instead...');
    
    // Update dine_in_sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from('dine_in_sessions')
      .update({ /* ... */ })
      .eq('id', upiPayment.order_id)
      .select();
    
    if (sessionError) {
      console.error('Session update failed:', sessionError.message);
      // Continue anyway
    } else {
      console.log('✅ Session payment updated successfully:', sessionData);
    }
  }
} catch (orderUpdateError: any) {
  console.error('Error in order update logic:', orderUpdateError.message);
  // ⚠️ CONTINUES ANYWAY - UPI payment already verified
}
```

**Problem:** The outer try-catch silently swallows errors, making debugging difficult.

---

### Issue 2: Real-Time Subscription Not Updating UI
**File:** `src/pages/customer/orders-screen.tsx` (presumed)

The user's orders screen likely has a real-time subscription to `dine_in_sessions`, but it may not be properly handling updates.

**Common Issues:**
1. Subscription not listening to UPDATE events
2. Local state not being updated when payload received
3. Query filters excluding the updated session
4. Cache not being invalidated

---

### Issue 3: Missing Trigger for Auto-Complete
Based on verification checklist result #3 ("Success. No rows returned"), there's **no trigger** on `dine_in_sessions` table to auto-update `session_status` when `payment_status` changes to 'paid'.

**Expected:** When `payment_status = 'paid'`, trigger should auto-set:
- `session_status = 'completed'`
- `completed_at = NOW()`
- `payment_completed_at = NOW()`

**Actual:** These fields might not be updating automatically.

---

## Solution

### Part 1: Improve verifyUPIPayment() Error Handling

**File:** `src/lib/upi-payment.ts`

```typescript
export const verifyUPIPayment = async (
  qrId: string,
  adminId: string,
  notes?: string
) => {
  try {
    const { data: upiPayment, error: fetchError } = await supabase
      .from('upi_payments')
      .select('*')
      .eq('id', qrId)
      .single();

    if (fetchError) throw fetchError;

    console.log('Verifying payment:', upiPayment);

    // Step 1: Update UPI payment status
    const { data: updatedUPI, error: updateError } = await supabase
      .from('upi_payments')
      .update({
        status: 'verified',
        verified_by: adminId,
        verified_at: new Date().toISOString(),
        verification_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', qrId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update UPI payment:', updateError);
      throw updateError;
    }

    console.log('✅ UPI payment marked as verified:', updatedUPI);

    // Step 2: Determine if this is an ORDER or SESSION payment
    // Check if order_id exists in orders table
    const { data: orderCheck } = await supabase
      .from('orders')
      .select('id')
      .eq('id', upiPayment.order_id)
      .single();

    if (orderCheck) {
      // This is an ORDER payment
      console.log('📦 Updating ORDER payment:', upiPayment.order_id);
      
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_id: upiPayment.transaction_id,
          paid_at: new Date().toISOString(),
          is_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', upiPayment.order_id);

      if (orderError) {
        console.error('Failed to update order:', orderError);
        throw new Error(`Order update failed: ${orderError.message}`);
      }
      
      console.log('✅ Order payment updated successfully');
      
    } else {
      // This is a SESSION payment
      console.log('🍽️ Updating DINE-IN SESSION payment:', upiPayment.order_id);
      
      const { data: sessionData, error: sessionError } = await supabase
        .from('dine_in_sessions')
        .update({
          payment_status: 'paid',
          payment_method: 'upi',
          paid_amount: upiPayment.amount,
          payment_completed_at: new Date().toISOString(),
          session_status: 'completed',  // Explicitly set completed
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', upiPayment.order_id)
        .select();
      
      if (sessionError) {
        console.error('Failed to update session:', sessionError);
        throw new Error(`Session update failed: ${sessionError.message}`);
      }
      
      console.log('✅ Session payment updated successfully:', sessionData);
      
      // Optional: Call RPC function to ensure orders are also updated
      try {
        const { error: rpcError } = await supabase.rpc('update_session_orders_paid', {
          p_session_id: upiPayment.order_id
        });
        
        if (rpcError) {
          console.warn('RPC function failed (non-critical):', rpcError.message);
        } else {
          console.log('✅ Session orders also updated via RPC');
        }
      } catch (rpcErr: any) {
        console.warn('RPC call skipped - orders will need manual update if needed');
      }
    }

    return {
      success: true,
      message: 'Payment verified successfully',
      type: orderCheck ? 'ORDER' : 'SESSION',
      updatedUPI
    };
    
  } catch (error: any) {
    console.error('❌ Error verifying UPI payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

**Changes:**
- ✅ Clear separation between ORDER vs SESSION logic
- ✅ Explicit error throwing for better debugging
- ✅ Detailed console logging at each step
- ✅ Calls RPC function to update related orders
- ✅ No silent error swallowing

---

### Part 2: Add Database Trigger for Auto-Complete

**File:** Create SQL migration

```sql
-- =====================================================
-- TRIGGER: Auto-complete session when payment is confirmed
-- =====================================================

-- Function to auto-update session status
CREATE OR REPLACE FUNCTION update_session_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when payment_status changes TO 'paid'
  IF NEW.payment_status = 'paid' 
     AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    
    NEW.session_status := 'completed';
    NEW.completed_at := timezone('utc'::text, now());
    NEW.payment_completed_at := timezone('utc'::text, now());
    
    RAISE NOTICE 'Session % auto-completed: payment_status=paid', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_session_status_on_payment ON dine_in_sessions;

-- Create trigger
CREATE TRIGGER trg_update_session_status_on_payment
  BEFORE UPDATE OF payment_status ON dine_in_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_status_on_payment();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Test the trigger
UPDATE dine_in_sessions 
SET payment_status = 'paid' 
WHERE id = 'YOUR-TEST-SESSION-ID';

-- Verify result
SELECT 
  id, 
  session_name, 
  payment_status, 
  session_status, 
  completed_at,
  payment_completed_at
FROM dine_in_sessions 
WHERE id = 'YOUR-TEST-SESSION-ID';

-- Expected:
-- payment_status = 'paid'
-- session_status = 'completed'
-- completed_at IS NOT NULL
-- payment_completed_at IS NOT NULL
```

---

### Part 3: Fix Real-Time Subscription in Orders Screen

**File:** `src/pages/customer/orders-screen.tsx`

Add or update the real-time subscription:

```typescript
useEffect(() => {
  if (!userId) return;

  // Fetch initial data
  fetchSessions();

  // Set up real-time subscription
  const channel = supabase
    .channel(`sessions-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',  // Listen to INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'dine_in_sessions',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('Real-time session update:', payload);
        
        // Refresh the sessions list
        fetchSessions();
        
        // Show toast notification for important updates
        if (payload.eventType === 'UPDATE') {
          const newStatus = payload.new.session_status;
          const oldStatus = payload.old?.session_status;
          
          if (newStatus !== oldStatus) {
            toast.info(`Session status updated: ${newStatus}`);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [userId]);
```

---

### Part 4: Admin Verification Screen Enhancement

**File:** `src/pages/admin/upi-verification-screen.tsx`

Add better feedback after verification:

```typescript
const handleVerify = async (paymentId: string, orderId: string) => {
  if (!currentUser) {
    toast.error('Admin authentication required');
    return;
  }

  if (!confirm('Verify this UPI payment?')) {
    return;
  }

  setVerifyingId(paymentId);

  try {
    console.log('Starting verification for:', paymentId);
    
    const result = await verifyUPIPayment(paymentId, currentUser.id);

    console.log('Verification result:', result);

    if (result.success) {
      toast.success(
        `✅ Payment verified! (${result.type}) - Session/Order updated`
      );
      
      // Force refresh the payments list
      await fetchUpiPayments();
    } else {
      toast.error(result.error || 'Failed to verify payment');
    }
  } catch (error: any) {
    console.error('Verification error:', error);
    toast.error(`❌ Verification failed: ${error.message}`);
  } finally {
    setVerifyingId(null);
  }
};
```

---

## Testing Checklist

### Test Case 1: UPI Session Payment Verification
```bash
1. Customer creates dine-in session
2. Customer selects UPI payment
3. Customer submits transaction ID
4. Admin goes to Payment Verification screen
5. Admin clicks "Verify Payment"
6. ✅ Toast shows: "Payment verified! (SESSION) - Session updated"
7. ✅ UPI payment status = 'verified'
8. ✅ Session payment_status = 'paid'
9. ✅ Session session_status = 'completed'
10. ✅ Customer sees session as "Completed" in their orders
```

### Test Case 2: Real-Time Update
```bash
1. Customer has active session with pending UPI payment
2. Admin verifies payment
3. ✅ Customer's screen updates within 2 seconds
4. ✅ Session moves from "Active" to "Completed" section
5. ✅ Status badge changes to "Completed"
```

### Test Case 3: Database Trigger
```bash
1. Run the trigger creation SQL
2. Create test session with payment_status='pending'
3. Manually update: UPDATE dine_in_sessions SET payment_status='paid' WHERE id='...'
4. ✅ Verify session_status automatically becomes 'completed'
5. ✅ Verify completed_at is automatically set
```

---

## Files to Modify

1. ✅ **`src/lib/upi-payment.ts`** - Improved verifyUPIPayment()
2. ✅ **Create SQL file** - Add auto-complete trigger
3. ✅ **`src/pages/customer/orders-screen.tsx`** - Fix real-time subscription
4. ✅ **`src/pages/admin/upi-verification-screen.tsx`** - Better feedback
5. ✅ **`src/pages/admin/payment-verification-screen.tsx`** - Ensure consistency

---

## Quick Fix Steps

### Immediate Actions:

1. **Run SQL Trigger** (5 minutes)
   ```bash
   - Open Supabase SQL Editor
   - Run the trigger creation SQL from Part 2
   - Test with a sample session
   ```

2. **Update verifyUPIPayment()** (10 minutes)
   ```bash
   - Replace function in src/lib/upi-payment.ts
   - Use the improved version above
   - Test verification flow
   ```

3. **Test End-to-End** (15 minutes)
   ```bash
   - Create session → Select UPI → Submit UTR → Admin verifies
   - Check all status updates
   - Verify customer sees correct status
   ```

---

## Success Criteria

After fixes:

✅ **Database:**
- Trigger auto-updates session_status to 'completed'
- Timestamps set automatically
- No manual intervention needed

✅ **Admin:**
- Clear success messages
- Knows if it's ORDER or SESSION
- Sees confirmation toast

✅ **Customer:**
- Real-time status updates
- Session shows as "Completed"
- No confusion about payment state

✅ **System:**
- Consistent behavior
- Proper error handling
- Detailed logging

---

## Debugging Commands

If issues persist:

```sql
-- Check session status
SELECT 
  id, 
  session_name, 
  payment_status, 
  session_status, 
  completed_at
FROM dine_in_sessions 
WHERE user_id = 'CUSTOMER-USER-ID'
ORDER BY started_at DESC;

-- Check UPI payment status
SELECT 
  id, 
  order_id, 
  status, 
  transaction_id,
  verified_at,
  verified_by
FROM upi_payments 
WHERE order_id = 'SESSION-ID'
ORDER BY created_at DESC;

-- Check triggers
SELECT tgname, tgenabled
FROM pg_trigger 
WHERE tgrelid = 'dine_in_sessions'::regclass;

-- Should show: trg_update_session_status_on_payment, enabled
```

---

**Priority:** HIGH  
**Impact:** Medium (affects user experience)  
**Estimated Time:** 30 minutes total
