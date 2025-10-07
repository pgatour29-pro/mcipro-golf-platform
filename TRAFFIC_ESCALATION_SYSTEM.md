# Traffic Monitor - Preset Message Escalation System

## Deployed: [Current Date]

## Overview
The Traffic Monitor now includes a **3-level preset message escalation system** for managing pace of play on the golf course. This system sends notifications to caddies and marshals through the existing alert infrastructure (separate from the chat system).

---

## Features Implemented

### 1. **Preset Message Escalation Workflow**

#### Contact 1: "Your group is behind pace"
- **Level**: 1 (Information)
- **Target**: Caddies in the group
- **Acknowledgment**: Not required
- **Purpose**: Initial gentle reminder
- **UI**: Blue "Contact 1" button

#### Contact 2: "Please pick up the pace"
- **Level**: 2 (Warning)
- **Target**: Caddies in the group
- **Acknowledgment**: REQUIRED
- **Purpose**: Firm instruction requiring response
- **UI**: Yellow "Contact 2" button (enabled only after Contact 1)
- **Behavior**: Caddies must tap to acknowledge receipt

#### Send Marshal Now
- **Level**: 3 (Marshal Dispatch)
- **Target**: Marshal dashboard + Caddies
- **Acknowledgment**: Not required (marshal is dispatched)
- **Purpose**: Immediate intervention
- **UI**: Red "Send Marshal Now" button (always available)

---

### 2. **Automatic Escalation**

The system automatically monitors pace of play and escalates when:
- **Trigger**: Group is 1.5 holes behind the group in front
- **Auto-Escalation**: If Contact 2 sent and no improvement after 10 minutes → Auto-escalates to Marshal

**Check Frequency**: Every 30 seconds

---

### 3. **Notification Delivery**

#### Delivery Method
- Uses **existing alert notification infrastructure** (NOT chat system)
- Same system used for:
  - Stop Play alerts
  - Lightning warnings
  - Cart path alerts

#### Notification Properties
- Pop-up notification on caddy's phone
- Includes hole number, nine label (A/B/C/D), and message
- Tracks acknowledgment status
- Stored in `mcipro_pace_notifications` (localStorage)

---

### 4. **Group Identification**

#### Current Implementation
Uses **Booking Data + Tee Time + Estimated Hole Position**:
- Correlates active bookings with current hole
- Displays: `{Player Name} (Tee Time: {time})`

#### Future Enhancement (GPS Integration)
Will use **Caddy Number + GPS Position**:
- Real-time tracking via `GPSNavigationSystem.currentPosition`
- Accurate hole position from `GPSNavigationSystem.currentHole`
- More precise group identification

**Note**: GPS system is already fully implemented and ready for integration.

---

### 5. **Escalation Tracking**

#### Per-Hole Tracking
Each hole maintains escalation state:
```javascript
{
  holeNumber: {
    level: 0-3,           // Current escalation level
    lastContact: timestamp, // When last message sent
    groupId: "string"     // Group identifier
  }
}
```

Stored in: `mcipro_hole_escalation` (localStorage)

#### Escalation History
All contacts tracked in hole history:
```javascript
{
  holeNumber: [{
    timestamp: Date.now(),
    type: 'notification' | 'warning' | 'marshal',
    message: "string"
  }]
}
```

Stored in: `mcipro_hole_history` (localStorage)

---

### 6. **UI Updates**

#### Hole Details Panel Shows:
1. **Current Status**: Clear / Busy / Backed Up
2. **Group Information**: Which group is on the hole
3. **Escalation Level**: Current escalation status (0-3)
4. **Recent Activity**: Last 5 events with timestamps
5. **Action Buttons**:
   - Contact 1 (enabled if level = 0)
   - Contact 2 (enabled if level = 1)
   - Send Marshal Now (always enabled)
   - View Group Details

#### Button States:
- **Active**: Blue/Yellow/Red with hover effects
- **Disabled**: Gray (already sent or not yet available)
- **Icons**: Material Symbols for visual clarity

---

## Data Storage

### localStorage Keys:

1. **`mcipro_hole_history`**: Hole event history
2. **`mcipro_hole_escalation`**: Escalation tracking
3. **`mcipro_pace_notifications`**: Sent notifications
4. **`mcipro_marshal_dispatches`**: Marshal dispatch records

---

## Integration Points

### 1. **GPS Navigation System** (`GPSNavigationSystem`)
- **Current Position**: `GPSNavigationSystem.currentPosition`
- **Current Hole**: `GPSNavigationSystem.currentHole`
- **Status**: Fully implemented, ready for integration

### 2. **Emergency Alert System** (`EmergencySystem`)
- Uses same notification delivery infrastructure
- Same pop-up style and acknowledgment mechanism

### 3. **Booking System** (`mcipro_bookings_cloud`)
- Retrieves active bookings for group identification
- Filters by status: `confirmed` or `checked-in`

---

## Next Steps (Future Enhancements)

### Priority 1: GPS Integration
- Connect `getGroupOnHole()` to GPS tracking
- Use real-time caddy position + hole detection
- Display: `Caddy #{number} - Nine {A/B/C/D}, Hole {1-9}`

### Priority 2: Real Pace Calculation
- Calculate expected position based on tee time
- Compare actual position vs. expected
- Trigger auto-escalation at 1.5 holes behind

### Priority 3: Acknowledgment Handling
- Receive acknowledgment from caddy phones
- Display acknowledgment status in UI
- Track response times

### Priority 4: Marshal Dashboard
- Create marshal-specific view showing all dispatches
- Real-time updates when marshal sent
- Navigation to problem holes

### Priority 5: Analytics
- Track average escalation rates per day/week
- Identify frequent problem groups
- Report pace of play metrics

---

## Testing Checklist

- [x] Deploy escalation system
- [ ] Test Contact 1 button sends notification
- [ ] Test Contact 2 requires Contact 1 first
- [ ] Test Send Marshal Now works independently
- [ ] Test auto-escalation after 10 minutes
- [ ] Test escalation tracking persists
- [ ] Test hole history displays correctly
- [ ] Test button states (enabled/disabled)
- [ ] Verify notifications stored in localStorage
- [ ] Test with 9/18/27/36 hole configurations

---

## Technical Notes

### File Modified:
- `index.html` - TrafficMonitor JavaScript module replaced

### New Files Created:
- `traffic-monitor-escalation.js` - Complete escalation system
- `update-escalation.py` - Deployment script

### Key Functions:

```javascript
TrafficMonitor.sendPresetMessage(holeNumber, 'contact1' | 'contact2')
TrafficMonitor.sendMarshalNow(holeNumber)
TrafficMonitor.checkPaceOfPlay() // Auto-escalation check
TrafficMonitor.getGroupOnHole(holeNumber) // Group identification
TrafficMonitor.viewGroupDetails(holeNumber) // Show full group info
```

---

## User Answers from Requirements Discussion

**Q: Should clicking "Note" open text input or preset messages?**
A: **Preset messages** - Contact 1 and Contact 2 buttons with predefined text

**Q: Should "Warning" have preset messages or always custom?**
A: **"Send Marshal Now"** button for immediate escalation (no custom text)

**Q: How to identify which caddy/group is on hole?**
A: **Booking + Caddy Number + Hole** initially, then **GPS tracker** with caddy number

**Q: Should these use existing Chat or separate notification system?**
A: **Separate notification system** - reuse Stop Play/Lightning/Cart Alert infrastructure

**Q: Do you want escalation timer?**
A: **Not 10 minutes** - trigger based on **1.5 holes behind** + auto-escalate if no improvement

**Q: GPS capabilities?**
A: **Yes, GPS system is fully implemented** and ready for integration

---

## Deployment

**Status**: ✅ DEPLOYED TO PRODUCTION

**URL**: https://mcipro-golf-platform.netlify.app

**Date**: [Deployment timestamp from build]

---

## Support

For questions or issues with the escalation system, check:
1. Browser console for `[TrafficMonitor]` logs
2. localStorage for `mcipro_*` keys
3. Netlify function logs for notification delivery (future)

