# 🎯 Complete Dine-In Session System - Implementation Guide

## ✅ Phase 1: Database Schema (DONE)

### File Created:
[`CREATE_DINE_IN_SESSIONS_TABLE.sql`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\CREATE_DINE_IN_SESSIONS_TABLE.sql)

**Run this SQL in Supabase SQL Editor first!**

This creates:
- `dine_in_sessions` table
- RLS policies for customers and staff
- Indexes for performance
- Auto-update triggers

---

## ✅ Phase 2: Checkout Logic (DONE)

### File Modified:
[`src/pages/customer/checkout-screen.tsx`](file://c:\Users\ANSH\OneDrive\Desktop\Restaurant%20Management%20Mobile%20UI\src\pages\customer\checkout-screen.tsx)

**Added:**
- Dine-in pay-later session creation logic
- Automatic order linking to sessions
- Table status updates

---

## ⏳ Phase 3: UI Components (TODO)

### A. Payment Timing Selection UI

Add this to checkout screen **AFTER** payment method selection section:

```tsx
{/* Dine-In Payment Timing */}
{orderType === 'dine_in' && (
  <Card className="mt-4">
    <CardBody className="p-4">
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <UtensilsCrossed className="w-5 h-5" />
        When to Pay?
      </h2>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Pay Now Option */}
        <button
          onClick={() => setPaymentTiming('now')}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            paymentTiming === 'now' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-border hover:border-blue-300'
          }`}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              paymentTiming === 'now' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pay Now</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Pay before food arrives
              </p>
            </div>
            {paymentTiming === 'now' && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </button>

        {/* Pay Later Option */}
        <button
          onClick={() => setPaymentTiming('later')}
          className={`w-full p-4 rounded-lg border-2 transition-all ${
            paymentTiming === 'later' 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-border hover:border-purple-300'
          }`}
        >
          <div className="flex flex-col items-center text-center gap-2">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              paymentTiming === 'later' ? 'bg-purple-500 text-white' : 'bg-gray-200'
            }`}>
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Pay Later</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Pay after finishing
              </p>
            </div>
            {paymentTiming === 'later' && (
              <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* Info Message */}
      {paymentTiming === 'now' ? (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 font-medium">
            💳 You'll pay immediately via UPI/Cash
          </p>
        </div>
      ) : (
        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs text-purple-800 font-medium">
            🍽️ Order now, pay when you're done eating
          </p>
          <p className="text-xs text-purple-700 mt-1">
            Your orders will be tracked in "Dine-In Sessions"
          </p>
        </div>
      )}
    </CardBody>
  </Card>
)}
```

### B. Update Submit Button Text

```tsx
<Button
  onClick={handlePlaceOrder}
  disabled={loading || !orderType || (orderType === 'dine_in' && !tableId)}
  className="w-full h-14 text-lg font-semibold"
>
  {loading ? (
    'Processing...'
  ) : orderType === 'dine_in' ? (
    paymentTiming === 'now' 
      ? `Pay ₹${calculateTotal()} Now`
      : `Start Session (Pay Later)`
  ) : orderType === 'delivery' ? (
    `Pay ₹${calculateTotal()} for Delivery`
  ) : (
    'Select Order Type to Continue'
  )}
</Button>
```

---

## ⏳ Phase 4: Customer Orders Page - Show Sessions

### Create New Component: `DineInSessionsList.tsx`

```tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardBody } from '@/components/design-system/card';
import { Badge } from '@/components/design-system/badge';
import { Button } from '@/components/design-system/button';
import { UtensilsCrossed, Clock, CheckCircle, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';

export function DineInSessionsList() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();

    // Real-time subscription
    const channel = supabase
      .channel('dine-in-sessions')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'dine_in_sessions' },
        () => fetchSessions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchSessions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('dine_in_sessions')
        .select(`
          *,
          restaurant_tables (table_number),
          orders (
            id,
            order_items (
              name,
              quantity,
              price
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('session_status', 'active')
        .order('started_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePayNow(sessionId: string) {
    // Navigate to payment page for this session
    navigate(`/customer/payment/session/${sessionId}`);
  }

  if (sessions.length === 0) {
    return null; // Don't show anything if no active sessions
  }

  return (
    <div className="space-y-4 mb-6">
      <h2 className="text-xl font-black flex items-center gap-2">
        <UtensilsCrossed className="w-6 h-6 text-purple-600" />
        Active Dine-In Sessions
      </h2>

      {sessions.map(session => (
        <Card key={session.id} className="border-purple-200 bg-purple-50/30">
          <CardBody className="p-4">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg">
                  Table {session.restaurant_tables?.table_number}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Started: {new Date(session.started_at).toLocaleString()}
                </p>
              </div>
              <Badge variant="warning">
                <Clock className="w-3 h-3 mr-1" />
                {session.payment_status.toUpperCase()}
              </Badge>
            </div>

            {/* Items Ordered */}
            <div className="bg-white p-3 rounded-lg mb-3">
              <h4 className="font-bold text-sm mb-2">Items Ordered:</h4>
              <div className="space-y-1">
                {session.orders?.flatMap((order: any) => 
                  order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        <span className="font-bold">x{item.quantity}</span> {item.name}
                      </span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total & Actions */}
            <div className="flex justify-between items-center pt-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-black text-purple-600">
                  ₹{session.total_amount}
                </p>
              </div>
              
              {session.payment_status === 'pending' ? (
                <Button
                  onClick={() => handlePayNow(session.id)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <IndianRupee className="w-4 h-4 mr-2" />
                  Pay Now
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold">Paid</span>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
```

### Add to Orders Screen:

```tsx
// In customer/orders-screen.tsx
import { DineInSessionsList } from '@/components/dine-in-sessions-list';

export function CustomerOrders() {
  return (
    <div>
      <AppHeader title="My Orders" />
      
      <div className="px-4 py-4">
        {/* Show Active Dine-In Sessions First */}
        <DineInSessionsList />

        {/* Regular Orders List */}
        {/* ... existing orders code ... */}
      </div>
    </div>
  );
}
```

---

## ⏳ Phase 5: Waiter Integration

### Create Waiter Page Component

File: `src/pages/waiter/waiter-table-sessions.tsx`

```tsx
// Waiters can see all active sessions at their assigned tables
// Similar structure to above but shows all tables, not just user's
```

---

## 📊 Database Flow Diagram

```
Customer Places Dine-In Order (Pay Later)
         ↓
Create dine_in_sessions record
├─ table_id
├─ user_id  
├─ total_amount
└─ status: 'active'
         ↓
Create orders record (linked to session)
├─ session_id in notes
├─ items in order_items
└─ status: 'placed'
         ↓
Customer can view session in Orders page
         ↓
When ready to pay → Click "Pay Now"
         ↓
Navigate to payment page
         ↓
Complete payment
         ↓
Update session: payment_status = 'paid'
Update orders: is_paid = true
         ↓
Session marked as completed
```

---

## 🎯 Testing Checklist

### Test Dine-In Pay Later Flow:
- [ ] Run SQL script to create `dine_in_sessions` table
- [ ] Add payment timing UI to checkout
- [ ] Select "Dine-In" order type
- [ ] Select "Pay Later" option
- [ ] Place order
- [ ] Should create session in database
- [ ] Should redirect to Orders page
- [ ] Should see session card with items
- [ ] "Pay Now" button should be visible

### Test Multiple Orders in Same Session:
- [ ] Customer orders again from same table
- [ ] Should add to existing session (or create new?)
- [ ] Both orders visible in session card
- [ ] Total amount updates correctly

### Test Payment:
- [ ] Click "Pay Now" from session card
- [ ] Navigate to payment page
- [ ] Complete UPI payment
- [ ] Session shows "Paid" status
- [ ] Order payment_status updates to 'paid'

---

## 📝 Next Steps

1. **Run SQL Script** - Create `dine_in_sessions` table
2. **Add Payment Timing UI** - Copy code from Phase 3A
3. **Create Sessions List Component** - Phase 4 component
4. **Add to Orders Page** - Integrate sessions display
5. **Test End-to-End** - Full flow testing
6. **Waiter Integration** - Optional enhancement

---

**Ready to implement? Start by running the SQL script in Supabase!** 🚀
