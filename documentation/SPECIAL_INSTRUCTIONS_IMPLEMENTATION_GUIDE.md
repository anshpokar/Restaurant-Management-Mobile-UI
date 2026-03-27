# Special Instructions & Spice Level Implementation Guide

## Overview
This guide explains how to add special instructions and spice level selection to the ordering system for customers and waiters, with display in the chef dashboard.

## Database Changes

### 1. Run SQL Migration
**File:** `ADD_SPECIAL_INSTRUCTIONS_TO_ORDER_ITEMS.sql`

```sql
-- Add special_instructions and spice_level columns
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS special_instructions TEXT,
ADD COLUMN IF NOT EXISTS spice_level TEXT DEFAULT 'medium' CHECK (spice_level IN ('mild', 'medium', 'spicy', 'extra_spicy'));
```

**What it does:**
- Adds `special_instructions` column for custom requests (e.g., "no onions", "extra cheese")
- Adds `spice_level` column with validation: mild, medium, spicy, extra_spicy
- Default spice level is 'medium'
- Creates index on spice_level for kitchen filtering

## Application Changes

### 2. Cart Context Updates
**File:** `src/contexts/cart-context.tsx`

**Changes:**
- Updated `CartItem` interface to include:
  - `special_instructions?: string`
  - `spice_level?: 'mild' | 'medium' | 'spicy' | 'extra_spicy'`
- Modified `addToCart()` function to accept optional parameters:
  ```typescript
  addToCart(item: MenuItem, specialInstructions?: string, spiceLevel?: SpiceLevel)
  ```

### 3. Menu Screen UI (To Be Implemented)
**File:** `src/pages/customer/menu-screen.tsx`

**Required Changes:**
1. Replace direct `addToCart(item)` call with modal/dialog trigger
2. Show spice level selector with visual indicators:
   - 🌶️ Mild (green)
   - 🌶️🌶️ Medium (yellow/orange)
   - 🌶️🌶️🌶️ Spicy (red)
   - 🌶️🌶️🌶️🌶️ Extra Spicy (dark red)
3. Add text input for special instructions
4. Pass selections to cart when adding item

**Example UI Flow:**
```
User clicks "Add" → Modal opens → Select spice level + Add notes → Confirm → Item added to cart
```

### 4. Chef Dashboard Display
**File:** `src/pages/chef/chef-dashboard.tsx`

**Already configured!** The chef dashboard will automatically show:
- Spice level indicator (color-coded dots)
- Special instructions text

**Display Logic:**
```typescript
{item.spice_level && (
  <div className="flex items-center gap-1">
    <div className={`w-2 h-2 rounded-full ${
      item.spice_level === 'mild' ? 'bg-green-500' :
      item.spice_level === 'medium' ? 'bg-yellow-500' :
      item.spice_level === 'spicy' ? 'bg-orange-500' :
      'bg-red-500'
    }`} />
    <span className="text-xs capitalize">{item.spice_level}</span>
  </div>
)}

{item.special_instructions && (
  <p className="text-xs text-orange-600">
    📝 {item.special_instructions}
  </p>
)}
```

## Waiter Ordering System

The same functionality should be added to waiter ordering screens:
- `src/pages/waiter/ordering-screen.tsx` (if exists)
- `src/pages/waiter/session-management-screen.tsx`

Waiters can select spice level and add special instructions when placing orders for customers.

## Testing Checklist

### Database
- [ ] Run `ADD_SPECIAL_INSTRUCTIONS_TO_ORDER_ITEMS.sql` in Supabase
- [ ] Verify columns exist: `\d order_items` in psql
- [ ] Test spice_level constraint (try invalid value)

### Customer Flow
- [ ] Menu screen shows spice selector
- [ ] Special instructions text area works
- [ ] Cart items retain spice/instructions
- [ ] Checkout passes data to order_items
- [ ] Orders screen displays spice/instructions

### Chef Dashboard
- [ ] Orders show spice level badges
- [ ] Special instructions visible
- [ ] Color coding works correctly

### Waiter Flow
- [ ] Same functionality as customer
- [ ] Can view past orders with spice/instructions

## Future Enhancements

1. **Per-item customization modal** - Full ingredient customization
2. **Allergen warnings** - Flag common allergens
3. **Recipe notes for kitchen** - Internal notes separate from customer instructions
4. **Spice level analytics** - Track which spice levels are popular
5. **Default preferences** - Remember user's usual spice level

## Troubleshooting

### Columns Not Appearing
- Re-run SQL migration
- Check Supabase logs for errors
- Verify RLS policies allow INSERT/UPDATE

### UI Not Showing Options
- Clear browser cache
- Check console for TypeScript errors
- Verify cart context is properly wrapped

### Chef Can't See Instructions
- Check order_items query includes new columns
- Verify RLS policies
- Check chef dashboard query selects all columns
