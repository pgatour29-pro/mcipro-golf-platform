# Events Page ↔ Registrations Tab Synchronization

**Date:** December 22, 2025
**Session:** Cross-reference sync between Events Roster Modal and Registrations tab

---

## Problem Statement

The Society Organizer dashboard had two separate places to manage event registrations:

1. **Events Page → Roster Modal** (via "Registrations" button on event card)
2. **Registrations Tab** (dedicated tab with full management features)

These two views operated independently - changes made in one place didn't reflect in the other until manual refresh.

---

## Solution: Bidirectional Sync

Added automatic synchronization so changes in either place immediately update the other.

---

## Sync Points Added

### From Roster Modal → Registrations Tab

| Action | Function | Syncs |
|--------|----------|-------|
| Mark Paid/Unpaid | `togglePayment()` | ✅ |
| Edit player fee | `editPlayerFee()` | ✅ |
| Remove player | `removeRegistration()` | ✅ |
| Remove from waitlist | `removeFromWaitlist()` | ✅ |
| Add player (database) | `addPlayerFromDatabase()` | ✅ |
| Add manual player | `addManualPlayer()` | ✅ |

### From Registrations Tab → Roster Modal

| Action | Function | Syncs |
|--------|----------|-------|
| Toggle payment | `togglePaymentStatus()` | ✅ |
| Toggle competition | `toggleCompetition()` | ✅ |
| Toggle transport | `toggleTransport()` | ✅ |
| Update fee | `updateFee()` | ✅ |
| Edit player handicap | `editPlayer()` | ✅ |
| Remove player | `removePlayer()` | ✅ |
| Promote from waitlist | `promoteFromWaitlist()` | ✅ |
| Remove from waitlist | `removeFromWaitlist()` | ✅ |

---

## Implementation Pattern

Each function now checks if the other view is open for the same event and refreshes it:

### Roster Modal → Registrations Tab
```javascript
// After successful update...
if (window.RegistrationsManager && RegistrationsManager.currentEventId === this.currentRosterEvent?.id) {
    console.log('[Sync] Refreshing Registrations tab...');
    RegistrationsManager.loadEventData(this.currentRosterEvent.id);
}
```

### Registrations Tab → Roster Modal
```javascript
// After successful update...
if (window.SocietyOrganizerSystem && SocietyOrganizerSystem.currentRosterEvent?.id === this.currentEventId) {
    console.log('[Sync] Refreshing Roster Modal...');
    SocietyOrganizerSystem.loadRosterData(this.currentEventId);
    SocietyOrganizerSystem.loadEvents(); // Also refresh event cards
}
```

---

## Bug Fix: Paid Status Visual Not Updating

### Problem
Clicking "Mark Paid" in Roster Modal didn't visually update - the button/status stayed the same.

### Root Cause
Case mismatch between database column names and JavaScript property names:
- `getRegistrations()` returned `paymentStatus` (camelCase)
- `renderConfirmedPlayers()` looked for `payment_status` (snake_case)

### Fix
Updated render functions to check both cases:
```javascript
// Before
const paymentStatus = reg.payment_status || 'unpaid';

// After
const paymentStatus = reg.payment_status || reg.paymentStatus || 'unpaid';
const totalFee = reg.total_fee || reg.totalFee || 0;
```

### Visual Enhancement
Added green background for paid rows:
```javascript
<tr class="border-t ${isPaid ? 'bg-green-50' : ''}">
```

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Added sync calls to 14 functions, fixed case mismatch, added row highlighting |

---

## Functions Modified

### SocietyOrganizerSystem (Roster Modal)

| Function | Line | Change |
|----------|------|--------|
| `togglePayment()` | ~56389 | Added RegistrationsManager sync |
| `editPlayerFee()` | ~56328 | Added RegistrationsManager sync |
| `removeRegistration()` | ~57854 | Added RegistrationsManager sync + loadEvents |
| `removeFromWaitlist()` | ~57872 | Added RegistrationsManager sync |
| `addPlayerFromDatabase()` | ~58180 | Added RegistrationsManager sync + loadEvents |
| `addManualPlayer()` | ~58271 | Added RegistrationsManager sync + loadEvents |
| `renderConfirmedPlayers()` | ~57709 | Fixed case mismatch, added green row |
| `filterRosterPlayers()` | ~57804 | Fixed case mismatch, added green row |

### RegistrationsManager (Registrations Tab)

| Function | Line | Change |
|----------|------|--------|
| `togglePaymentStatus()` | ~74048 | Added SocietyOrganizerSystem sync |
| `toggleCompetition()` | ~74090 | Added SocietyOrganizerSystem sync |
| `toggleTransport()` | ~74130 | Added SocietyOrganizerSystem sync |
| `updateFee()` | ~73979 | Added SocietyOrganizerSystem sync |
| `editPlayer()` | ~74145 | Added SocietyOrganizerSystem sync |
| `removePlayer()` | ~74158 | Added SocietyOrganizerSystem sync + loadEvents |
| `promoteFromWaitlist()` | ~74175 | Added SocietyOrganizerSystem sync + loadEvents |
| `removeFromWaitlist()` | ~74188 | Added SocietyOrganizerSystem sync |

---

## Git Commits

```
eb2c7620 fix: Sync payment status between Events roster and Registrations tab
a7cd44b2 fix: Roster modal paid status now updates visually with green row highlight
```

---

## User Experience Improvement

### Before
1. Open Roster Modal, mark player as paid
2. Switch to Registrations tab
3. Player still shows as unpaid (stale data)
4. Must manually refresh to see update

### After
1. Open Roster Modal, mark player as paid
2. Row immediately turns green with "PAID" badge
3. Switch to Registrations tab
4. Player already shows as paid (auto-synced)
5. Works both directions

---

## Visual Changes

### Roster Modal Player Row

**Unpaid:**
```
┌──────────────────────────────────────────────────────────┐
│ Pete Park │ 3 │ ✓ │ ✓ │ 0 │ ฿2,575 │ [Mark Paid] │ Remove │
└──────────────────────────────────────────────────────────┘
```

**Paid (now with green background):**
```
┌──────────────────────────────────────────────────────────┐
│ Pete Park │ 3 │ ✓ │ ✓ │ 0 │ ฿2,575 │ PAID ✓     │ Remove │  ← bg-green-50
└──────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Roster Modal → Registrations Tab
- [ ] Mark player paid → Registrations tab shows paid
- [ ] Mark player unpaid → Registrations tab shows unpaid
- [ ] Edit fee → Registrations tab shows new fee
- [ ] Remove player → Registrations tab removes player
- [ ] Add player → Registrations tab shows new player

### Registrations Tab → Roster Modal
- [ ] Toggle payment → Roster modal shows update
- [ ] Toggle competition → Roster modal shows update
- [ ] Toggle transport → Roster modal shows update
- [ ] Update fee → Roster modal shows new fee
- [ ] Remove player → Roster modal removes player

### Visual Feedback
- [ ] Paid rows have green background in Roster Modal
- [ ] "PAID" badge displays correctly
- [ ] "Mark Paid" button displays for unpaid players
- [ ] Changes reflect immediately without page refresh

---

## Architecture Notes

The sync is achieved by:
1. Each view has a reference to the current event ID
2. After any data modification, check if the other view exists and is viewing same event
3. If so, call the other view's data loading function
4. Both views query fresh data from database, ensuring consistency

This approach:
- Works even if views are opened/closed independently
- Doesn't require WebSocket or real-time subscriptions between views
- Has minimal performance impact (only refreshes when needed)
- Maintains separation of concerns between the two systems
