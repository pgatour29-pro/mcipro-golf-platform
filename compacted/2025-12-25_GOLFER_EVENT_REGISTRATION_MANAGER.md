# Golfer Event Registration Manager (2025-12-25)

## Overview
Full event management dashboard for golfer-created events, mirroring the society organizer's Registration page functionality.

## Location
- **HTML**: `public/index.html` lines 28709-29023 (Management Dashboard section)
- **JavaScript**: `public/index.html` lines 76441-77797 (`GolferEventRegManager` object)

## Access
1. Go to **Golfer Dashboard** > **Society Events** tab > **Manage Events** view
2. Click purple **"Manage"** button on any event card
3. Or select event from dropdown in the management dashboard

## Features

### Event Selector (line 28719)
- Dropdown populated with golfer's created events
- Status indicators: 🔴 Today, 🟢 Upcoming, (none) Past
- Auto-selects event when clicking "Manage" button

### Event Details Card (lines 28738-28822)
Editable fields with auto-save:
- Tee Time
- Departure Time
- Course Name
- Entry Fee (base)
- Transport Fee
- Competition Fee
- Calculated totals: Entry Only, +Competition, All Inclusive

### Stats Dashboard (lines 28824-28865)
5 stat cards:
| Stat | Description |
|------|-------------|
| Total Players | Count of registrations |
| Transport | Count needing transport + fee total |
| Competition | Count in competition + fee total |
| Total Revenue | Paid amount (unpaid shown in red) |
| Vans Needed | Calculated: 10/van or 9/van if remainder |

### Player Table (lines 28905-28924)
Columns: #, Name, HCP, Fee + Options, Paid, Actions

**Fee + Options column:**
- Editable fee input (yellow bg if needs recalc)
- Competition toggle button (green=YES, red=NO)
- Transport toggle button (green=YES, red=NO)

**Actions:**
- Toggle payment status (circle checkbox)
- Delete player

### Action Buttons (lines 28877-28893)
| Button | Function |
|--------|----------|
| Add | Opens society's manual player modal |
| Export | Downloads CSV roster |
| Recalc | Recalculates all fees based on current fee structure |
| Broadcast | Opens LINE message modal with templates |

### Waitlist Section (lines 28926-28952)
Expandable section showing waitlisted players:
- Position, Name, HCP, Requested date
- Promote to confirmed
- Remove from waitlist

### Pairings Panel (lines 28955-29013)
Right-side panel with:
- Group size selector (3-somes/4-somes)
- Auto-pair by handicap
- Pair by partner requests
- Print pairing sheet
- Share to LINE

**Groups display:**
- Drag-drop players between groups
- Tee time per group
- Van assignment per group
- Lock/Unlock pairings

## Key Methods

### Initialization
```javascript
GolferEventRegManager.init()           // Load events, populate selector
GolferEventRegManager.showDashboard(eventId)  // Show dashboard, optionally select event
GolferEventRegManager.backToList()     // Return to event list view
```

### Data Loading
```javascript
GolferEventRegManager.loadMyEvents()   // Fetch golfer's created events
GolferEventRegManager.selectEvent(id)  // Load specific event data
GolferEventRegManager.loadEventData(id) // Load registrations, waitlist, pairings
GolferEventRegManager.refreshData()    // Reload current event
```

### Rendering
```javascript
GolferEventRegManager.renderEventDetails()  // Populate event detail inputs
GolferEventRegManager.renderStats()         // Update stat cards
GolferEventRegManager.renderPlayerTable()   // Render registration table
GolferEventRegManager.renderWaitlist()      // Render waitlist table
GolferEventRegManager.renderPairings()      // Render pairings groups
```

### Player Management
```javascript
GolferEventRegManager.openAddPlayerModal()      // Use society's modal
GolferEventRegManager.addPlayerFromDatabase(player)  // Insert registration
GolferEventRegManager.removePlayer(regId)       // Delete registration
GolferEventRegManager.togglePaymentStatus(regId) // Toggle paid/unpaid
GolferEventRegManager.toggleTransport(regId)    // Toggle transport + update fee
GolferEventRegManager.toggleCompetition(regId)  // Toggle competition + update fee
GolferEventRegManager.updateFee(regId, fee)     // Manual fee update
GolferEventRegManager.recalculateAllFees()      // Bulk recalc all fees
```

### Waitlist Management
```javascript
GolferEventRegManager.promoteFromWaitlist(waitId)  // Move to confirmed
GolferEventRegManager.removeFromWaitlist(waitId)   // Delete from waitlist
GolferEventRegManager.toggleWaitlist()             // Expand/collapse section
```

### Pairings Management
```javascript
GolferEventRegManager.autoPairByHandicap()     // Create groups sorted by HCP
GolferEventRegManager.pairByPartnerRequests()  // Honor mutual partner prefs
GolferEventRegManager.movePlayerToGroup(playerId, groupNum)  // Drag-drop
GolferEventRegManager.removeFromGroup(groupNum, playerId)    // Remove player
GolferEventRegManager.updateGroupTeeTime(groupNum, time)     // Set tee time
GolferEventRegManager.updateGroupVan(groupNum, vanNum)       // Set van assignment
GolferEventRegManager.toggleLockPairings()     // Lock/unlock editing
GolferEventRegManager.savePairings()           // Persist to database
```

### Communication
```javascript
GolferEventRegManager.openBroadcastModal()     // Show broadcast UI
GolferEventRegManager.applyBroadcastTemplate(type)  // departure/teetime/reminder/cancel
GolferEventRegManager.sendBroadcastMessage()   // Send LINE messages to all players
GolferEventRegManager.sharePairingsToLine()    // Send pairings to all players
```

### Export
```javascript
GolferEventRegManager.exportRoster()      // Download CSV
GolferEventRegManager.printPairingSheet() // Open print window
```

### Real-Time Sync
```javascript
GolferEventRegManager.subscribeToRealtime(eventId)  // Subscribe to live updates
GolferEventRegManager.unsubscribeFromRealtime()     // Clean up subscriptions
```

## Database Tables Used

### event_registrations
```sql
id, event_id, player_id, player_name, handicap,
want_transport, want_competition, total_fee,
payment_status, amount_paid, paid_at, paid_by,
partner_prefs, created_at
```

### event_waitlist
```sql
id, event_id, player_id, player_name, handicap,
want_transport, want_competition, created_at
```

### event_pairings
```sql
id, event_id, groups (JSONB), group_size,
locked_at, locked_by
```

### society_events (read for event details)
```sql
id, title, course_name, event_date, start_time, departure_time,
entry_fee, transport_fee, competition_fee, max_participants,
creator_type, creator_id
```

## Integration with Society System

### Add Player Modal
When `GolferEventRegManager.openAddPlayerModal()` is called:
1. Sets `SocietyOrganizerSystem.golferEventMode = true`
2. Sets `SocietyOrganizerSystem.golferEventMgr = this`
3. Calls `SocietyOrganizerSystem.openManualPlayerModal('confirmed')`

When user selects a player:
1. `SocietyOrganizerSystem.addPlayerFromDatabase()` checks `golferEventMode`
2. If true, delegates to `GolferEventRegManager.addPlayerFromDatabase()`
3. Universal handicap fetched from `society_handicaps` where `society_id IS NULL`

### Cleanup
`SocietyOrganizerSystem.closeManualPlayerModal()` resets:
- `golferEventMode = false`
- `golferEventMgr = null`

## Fee Calculation

```javascript
calculatePlayerFee(wantTransport, wantCompetition) {
    let total = baseFee;
    if (wantTransport) total += transportFee;
    if (wantCompetition) total += compFee;
    return total;
}
```

**Recalculate All Fees:**
- Loops through all registrations
- Calculates correct fee based on their options
- Updates database if different from stored fee
- Shows count of updated records

## Van Calculation

```javascript
calculateVans(transportCount, totalPlayers) {
    if (transportCount === 0) return 1 van for total players
    if (transportCount <= 10) return 1 van
    if (transportCount % 10 === 0) return transportCount / 10 vans
    else return Math.ceil(transportCount / 9) vans  // Leave room
}
```

## Handicap Display
All handicaps use `window.formatHandicapDisplay()`:
- Negative values (plus handicaps) shown as "+X.X"
- Positive values shown as "X.X"
- Fetches universal handicap from `society_handicaps` where `society_id IS NULL`

## Real-Time Subscriptions (Added 2025-12-25)

The manager subscribes to Supabase real-time changes for automatic UI updates.

### Subscription Methods
```javascript
GolferEventRegManager.subscribeToRealtime(eventId)   // Set up WebSocket subscriptions
GolferEventRegManager.unsubscribeFromRealtime()      // Clean up subscriptions
```

### Subscribed Channels
| Channel | Table | Trigger |
|---------|-------|---------|
| Registrations | `event_registrations` | Player added/removed/updated |
| Waitlist | `event_waitlist` | Waitlist changes |
| Event Details | `society_events` | Fee/time/course changes |

### Lifecycle
1. **selectEvent(eventId)** - Cleans up old subscriptions, sets up new ones
2. **backToList()** - Cleans up subscriptions when leaving management view
3. Subscriptions auto-refresh data when changes detected from any device

### Console Logs
```
[GolferEventRegManager] 🔔 Setting up real-time subscriptions for event: xxx
[GolferEventRegManager] ✅ Subscribed to registrations
[GolferEventRegManager] ✅ Subscribed to waitlist
[GolferEventRegManager] ✅ Subscribed to event changes
[GolferEventRegManager] 🔔 Real-time sync ACTIVE - changes will appear automatically
[GolferEventRegManager] 📥 REAL-TIME: Registration change detected! INSERT
```

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Added ~315 lines HTML (28709-29023), ~1350 lines JS (76441-77797) |

## Related Documentation
- `2025-12-25_HANDICAP_DISPLAY_GLOBAL_FIX.md` - formatHandicapDisplay usage
- `2025-12-25_HANDICAP_DUAL_TABLE_SYNC_DISASTER.md` - Universal vs society handicaps
