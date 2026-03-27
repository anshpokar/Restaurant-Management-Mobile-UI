# 🎨 TABLE BOOKING VERIFICATION - VISUAL GUIDE

## 📱 ADMIN DASHBOARD QUICK ACTIONS

### Layout: Horizontal Flex Row

```
┌─────────────────────────────────────────────────────────────┐
│  Admin Dashboard                                            │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  KPIs (4 cards in grid)                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Orders   │ │ Revenue  │ │ Tables   │ │ Bookings │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                             │
│  ⚡ QUICK ACTIONS                                           │
│  ┌───────────────────────────────────────────────────────┐ │
│  │                                                       │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐    │ │
│  │  │ 📅 Table            │  │ 💳 Payment          │    │ │
│  │  │    Reservations     │  │    Verifications    │    │ │
│  │  │    5 pending   🕐[5]│  │    3 pending   🕐[3]│    │ │
│  │  └─────────────────────┘  └─────────────────────┘    │ │
│  │       ↑ ORANGE                       ↑ PINK           │ │
│  │       (Table Booking)                (UPI Payment)    │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🟠 TABLE RESERVATIONS CARD STATES

### State 1: With Pending Bookings (PULSE ANIMATION)

```
┌──────────────────────────────────────────┐
│                                          │
│  📅  Table Reservations                  │
│     5 pending                    🕐 [5]  │ ← Orange badge
│                                          │
└──────────────────────────────────────────┘
   ↑
   Orange border (border-orange-200)
   Orange background (bg-orange-50)
   Pulse animation
   Hover: bg-orange-100
   Cursor: pointer
```

**Visual Properties:**
- **Border**: `border-2 border-orange-200`
- **Background**: `bg-orange-50`
- **Hover**: `hover:bg-orange-100`
- **Animation**: `animate-pulse`
- **Badge Color**: Orange theme
- **Minimum Width**: `280px`
- **Flex**: `flex-1`

---

### State 2: No Pending Bookings (NORMAL)

```
┌──────────────────────────────────────────┐
│                                          │
│  📅  Table Reservations                  │
│     12 today                             │ ← Gray text
│                                          │
└──────────────────────────────────────────┘
   ↑
   Normal border (border-border)
   Card background (bg-card)
   No animation
   Hover: bg-muted
   Cursor: pointer
```

**Visual Properties:**
- **Border**: `border-border`
- **Background**: `bg-card`
- **Hover**: `hover:bg-muted`
- **Animation**: None
- **Badge**: Hidden
- **Minimum Width**: `280px`
- **Flex**: `flex-1`

---

## 🔄 FLEX ROW LAYOUT

### Desktop View (> 768px):

```
Quick Actions Section
│
├─► ┌──────────────────────┐ ┌──────────────────────┐
│   │ 📅 Table             │ │ 💳 Payment           │
│   │    Reservations      │ │    Verifications     │
│   │    5 pending    🕐[5]│ │    3 pending    🕐[3]│
│   └──────────────────────┘ └──────────────────────┘
│         ↑ Card 1                 ↑ Card 2
│         min-w: 280px             min-w: 280px
│         flex-1                   flex-1
│
└─► Horizontal layout (flex-row)
    Gap: 12px (gap-3)
    Overflow: horizontal scroll
```

### Mobile View (< 768px):

```
Quick Actions Section (Scrollable)
│
├─► ┌──────────────────────┐ ┌──────────────────────┐
│   │ 📅 Table             │ │ 💳 Payment           │ → Scroll →
│   │    Reservations      │ │    Verifications     │
│   │    5 pending    🕐[5]│ │    3 pending    🕐[3]│
│   └──────────────────────┘ └──────────────────────┘
│
└─► Horizontal scroll enabled
    overflow-x-auto
    pb-2 (padding bottom for scroll space)
```

---

## 🎯 BADGE DESIGN DETAILS

### Pending Badge (Orange Theme):

```tsx
<div className="flex items-center gap-2">
  <Clock className="w-5 h-5 text-orange-600 animate-pulse" />
  <span className="px-3 py-1 bg-orange-600 text-white text-xs font-bold rounded-full">
    {stats.pendingTableBookings}
  </span>
</div>
```

**Visual Breakdown:**
```
┌─────────────────┐
│  🕐  [5]        │  ← Clock icon + count
│     ↑    ↑      │
│     │    └─ Count in pill
│     └─ Animated clock
└─────────────────┘
```

**Styling:**
- **Clock**: `w-5 h-5 text-orange-600 animate-pulse`
- **Badge Background**: `bg-orange-600`
- **Badge Text**: `text-white text-xs font-bold`
- **Shape**: `rounded-full`
- **Padding**: `px-3 py-1`
- **Gap**: `gap-2` between icon and badge

---

## 📊 ADMIN BOOKINGS SCREEN LAYOUT

### Full Screen Structure:

```
┌─────────────────────────────────────────────────────────┐
│  ←  Table Bookings Management                           │ ← App Header
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Statistics (2x2 Grid)                                  │
│  ┌───────────┐ ┌───────────┐                           │
│  │   25      │ │    8      │                           │
│  │  Total    │ │  Pending  │                           │
│  └───────────┘ └───────────┘                           │
│  ┌───────────┐ ┌───────────┐                           │
│  │   12      │ │    5      │                           │
│  │ Confirmed │ │   Today   │                           │
│  └───────────┘ └───────────┘                           │
│                                                         │
│  View Toggle (Segmented Control)                        │
│  ┌─────────┬─────────┬─────────┐                       │
│  │  Today  │Upcoming │   All   │                       │
│  └─────────┴─────────┴─────────┘                       │
│                                                         │
│  Status Filter (Horizontal Scroll)                      │
│  [All] [Pending] [Confirmed] [Cancelled] [Completed]   │
│     ↑ Active filter has primary background             │
│                                                         │
│  Search Bar                                             │
│  🔍 Search by name, email, phone, or table number...   │
│                                                         │
│  Bookings List (Vertical Cards)                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ │ Table #5              🟡 Pending              │   │
│  │ │ Mon, Jan 15 at 19:00                         │   │
│  │ │                                               │   │
│  │ │ John Doe                                     │   │
│  │ │ 👥 4 Guests  📞 +1-234-567-8900              │   │
│  │ │ 📧 john@example.com                          │   │
│  │ │ 🎁 Birthday                                  │   │
│  │ │ 💬 Window seat please                        │   │
│  │ │                                               │   │
│  │ │ [✓ Confirm]  [✕ Cancel]                      │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ │ Table #3              🟢 Confirmed            │   │
│  │ │ ...                                           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [🔄 Refresh List]                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 BOOKING CARD DESIGN

### Pending Booking Card:

```
┌─┬──────────────────────────────────────────────────────┐
│ │  Table #5                    🟡 Pending              │
│O│  Mon, Jan 15 at 19:00                                │
│r│                                                      │
│a│  John Doe                                            │
│n│  👥 4 Guests  📞 +1-234-567-8900                    │
│g│  📧 john@example.com                                 │
│e│  🎁 Birthday                                         │
│ │  💬 Window seat please                               │
│ │                                                      │
│ │  ┌──────────────┐ ┌──────────────┐                 │
│ │  │ ✓ Confirm    │ │ ✕ Cancel     │                 │
│ │  └──────────────┘ └──────────────┘                 │
│ │                                                      │
│ │  ─────────────────────────────────────────────────  │
│ │  🕐 Booked Jan 10                    Updated Jan 12 │
└─┴──────────────────────────────────────────────────────┘
↑
Orange bar (bg-yellow-500)
Indicates: pending status
```

**Color Coding by Status:**
- **Pending**: Orange bar (`bg-yellow-500`)
- **Confirmed**: Green bar (`bg-green-500`)
- **Cancelled**: Red bar (`bg-red-500`)
- **Completed**: Blue bar (`bg-blue-500`)

---

## 🏷️ STATUS BADGES

### Pending Badge:
```
┌──────────────────────┐
│ ⚠️  Pending          │ ← Orange/Yellow theme
└──────────────────────┘
```
**Style**: `Badge variant="warning"`
**Icon**: `AlertCircle`
**Color**: Orange/Yellow

### Confirmed Badge:
```
┌──────────────────────┐
│ ✓  Confirmed         │ ← Green theme
└──────────────────────┘
```
**Style**: `Badge variant="success"`
**Icon**: `CheckCircle2`
**Color**: Green

### Completed Badge:
```
┌──────────────────────┐
│ ✓  Completed         │ ← Blue theme
└──────────────────────┘
```
**Style**: `Badge variant="info"`
**Icon**: `CheckCircle2`
**Color**: Blue

### Cancelled Badge:
```
┌──────────────────────┐
│ ✕  Cancelled         │ ← Red theme
└──────────────────────┘
```
**Style**: `Badge variant="error"`
**Icon**: `XCircle`
**Color**: Red

---

## 🎯 ACTION BUTTONS

### For Pending Bookings:

```
┌──────────────────────────────────┐
│                                  │
│  [✓ Confirm]  [✕ Cancel]        │
│   ↑ Green      ↑ Red Outline     │
│                                  │
└──────────────────────────────────┘
```

**Confirm Button:**
- Background: `bg-green-600`
- Text: White
- Hover: `hover:bg-green-700`
- Icon: `CheckCircle2`

**Cancel Button:**
- Border: `border-red-500`
- Text: `text-red-500`
- Hover: `hover:bg-red-50`
- Icon: `XCircle`

---

### For Confirmed Bookings:

```
┌──────────────────────────────────┐
│                                  │
│  [Mark as Completed]             │ ← Neutral outline
│                                  │
└──────────────────────────────────┘
```

**Complete Button:**
- Variant: `outline`
- Full width
- Neutral color

---

## 📐 SPACING & DIMENSIONS

### Quick Actions Card:

```css
/* Container */
min-width: 280px
flex: 1
padding: 16px (p-4)
border-radius: 16px (rounded-2xl)
border-width: 2px
gap: 12px (gap-3)

/* Icon Container */
width: 48px (w-12)
height: 48px (h-12)
border-radius: 12px (rounded-xl)
padding: 16px (p-4)

/* Typography */
Label: font-bold text-base (16px)
Value: text-sm (14px)
Badge: text-xs (12px) font-bold
```

### Booking Card:

```css
/* Card */
border-radius: 16px (rounded-2xl)
overflow: hidden
margin-bottom: 12px (space-y-3)

/* Status Bar */
width: 6px (w-1.5)
full height of content

/* Content Padding */
padding: 16px (p-4)

/* Typography */
Table Number: font-bold text-lg (18px)
Customer Name: font-semibold
Guest Count: text-xs (12px)
Phone/Email: text-xs (12px)
```

---

## 🎨 COLOR PALETTE

### Table Reservations (Orange Theme):

```css
--orange-50:  #FFF7ED    (Lightest background)
--orange-100: #FFEDD5    (Hover background)
--orange-200: #FED7AA    (Border with badge)
--orange-600: #EA580C    (Primary orange, badges, icons)
--orange-700: #C2410C    (Hover state)
```

### Status Colors:

```css
/* Pending */
--yellow-500: #EAB308    (Status bar, badges)

/* Confirmed */
--green-500:  #22C55E    (Status bar, badges)
--green-600:  #16A34A    (Buttons)
--green-700:  #15803D    (Button hover)

/* Cancelled */
--red-500:    #EF4444    (Status bar, borders)
--red-600:    #DC2626    (Text)

/* Completed */
--blue-500:   #3B82F6    (Status bar, badges)
```

---

## 📱 RESPONSIVE BEHAVIOR

### Desktop (> 1024px):

```
Quick Actions:
- 2 cards visible side-by-side
- Fixed width: 280px each
- Remaining space distributed equally
- No scroll needed if 2 cards

Booking Cards:
- Full width container
- Comfortable padding
- Large typography
```

### Tablet (768px - 1024px):

```
Quick Actions:
- 2 cards may fit depending on width
- Flexible distribution
- Possible horizontal scroll

Booking Cards:
- Slightly reduced padding
- Responsive grid
```

### Mobile (< 768px):

```
Quick Actions:
- Horizontal scroll enabled
- One card at a time focus
- Swipe gesture supported
- Min-width 280px maintained

Booking Cards:
- Full width
- Compact spacing
- Readable on small screens
```

---

## 🖱️ INTERACTION STATES

### Hover Effects:

**Table Reservations Card:**
```
Normal:  bg-orange-50
Hover:   bg-orange-100
Cursor:  pointer
```

**Payment Verifications Card:**
```
Normal:  bg-pink-50
Hover:   bg-pink-100
Cursor:  pointer
```

### Active States:

**Filter Buttons:**
```
Inactive: bg-card text-muted-foreground
Active:   bg-primary text-white
```

**Action Buttons:**
```
Confirm Normal:  bg-green-600
Confirm Hover:   bg-green-700
Cancel Normal:   border-red-500 text-red-500
Cancel Hover:    bg-red-50
```

---

## 🎭 ANIMATIONS

### Pulse Animation (When Pending):

```css
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

**Applied to:**
- Quick Actions card border
- Quick Actions card background
- Clock icon in badge
- Badge itself

**Effect:** Subtle breathing animation to draw attention

---

## 📏 MEASUREMENTS

### Quick Actions Section:

```
Section Title:
- Font size: 20px (text-xl)
- Font weight: 900 (font-black)
- Margin bottom: 16px (mb-4)

Card Container:
- Display: flex
- Direction: row
- Gap: 12px (gap-3)
- Overflow: x-auto
- Padding bottom: 8px (pb-2)

Individual Card:
- Min width: 280px
- Flex grow: 1
- Padding: 16px (p-4)
- Border radius: 16px (rounded-2xl)
```

### Badge Measurements:

```
Clock Icon:
- Width: 20px (w-5)
- Height: 20px (h-5)

Badge Pill:
- Padding X: 12px (px-3)
- Padding Y: 4px (py-1)
- Font size: 12px (text-xs)
- Border radius: 9999px (rounded-full)
```

---

## 🎯 ACCESSIBILITY

### Color Contrast:
- ✅ Orange-600 on white: AA compliant
- ✅ White on orange-600: AAA compliant
- ✅ Text meets WCAG contrast requirements

### Focus States:
- ✅ All interactive elements have focus rings
- ✅ Keyboard navigation supported
- ✅ Screen reader friendly labels

### Touch Targets:
- ✅ Minimum 44x44px touch targets
- ✅ Adequate spacing between buttons
- ✅ Clear visual feedback on interaction

---

**Visual Guide Complete! 🎨**  
Use this reference for implementing consistent UI/UX across the application.
