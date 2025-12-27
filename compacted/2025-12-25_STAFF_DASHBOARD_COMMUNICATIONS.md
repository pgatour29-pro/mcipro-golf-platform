# Staff Dashboard Communications System - Complete Catalog
## Date: 2025-12-25
## Version: 2025-12-25-STAFF-COMMS-V2

---

## Overview

Replaced generic messaging system with golf-facility-specific communication tools for all staff dashboards:
- Manager Dashboard
- Pro Shop Dashboard
- Maintenance Dashboard
- Caddy Dashboard

---

## Files Modified

### 1. `public/index.html`
- **Lines 32944-33126**: Manager Messages Tab HTML (Departments, Escalations, Requests, Sent)
- **Lines 34161-34322**: Proshop Messages Tab HTML (Customer Orders, Inquiries, Rentals, Management)
- **Lines 34989-35185**: Maintenance Messages Tab HTML (Work Orders, Course Updates, Equipment, Crew Chat)
- **Lines 31842-32050**: Caddy Messages Tab HTML (Assignments, My Golfer, On-Course, Caddy Room)
- **Lines 68601-69325**: JavaScript modules (ManagerComms, ProshopComms, MaintComms, CaddyComms)

### 2. `public/sw.js`
- **Line 4**: Updated `SW_VERSION = 'staff-comms-v2'`

---

## Manager Dashboard - Course Communications

### HTML Structure (Lines 32944-33126)
```html
<div id="manager-messages" class="tab-content hidden">
    <!-- Sub-tabs: Departments, Escalations, Requests, Sent -->
    <!-- Department Channels: Caddy Master, Pro Shop, Maintenance, F&B, Starter, All Staff -->
</div>
```

### JavaScript Module: `ManagerComms` (Lines 68604-68744)
```javascript
const ManagerComms = {
    currentTab: 'departments',
    showTab(tabName),           // Tab switching with visual feedback
    openBroadcastModal(),       // Modal for course-wide broadcasts
    sendBroadcast(),            // Send to selected recipients
    openDeptChat(dept),         // Open department channel chat
    sendDeptMessage(dept),      // Send message in dept chat
    filterRequests(filter)      // Filter staff requests
};
window.ManagerComms = ManagerComms;
```

### Features
- **Departments Tab**: 6 channel cards (Caddy Master, Pro Shop, Maintenance, F&B, Starter, All Staff)
- **Escalations Tab**: Issues requiring manager attention
- **Requests Tab**: Staff requests with filters (Leave, Supplies, Equipment, Other)
- **Sent Tab**: Broadcast history
- **Broadcast Modal**: Recipients dropdown, priority selector, message textarea

---

## Pro Shop Dashboard - Pro Shop Communications

### HTML Structure (Lines 34161-34322)
```html
<div id="proshop-messages" class="tab-content hidden">
    <!-- Sub-tabs: Customer Orders, Inquiries, Rentals, Management -->
    <!-- Rental tracking cards, inquiry examples, quick reports -->
</div>
```

### JavaScript Module: `ProshopComms` (Lines 68751-68871)
```javascript
const ProshopComms = {
    currentTab: 'customers',
    showTab(tabName),           // Tab switching
    notifyCustomer(),           // Modal to notify customers
    sendNotification(),         // Send customer notification
    filterOrders(filter),       // Filter pending/ready/all orders
    reportToMgmt(type),         // Quick reports modal
    submitReport(type)          // Submit management report
};
window.ProshopComms = ProshopComms;
```

### Features
- **Customer Orders Tab**: Pending/Ready/All filters, order cards
- **Inquiries Tab**: Customer questions with Reply/Mark Resolved actions
- **Rentals Tab**: Golf carts out, overdue returns, club rentals due
- **Management Tab**: Quick report buttons (Low Stock, High Traffic, Report Issue, Supply Request)
- **Notify Customer Modal**: Type dropdown, customer search, message

---

## Maintenance Dashboard - Course Maintenance Comms

### HTML Structure (Lines 34989-35185)
```html
<div id="maintenance-messages" class="tab-content hidden">
    <!-- Sub-tabs: Work Orders, Course Updates, Equipment, Crew Chat -->
    <!-- Quick condition reports, equipment status dashboard -->
</div>
```

### JavaScript Module: `MaintComms` (Lines 68878-69139)
```javascript
const MaintComms = {
    currentTab: 'work-orders',
    showTab(tabName),           // Tab switching
    reportCondition(),          // Full condition report modal
    submitCondition(),          // Submit condition report
    filterOrders(filter),       // Filter work orders
    quickReport(area),          // Quick status modal (greens/fairways/bunkers)
    submitQuickReport(area, status),
    reportHazard(),             // Detailed hazard report modal
    submitHazard(),             // Submit hazard
    reportEquipment(equipId),   // Update equipment status
    reportEquipmentIssue(),     // Equipment issue modal
    submitEquipmentIssue(),     // Submit equipment issue
    sendCrewMessage()           // Live crew chat
};
window.MaintComms = MaintComms;
```

### Features
- **Work Orders Tab**: Priority filters (Urgent, Today, Scheduled, All), task cards
- **Course Updates Tab**: Quick report buttons (Greens, Fairways, Bunkers, Hazard), status history
- **Equipment Tab**: Status dashboard (Operational/Maintenance/Down), alerts list
- **Crew Chat Tab**: Real-time team messaging with chat interface

---

## Caddy Dashboard - Caddy Communications

### HTML Structure (Lines 31842-32050)
```html
<div id="caddie-messages" class="tab-content hidden">
    <!-- Sub-tabs: Assignments, My Golfer, On-Course, Caddy Room -->
    <!-- Assignment cards, quick request buttons, location tracker -->
</div>
```

### JavaScript Module: `CaddyComms` (Lines 69145-69324)
```javascript
const CaddyComms = {
    currentTab: 'assignments',
    showTab(tabName),           // Tab switching
    requestAssistance(),        // Assistance modal (backup, relief, emergency, question)
    sendAssistanceRequest(type),// Send assistance request
    quickRequest(item),         // Quick on-course requests
    reportIssue(type),          // Report hazard/slow-play/condition modal
    submitIssue(type),          // Submit issue report
    updateLocation(),           // Location update modal (holes 1-18 grid)
    setLocation(hole),          // Set current hole
    viewCaddyList(),            // View all caddies
    sendRoomMessage()           // Live caddy room chat
};
window.CaddyComms = CaddyComms;
```

### Features
- **Assignments Tab**: Today's assignments, upcoming week schedule
- **My Golfer Tab**: Current golfer info, recent golfers with ratings
- **On-Course Tab**: Quick requests (Water, Towels, Medical, Beverage Cart), issue reporting (Hazard, Slow Play, Condition), location tracker
- **Caddy Room Tab**: Group chat with caddy master and fellow caddies

---

## Modal Designs

### Broadcast Modal (Manager)
- Recipients: All Staff, Caddies Only, Pro Shop Only, Maintenance Only, All Golfers
- Priority: Normal, Important, Urgent
- Message textarea

### Notify Customer Modal (Pro Shop)
- Types: Order Ready, Rental Reminder, Item Available, Custom
- Customer search
- Additional message

### Report Condition Modal (Maintenance)
- Area: Greens, Fairways, Bunkers, Tee Boxes, Rough, Cart Paths, Practice Area
- Holes affected
- Condition: Excellent, Good, Fair, Needs Attention, Closed
- Notes

### Hazard Report Modal (Maintenance)
- Location input
- Type: Fallen Tree, Water/Flooding, Equipment, Wildlife, Damage, Other
- Description
- Urgent checkbox

### Assistance Request Modal (Caddy)
- Backup Caddy
- Relief
- Emergency
- Question for Caddy Master

### Location Update Modal (Caddy)
- 6x3 grid of holes 1-18
- "At Clubhouse" option

---

## CSS Classes Used

- `.tab-content` - Content container (hidden by default)
- `.msg-subcontent` - Sub-tab content
- `.bg-gradient-to-br` - Gradient backgrounds for cards
- `.rounded-xl` - Rounded corners
- `.hover:shadow-md` - Hover effects
- `.transition-colors` - Smooth color transitions

---

## Previous Issues Fixed

1. **ManagerComms is not defined** - Added JavaScript module
2. **ProshopComms is not defined** - Added JavaScript module
3. **MaintComms is not defined** - Added JavaScript module
4. **CaddyComms is not defined** - Added JavaScript module

---

## Deployment

```bash
# Deploy to Vercel
vercel --prod --yes

# Alias to production domains
vercel alias <deployment-url> mycaddipro.com
vercel alias <deployment-url> www.mycaddipro.com
```

---

## Console Logs

```
[ManagerComms] ✅ Module loaded
[ProshopComms] ✅ Module loaded
[MaintComms] ✅ Module loaded
[CaddyComms] ✅ Module loaded
```

---

## What Was Removed

The old generic messaging system with these sub-tabs was removed from all staff dashboards:
- Announcements
- Direct Messages
- Staff Messages

The old green chat button calling `window.openProfessionalChat()` was also previously removed.

---

## Testing Checklist

- [ ] Manager: Click all department channels, open broadcast modal
- [ ] Manager: Switch between Departments/Escalations/Requests/Sent tabs
- [ ] Proshop: Notify customer modal opens and closes
- [ ] Proshop: Filter buttons work on Customer Orders tab
- [ ] Proshop: Management quick report buttons open modals
- [ ] Maintenance: Work order filters work
- [ ] Maintenance: Quick report buttons (greens/fairways/bunkers) open status modal
- [ ] Maintenance: Crew chat message sending works
- [ ] Caddy: Assistance request modal opens with all options
- [ ] Caddy: Quick request buttons show notifications
- [ ] Caddy: Location update modal shows hole grid
- [ ] Caddy: Caddy room chat message sending works
