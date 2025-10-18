# Pending Tasks: Payment & Revenue Tracking
## Features 2 & 3 - Implementation Guide

---

## OVERVIEW

This document outlines the remaining work to complete the payment tracking and revenue display features for the Society Organizer Dashboard.

**Current Status:**
- ✅ Feature 1: Player Directory - COMPLETE AND DEPLOYED
- 🔄 Feature 2: Payment Tracking - SQL Created, Implementation Pending
- 🔄 Feature 3: Revenue Tracking - Design Complete, Implementation Pending

---

## TASK 1: DEPLOY PAYMENT TRACKING DATABASE SCHEMA

### SQL File to Run
**File:** `C:\Users\pete\Documents\MciPro\sql\add-payment-tracking.sql`

### Actions Required
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste contents of `add-payment-tracking.sql`
4. Execute

### Expected Output
```
✅ Payment tracking fields added to event_bookings!
Fields: payment_status, amount_paid, total_fee, paid_at, paid_by
```

### What This Does
Adds 5 new columns to `event_bookings` table:
- `payment_status` - 'paid', 'unpaid', or 'partial'
- `amount_paid` - Decimal amount paid
- `total_fee` - Total fee for this booking (auto-calculated)
- `paid_at` - Timestamp when marked paid
- `paid_by` - LINE user ID of organizer who marked as paid

---

## TASK 2: IMPLEMENT PAYMENT BACKEND FUNCTIONS

### Location
**File:** `index.html`
**Class:** `SocietyGolfSupabase`
**Insert After:** Line 29740 (after society membership functions)

### Function 1: markPlayerPaid()
```javascript
async markPlayerPaid(eventId, playerId, totalFee, organizerId) {
    await this.waitForSupabase();

    const { data, error } = await window.SupabaseDB.client
        .from('event_bookings')
        .update({
            payment_status: 'paid',
            amount_paid: totalFee,
            paid_at: new Date().toISOString(),
            paid_by: organizerId
        })
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .select();

    if (error) {
        console.error('[PaymentTracking] Error marking paid:', error);
        throw error;
    }

    return data;
}
```

### Function 2: markPlayerUnpaid()
```javascript
async markPlayerUnpaid(eventId, playerId) {
    await this.waitForSupabase();

    const { data, error } = await window.SupabaseDB.client
        .from('event_bookings')
        .update({
            payment_status: 'unpaid',
            amount_paid: 0,
            paid_at: null,
            paid_by: null
        })
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .select();

    if (error) {
        console.error('[PaymentTracking] Error marking unpaid:', error);
        throw error;
    }

    return data;
}
```

### Function 3: getEventBookingsWithPayment()
```javascript
async getEventBookingsWithPayment(eventId) {
    await this.waitForSupabase();

    const { data, error } = await window.SupabaseDB.client
        .from('event_bookings')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[PaymentTracking] Error loading bookings:', error);
        return [];
    }

    return data || [];
}
```

### Function 4: getEventPaymentStats()
```javascript
async getEventPaymentStats(eventId) {
    await this.waitForSupabase();

    const bookings = await this.getEventBookingsWithPayment(eventId);

    const stats = {
        totalCount: bookings.length,
        paidCount: bookings.filter(b => b.payment_status === 'paid').length,
        unpaidCount: bookings.filter(b => b.payment_status === 'unpaid').length,
        partialCount: bookings.filter(b => b.payment_status === 'partial').length,
        totalExpected: bookings.reduce((sum, b) => sum + parseFloat(b.total_fee || 0), 0),
        totalPaid: bookings.reduce((sum, b) => sum + parseFloat(b.amount_paid || 0), 0),
        totalUnpaid: 0
    };

    stats.totalUnpaid = stats.totalExpected - stats.totalPaid;
    stats.percentagePaid = stats.totalCount > 0
        ? Math.round((stats.paidCount / stats.totalCount) * 100)
        : 0;

    return stats;
}
```

---

## TASK 3: ADD PAYMENT UI TO ROSTER

### File to Modify
**File:** `index.html`
**Function:** Find roster rendering function (search for "renderRoster" or roster table)

### A) Add "Paid" Column Header
Find the roster table header and add:
```html
<th class="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
    Paid Status
</th>
```

### B) Add Paid Status Cell
In the roster table body, for each player row add:
```html
<td class="px-6 py-4 whitespace-nowrap">
    <div class="flex items-center gap-2">
        ${booking.payment_status === 'paid' ? `
            <span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                PAID
            </span>
            <button onclick="SocietyOrganizerSystem.togglePayment('${event.id}', '${booking.player_id}', false)"
                class="text-xs text-gray-500 hover:text-red-600" title="Mark as unpaid">
                <span class="material-symbols-outlined text-sm">cancel</span>
            </button>
        ` : `
            <button onclick="SocietyOrganizerSystem.togglePayment('${event.id}', '${booking.player_id}', true)"
                class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
                Mark Paid
            </button>
        `}
    </div>
</td>
```

### C) Add Total Fee Display
In the roster table, add total fee column:
```html
<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
    ฿${booking.total_fee?.toFixed(2) || '0.00'}
</td>
```

---

## TASK 4: IMPLEMENT PAYMENT TOGGLE HANDLER

### File to Modify
**File:** `index.html`
**Class:** `SocietyOrganizerManager`
**Insert After:** Player directory functions

### Function: togglePayment()
```javascript
async togglePayment(eventId, playerId, markAsPaid) {
    try {
        const organizerId = AppState.currentUser?.lineUserId;
        if (!organizerId) {
            NotificationManager.show('Not authorized', 'error');
            return;
        }

        if (markAsPaid) {
            // Get booking to find total fee
            const bookings = await SocietyGolfDB.getEventBookingsWithPayment(eventId);
            const booking = bookings.find(b => b.player_id === playerId);

            if (!booking) {
                NotificationManager.show('Booking not found', 'error');
                return;
            }

            await SocietyGolfDB.markPlayerPaid(eventId, playerId, booking.total_fee, organizerId);
            NotificationManager.show('✅ Marked as paid', 'success');
        } else {
            await SocietyGolfDB.markPlayerUnpaid(eventId, playerId);
            NotificationManager.show('✅ Marked as unpaid', 'success');
        }

        // Refresh roster to show updated payment status
        await this.viewRoster(eventId);

        // Refresh events list to update revenue display
        await this.loadEvents();

    } catch (error) {
        console.error('[PaymentToggle] Error:', error);
        NotificationManager.show('Failed to update payment status', 'error');
    }
}
```

---

## TASK 5: IMPLEMENT REVENUE TRACKING

### File to Modify
**File:** `index.html`
**Class:** `SocietyOrganizerManager`

### Function 1: loadEventsWithRevenue()
Modify existing `loadEvents()` function to include payment stats:

```javascript
async loadEvents() {
    try {
        const organizerId = AppState.currentUser?.lineUserId;
        if (!organizerId) {
            console.error('[SocietyOrganizer] No organizer ID');
            return;
        }

        console.log('[SocietyOrganizer] Loading events with revenue stats...');

        // Load events
        this.events = await SocietyGolfDB.getOrganizerEventsWithStats(organizerId);

        // Enrich each event with payment stats
        const enrichedEvents = await Promise.all(
            this.events.map(async (event) => {
                const paymentStats = await SocietyGolfDB.getEventPaymentStats(event.id);
                return {
                    ...event,
                    revenue: paymentStats
                };
            })
        );

        this.events = enrichedEvents;
        this.renderEventsList();

    } catch (error) {
        console.error('[SocietyOrganizer] Error loading events:', error);
        NotificationManager.show('Failed to load events', 'error');
    }
}
```

---

## TASK 6: ADD REVENUE DISPLAY TO EVENTS LIST

### File to Modify
**File:** `index.html`
**Function:** Event card rendering (search for event list rendering)

### Find Event Card HTML
Look for the event card template (likely around line 40300-40400)

### Add Revenue Section
After the date/player count line, add:

```html
<!-- Revenue Section (Organizer Only) -->
${event.revenue ? `
    <div class="mt-3 pt-3 border-t border-gray-200">
        <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-600">Revenue</span>
            <span class="text-xs font-medium ${
                event.revenue.percentagePaid >= 80 ? 'text-green-600' :
                event.revenue.percentagePaid >= 50 ? 'text-yellow-600' :
                'text-red-600'
            }">
                ${event.revenue.paidCount}/${event.revenue.totalCount} Paid
            </span>
        </div>

        <!-- Progress Bar -->
        <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div class="h-2 rounded-full ${
                event.revenue.percentagePaid >= 80 ? 'bg-green-500' :
                event.revenue.percentagePaid >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
            }" style="width: ${event.revenue.percentagePaid}%"></div>
        </div>

        <!-- Amount Display -->
        <div class="flex items-center justify-between text-sm">
            <div>
                <span class="text-gray-600">Collected:</span>
                <span class="font-medium text-gray-900">฿${event.revenue.totalPaid.toLocaleString()}</span>
            </div>
            <div>
                <span class="text-gray-600">Expected:</span>
                <span class="font-medium text-gray-900">฿${event.revenue.totalExpected.toLocaleString()}</span>
            </div>
        </div>

        ${event.revenue.totalUnpaid > 0 ? `
            <div class="mt-1 text-xs text-red-600">
                ฿${event.revenue.totalUnpaid.toLocaleString()} outstanding
            </div>
        ` : ''}
    </div>
` : ''}
```

---

## TASK 7: TESTING CHECKLIST

### Payment Tracking Tests
- [ ] SQL schema deploys successfully
- [ ] Backend functions accessible from console
- [ ] Roster shows "Paid" column
- [ ] "Mark Paid" button works
- [ ] PAID badge appears immediately
- [ ] "Mark Unpaid" button works (X icon)
- [ ] PAID badge disappears when unmarked
- [ ] Total fee displays correctly
- [ ] Multiple players can be marked paid
- [ ] Refresh roster shows correct state

### Revenue Display Tests
- [ ] Revenue section appears on event cards
- [ ] Paid count shows correctly (2/4 format)
- [ ] Progress bar displays
- [ ] Progress bar color changes (red/yellow/green)
- [ ] Collected amount correct
- [ ] Expected amount correct
- [ ] Outstanding amount calculates
- [ ] Percentages accurate
- [ ] Updates after marking paid
- [ ] Multiple events show different revenue

### Integration Tests
- [ ] Mark paid in roster → Revenue updates in events list
- [ ] Refresh page → Payment status persists
- [ ] Multiple organizers → Each sees correct data
- [ ] Edge case: 0 players → No errors
- [ ] Edge case: All paid → Shows 100%, green
- [ ] Edge case: None paid → Shows 0%, red

---

## TASK 8: DEPLOYMENT

### Pre-Deployment Checklist
- [ ] All functions implemented
- [ ] All UI changes complete
- [ ] Full testing completed
- [ ] No console errors
- [ ] Database schema deployed
- [ ] RLS policies verified

### Deployment Steps
1. Stage changes: `git add index.html sql/add-payment-tracking.sql`
2. Commit: `git commit -m "Add payment and revenue tracking features"`
3. Push: `git push`
4. Deploy: `netlify deploy --prod`
5. Update service worker cache version
6. Test on production

### Post-Deployment Verification
- [ ] Clear browser cache
- [ ] Reload app
- [ ] Navigate to Society Organizer Dashboard
- [ ] Check events list shows revenue
- [ ] Open roster, verify "Paid" column
- [ ] Mark player paid, verify updates
- [ ] Check events list revenue updated

---

## FILE LOCATIONS QUICK REFERENCE

### SQL Files
- `sql/add-payment-tracking.sql` - Database schema (RUN THIS FIRST)

### Code to Modify
- `index.html` - All code changes in this single file

### Functions to Find
- Search: `class SocietyGolfSupabase` - Add payment backend functions here
- Search: `class SocietyOrganizerManager` - Add togglePayment() here
- Search: `loadEvents()` - Modify to load revenue
- Search: `viewRoster` or roster table - Add "Paid" column
- Search: event card HTML - Add revenue display

### Lines for Reference
- Line 29740: After society membership functions (add payment functions)
- Line 35383: After player directory functions (add togglePayment)
- Line 35080: loadEvents() function (modify for revenue)
- Search "roster table" for roster modifications
- Search "event card" for events list modifications

---

## ESTIMATED IMPLEMENTATION TIME

**Task 1:** Deploy SQL - 5 minutes
**Task 2:** Backend functions - 30 minutes
**Task 3:** Roster UI - 45 minutes
**Task 4:** Payment toggle handler - 20 minutes
**Task 5:** Revenue calculations - 30 minutes
**Task 6:** Revenue display - 45 minutes
**Task 7:** Testing - 60 minutes
**Task 8:** Deployment - 15 minutes

**Total:** ~4 hours for complete implementation and testing

---

## NOTES FOR IMPLEMENTATION

### Performance Considerations
- Revenue stats calculated per event (N queries for N events)
- Consider caching revenue stats
- Could add revenue stats to event table for faster loading
- Or use database views for real-time calculation

### Real-time Updates
- Currently requires manual refresh
- Could add Supabase realtime subscription to event_bookings
- Would auto-update when another organizer marks paid
- Not critical for MVP

### Edge Cases to Handle
1. **Partial payments** - Status 'partial' not fully implemented yet
2. **Refunds** - No refund tracking currently
3. **Fee changes** - If event fees change after registration
4. **Deleted bookings** - Handle gracefully in revenue calc
5. **Concurrent updates** - Two organizers marking same player

### Future Enhancements
- Payment history log (who marked, when)
- Export payment report
- Auto-email receipts
- Integration with payment gateways
- Multi-currency support
- Bulk mark paid (select multiple)

---

## SUPPORT FOR FUTURE SESSIONS

### Quick Start Commands
```bash
# Find payment functions
grep -n "markPlayerPaid\|togglePayment" index.html

# Find roster rendering
grep -n "roster.*table\|viewRoster" index.html

# Find event card rendering
grep -n "event.*card\|renderEventsList" index.html

# Check if SQL deployed
# Run in Supabase SQL Editor:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'event_bookings' AND column_name IN ('payment_status', 'amount_paid', 'total_fee');
```

### Common Issues
**Issue:** "Column does not exist" error
**Fix:** SQL schema not deployed, run `add-payment-tracking.sql`

**Issue:** Revenue shows ฿0
**Fix:** Check `total_fee` calculation, may need manual UPDATE query

**Issue:** Toggle not working
**Fix:** Check `togglePayment()` function exists and is called correctly

**Issue:** PAID badge not showing
**Fix:** Check `payment_status` field value, verify roster rendering logic

---

## END OF PENDING TASKS DOCUMENT
