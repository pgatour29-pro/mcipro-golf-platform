# Payment Tracking System - Implementation Guide

**Created:** October 17, 2025
**Location:** /MciPro/compacted
**Status:** Complete - Ready for Integration

---

## Overview

A comprehensive payment tracking system for society golf event organizers. Tracks individual fee components, payment preferences, real-time balances, and provides organizer checklists for collecting payments at society bars or golf courses.

---

## Features Delivered

### 1. Organizer Payment Checklist
- View all registered players with payment status
- Check off individual fee components (green, cart, caddy, transport, competition)
- Real-time running balance (expected vs. collected)
- Filter by status (all, unpaid, partial, paid)
- "Paid in Full" badge system
- Export to CSV for accountant
- Payment breakdown by location (bar, course, organizer)

### 2. Golfer Payment Selection
- Interactive UI for golfers to select where to pay each fee
- Options: Society Bar, Golf Course, or Organizer
- Total amount calculator
- Payment summary breakdown
- Preference saved to database

### 3. Database Schema
- `event_payments` table with individual fee tracking
- Automatic payment record creation on registration
- Payment status auto-calculation (unpaid/partial/paid)
- Real-time view for payment summaries
- Full audit trail with timestamps

### 4. API & Integration
- Supabase RPC functions for payment operations
- Real-time subscriptions for live updates
- Integration with existing society organizer system
- Payment badges in registration roster

---

## Files Created

### Database Layer
**Location:** `C:\Users\pete\Documents\MciPro\sql\payment-tracking-system.sql`

- Complete PostgreSQL schema
- Tables, indexes, views, functions, triggers
- Row Level Security (RLS) policies
- Realtime publication setup

### JavaScript Database Layer
**Location:** `C:\Users\pete\Documents\MciPro\compacted\payment-tracking-database.js`

- `PaymentTrackingDB` class
- Methods for CRUD operations
- Realtime subscriptions
- Payment summaries and breakdowns
- CSV export functionality

### Organizer UI Components
**Location:** `C:\Users\pete\Documents\MciPro\compacted\payment-tracking-organizer-ui.html`

- Payment tracking modal
- Payment detail modal
- Payment breakdown by location modal
- Responsive tables with checkboxes
- Real-time balance display

### Payment Manager JavaScript
**Location:** `C:\Users\pete\Documents\MciPro\compacted\payment-tracking-manager.js`

- `PaymentTrackingManager` class
- UI rendering and state management
- Filter and search functionality
- Export operations
- Event handlers

### Golfer Payment Selection UI
**Location:** `C:\Users\pete\Documents\MciPro\compacted\payment-selection-golfer-ui.html`

- Payment preference modal
- Fee selection dropdowns
- Total calculator
- Payment location breakdown
- Helper text and guidance

### Integration Layer
**Location:** `C:\Users\pete\Documents\MciPro\compacted\payment-system-integration.js`

- Extends `SocietyOrganizerSystem`
- Adds payment buttons to event cards
- Adds payment badges to roster
- Auto-creates payment records
- Payment reminder after registration

---

## Database Schema Details

### Main Table: `event_payments`

```sql
CREATE TABLE event_payments (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES society_events(id),
  registration_id TEXT REFERENCES event_registrations(id),

  -- Player info
  player_id TEXT,
  player_name TEXT,

  -- Fee breakdown
  green_fee_amount INTEGER,
  cart_fee_amount INTEGER,
  caddy_fee_amount INTEGER,
  transport_fee_amount INTEGER,
  competition_fee_amount INTEGER,
  total_amount INTEGER,

  -- Payment preferences (where to pay)
  pay_green_at TEXT,      -- 'bar', 'course', 'online', 'organizer'
  pay_cart_at TEXT,
  pay_caddy_at TEXT,
  pay_transport_at TEXT,
  pay_competition_at TEXT,

  -- Payment status
  payment_status TEXT,    -- 'unpaid', 'partial', 'paid'
  green_fee_paid BOOLEAN,
  cart_fee_paid BOOLEAN,
  caddy_fee_paid BOOLEAN,
  transport_fee_paid BOOLEAN,
  competition_fee_paid BOOLEAN,

  -- Audit trail
  payment_method TEXT,
  paid_at TIMESTAMPTZ,
  marked_paid_by TEXT,
  payment_notes TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Key Features

1. **Individual Fee Tracking**: Each fee component (green, cart, caddy, transport, competition) tracked separately
2. **Payment Preferences**: Golfers select where they'll pay each fee
3. **Automatic Status**: Trigger auto-calculates payment_status based on individual components
4. **Audit Trail**: Tracks who marked payment and when

### Functions

- `create_payment_record()` - Auto-creates payment record when registration created
- `update_payment_status()` - Auto-updates status when fees marked paid/unpaid
- `mark_payment_paid()` - Marks all fees as paid in one operation
- `get_event_payment_summary()` - Returns real-time summary statistics

### Views

- `event_payment_summary` - Aggregated payment statistics per event

---

## Integration Steps

### Step 1: Deploy Database Schema

Run SQL file in Supabase SQL Editor:

```bash
# File: sql/payment-tracking-system.sql
```

This creates:
- Tables
- Indexes
- Views
- Functions
- Triggers
- RLS policies
- Realtime subscriptions

### Step 2: Add JavaScript Files to index.html

Add these scripts BEFORE the closing `</body>` tag:

```html
<!-- Payment Tracking System -->
<script src="compacted/payment-tracking-database.js"></script>
<script src="compacted/payment-tracking-manager.js"></script>
<script src="compacted/payment-system-integration.js"></script>
```

### Step 3: Add UI Components to index.html

Insert these modals in the HTML body:

```html
<!-- Add from payment-tracking-organizer-ui.html -->
- paymentTrackingModal
- paymentDetailModal
- paymentWhereModal

<!-- Add from payment-selection-golfer-ui.html -->
- golferPaymentModal
- quickPaymentInfo
```

### Step 4: Update Event Card (Optional)

The integration layer automatically adds payment buttons to event cards.

If using custom event cards, manually add:

```html
<button onclick="SocietyOrganizerSystem.openPaymentTracking('EVENT_ID')"
        class="btn-primary">
  <span class="material-symbols-outlined">payments</span>
  Payment Tracking
</button>
```

### Step 5: Add to Registration Flow

When golfer registers for event:

```javascript
// Initialize payment state
initializeGolferPaymentForEvent(
  eventData,
  wantTransport,
  wantCompetition
);

// Show payment selection modal
openGolferPaymentModal();

// After registration success
showPaymentReminderAfterRegistration(
  registrationId,
  totalAmount,
  eventName
);
```

---

## API Usage

### Get Event Payments

```javascript
const payments = await PaymentTrackingDB.getEventPayments(eventId);
// Returns array of payment records with status
```

### Get Payment Summary

```javascript
const summary = await PaymentTrackingDB.getEventPaymentSummary(eventId);
// Returns {
//   total_registrations: 40,
//   paid_count: 25,
//   unpaid_count: 10,
//   partial_count: 5,
//   total_expected: 120000,
//   total_collected: 80000,
//   outstanding_balance: 40000,
//   payment_percentage: 66.67
// }
```

### Mark Fee as Paid

```javascript
await PaymentTrackingDB.markFeePaid(
  paymentId,
  'green_fee',    // fee type
  organizerId,
  'cash',         // payment method
  'Paid at bar'   // notes
);
```

### Mark All Fees Paid

```javascript
await PaymentTrackingDB.markPaymentFullyPaid(
  paymentId,
  organizerId,
  'cash',
  'Paid in full at society bar'
);
```

### Update Golfer Preferences

```javascript
await PaymentTrackingDB.updatePaymentPreferences(paymentId, {
  payGreenAt: 'bar',
  payCartAt: 'course',
  payCaddyAt: 'course',
  payTransportAt: 'bar',
  payCompetitionAt: 'organizer'
});
```

### Get Payment Breakdown by Location

```javascript
const breakdown = await PaymentTrackingDB.getPaymentBreakdownByLocation(eventId);
// Returns {
//   bar: { count: 15, amount: 45000, fees: [...] },
//   course: { count: 20, amount: 60000, fees: [...] },
//   online: { count: 0, amount: 0, fees: [] },
//   organizer: { count: 5, amount: 15000, fees: [...] }
// }
```

### Export Payment Checklist

```javascript
await PaymentTrackingSystem.exportPaymentChecklist();
// Downloads CSV file with all payment details
```

---

## UI Components

### 1. Payment Tracking Modal (Organizer)

**How to Open:**
```javascript
SocietyOrganizerSystem.openPaymentTracking(eventId);
```

**Features:**
- Real-time balance summary (4 cards at top)
- Filter tabs (All, Unpaid, Partial, Paid)
- Payment checklist table with checkboxes for each fee
- Quick mark paid buttons
- Export to CSV
- Refresh button

### 2. Payment Detail Modal

**How to Open:**
```javascript
PaymentTrackingSystem.openPaymentDetail(paymentId);
```

**Features:**
- Individual fee breakdown
- Checkboxes to mark each fee paid/unpaid
- Payment method selector
- Notes field
- "Mark All Paid" button

### 3. Payment Breakdown Modal

**How to Open:**
```javascript
SocietyOrganizerSystem.showPaymentBreakdown(eventId);
```

**Features:**
- 4 cards showing breakdown by location
- Society Bar, Golf Course, Online, Organizer
- Amount and player count per location
- Fee breakdown within each location

### 4. Golfer Payment Selection Modal

**How to Open:**
```javascript
openGolferPaymentModal();
```

**Features:**
- Event summary at top
- Fee selection dropdowns (where to pay each fee)
- Total calculator
- Payment summary breakdown
- Helper text explaining options
- Confirmation button

---

## Testing Guide

### Test 1: Create Payment Record

1. Register a player for an event
2. Check Supabase `event_payments` table
3. Verify payment record auto-created with correct amounts
4. Verify `payment_status` = 'unpaid'

### Test 2: Mark Individual Fees Paid

1. Open payment tracking modal
2. Check green fee checkbox for a player
3. Verify status changes to 'partial'
4. Check all fees
5. Verify status changes to 'paid'

### Test 3: Real-time Balance Updates

1. Open payment tracking modal
2. In another browser/tab, mark a payment as paid
3. Verify balance summary updates automatically
4. Verify table row updates

### Test 4: Golfer Payment Selection

1. Start event registration flow
2. Open payment selection modal
3. Select different locations for different fees
4. Confirm selections
5. Verify preferences saved to database

### Test 5: Payment Badges in Roster

1. Open event roster
2. Mark some payments as paid
3. Verify "Paid in Full" badges appear
4. Verify partial payments show "Partial" badge
5. Verify unpaid show "Unpaid" badge

### Test 6: Export Functionality

1. Open payment tracking modal
2. Click "Export CSV"
3. Verify CSV downloads with correct data
4. Check all columns present
5. Verify amounts formatted correctly

### Test 7: Payment Breakdown by Location

1. Have players select different payment locations
2. Open payment breakdown modal
3. Verify amounts distributed correctly
4. Verify player counts correct
5. Verify fee breakdowns show detail

---

## Troubleshooting

### Issue: Payment records not auto-creating

**Cause:** Trigger not executing or registration_id mismatch

**Fix:**
```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'create_payment_on_registration';

-- Manually create missing payment records
INSERT INTO event_payments (id, event_id, registration_id, ...)
SELECT 'pay_' || id, event_id, id, ...
FROM event_registrations
WHERE NOT EXISTS (
  SELECT 1 FROM event_payments WHERE registration_id = event_registrations.id
);
```

### Issue: Payment status not updating

**Cause:** Trigger not firing or conditions not met

**Fix:**
```sql
-- Check trigger
SELECT * FROM pg_trigger WHERE tgname = 'auto_update_payment_status';

-- Manually recalculate status
UPDATE event_payments
SET payment_status = CASE
  WHEN green_fee_paid AND cart_fee_paid AND caddy_fee_paid THEN 'paid'
  WHEN green_fee_paid OR cart_fee_paid OR caddy_fee_paid THEN 'partial'
  ELSE 'unpaid'
END;
```

### Issue: Real-time updates not working

**Cause:** Realtime not enabled or subscription not setup

**Fix:**
```sql
-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE event_payments;

-- In JavaScript, verify subscription
PaymentTrackingDB.subscribeToPayments(eventId, (payload) => {
  console.log('Payment change:', payload);
});
```

### Issue: Permissions error when updating payments

**Cause:** RLS policies too restrictive

**Fix:**
```sql
-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'event_payments';

-- Make sure update policy exists
CREATE POLICY "Payments are updatable by everyone" ON event_payments
  FOR UPDATE USING (true);
```

---

## Performance Considerations

### Indexes Created

```sql
idx_payments_event         -- Fast lookup by event_id
idx_payments_player        -- Fast lookup by player_id
idx_payments_status        -- Fast filtering by status
idx_payments_registration  -- Fast join with registrations
```

### Caching Strategy

- Payment summary cached for 30 seconds
- Full payment list reloaded on realtime event
- Individual payment updates trigger targeted refreshes

### Optimization Tips

1. Use `getEventPaymentSummary()` for dashboard displays
2. Use realtime subscriptions instead of polling
3. Batch payment updates when marking multiple players
4. Export operations run async to not block UI

---

## Future Enhancements

### Potential Features

1. **Online Payment Integration**
   - Stripe/PayPal integration
   - QR code generation for PromptPay
   - LINE Pay integration
   - Auto-mark paid on successful transaction

2. **Payment Reminders**
   - Email reminders for unpaid fees
   - LINE message notifications
   - SMS reminders 24 hours before event

3. **Refund Tracking**
   - Track refunds for cancellations
   - Partial refund support
   - Refund approval workflow

4. **Multi-Currency Support**
   - USD, EUR, GBP in addition to THB
   - Real-time exchange rates
   - Currency conversion on export

5. **Advanced Reporting**
   - Monthly revenue reports
   - Year-over-year comparisons
   - Revenue by event type
   - Tax reporting exports

6. **Split Payments**
   - Allow multiple payment methods per player
   - Track partial payments by method
   - Split between locations (pay some at bar, some at course)

7. **Mobile App Integration**
   - Native payment tracking in React Native app
   - Push notifications on payment received
   - QR code scanning for quick payment

---

## Component Architecture

```
Payment Tracking System
│
├── Database Layer (SQL)
│   ├── event_payments table
│   ├── event_payment_summary view
│   ├── Functions (create, update, mark_paid)
│   └── Triggers (auto-create, auto-status)
│
├── API Layer (JS)
│   ├── PaymentTrackingDB class
│   │   ├── CRUD operations
│   │   ├── Realtime subscriptions
│   │   └── Export functions
│   └── Supabase RPC calls
│
├── Business Logic (JS)
│   ├── PaymentTrackingManager class
│   │   ├── State management
│   │   ├── UI rendering
│   │   ├── Event handlers
│   │   └── Filter/search
│   └── Integration layer
│       ├── Extends SocietyOrganizerSystem
│       ├── Adds payment badges
│       └── Auto-create payments
│
└── UI Components (HTML)
    ├── Organizer Modals
    │   ├── Payment tracking
    │   ├── Payment detail
    │   └── Payment breakdown
    └── Golfer Modals
        ├── Payment selection
        ├── Payment reminder
        └── Quick info card
```

---

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled with public access policies. For production, consider:

```sql
-- Example: Restrict updates to organizers only
CREATE POLICY "Only organizers can update payments" ON event_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM society_events se
      WHERE se.id = event_payments.event_id
      AND se.organizer_id = auth.uid()
    )
  );
```

### Audit Trail

Every payment update includes:
- `marked_paid_by` - Who marked the payment
- `paid_at` - When it was marked
- `updated_at` - Last modification time

### Data Validation

- Fee amounts validated against event fees
- Payment status auto-calculated (can't be manually set incorrectly)
- Registration deletion cascades to payment records

---

## Success Metrics

Track these metrics to measure adoption:

1. **Payment Tracking Usage**
   - % of events using payment tracking
   - Average time to mark all payments
   - Export frequency

2. **Golfer Adoption**
   - % of golfers setting payment preferences
   - Most popular payment locations
   - Average time to set preferences

3. **Payment Accuracy**
   - % of payments marked vs. actual registrations
   - Discrepancy rate
   - Time to full payment

4. **Organizer Satisfaction**
   - Survey scores
   - Support tickets related to payments
   - Feature requests

---

## Support & Maintenance

### Common Organizer Questions

**Q: How do I mark a player as paid?**
A: Open payment tracking, click "Mark Paid" button next to player, check all fees, click "Mark All Paid"

**Q: Can I see where players prefer to pay?**
A: Yes, click "Payment Breakdown" button to see breakdown by location

**Q: How do I export for accounting?**
A: In payment tracking modal, click "Export CSV" button

**Q: What if a player paid only part of their fees?**
A: Check only the fees they paid. Status will show as "Partial"

### Common Golfer Questions

**Q: Do I have to set payment preferences?**
A: Recommended but not required. Helps organizer know where to expect payment

**Q: Can I change my payment preferences later?**
A: Yes, contact the organizer to update preferences

**Q: What payment methods are accepted?**
A: Cash, card, bank transfer, LINE Pay, PromptPay (depending on location)

---

## Changelog

### Version 1.0 - October 17, 2025

**Initial Release**
- Complete database schema with auto-triggers
- Organizer payment tracking UI
- Golfer payment selection UI
- Real-time balance updates
- Payment badges in roster
- Export to CSV
- Payment breakdown by location
- Integration with existing society system

---

## Credits

**Developed by:** Claude (Anthropic)
**For:** MciPro Golf Platform
**Date:** October 17, 2025
**Version:** 1.0

---

## Next Steps

1. **Deploy Database Schema**
   - Run `sql/payment-tracking-system.sql` in Supabase

2. **Integrate JavaScript Files**
   - Add 3 JS files to index.html

3. **Add UI Components**
   - Copy modal HTML to index.html

4. **Test Thoroughly**
   - Follow testing guide above

5. **Train Organizers**
   - Show how to use payment tracking
   - Demonstrate export functionality

6. **Monitor Usage**
   - Track adoption metrics
   - Gather feedback
   - Iterate on features

---

**Documentation Complete**
Ready for production deployment.
