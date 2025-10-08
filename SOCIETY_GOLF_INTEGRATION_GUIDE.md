# Society Golf Integration Guide
## MciPro Golf Platform - "Netflix of Golf" Event System

### Overview
This guide details the integration of the Society Golf event management system into the MciPro Golf Platform. The system enables organizers to create events, golfers to register with 1-2 clicks, automatic waitlist management, and sophisticated pairing tools.

---

## What's Been Completed

### 1. Database Schema Created ✓
**File:** `society-golf-schema.sql`

**Tables Created:**
- `society_events` - Event information (name, date, fees, limits)
- `event_registrations` - Player registrations with partner preferences
- `event_waitlist` - Waitlist queue with auto-promotion
- `event_pairings` - Group pairings with lock functionality

**Key Features:**
- Auto-promotion trigger: Automatically moves waitlist → confirmed when spots open
- Cascade deletes: When event deleted, all related data auto-deletes
- Realtime sync enabled on all tables
- Proper indexes for performance

**Action Required:** Run `society-golf-schema.sql` in Supabase SQL Editor

### 2. Analyzed Existing HTML Files ✓
**Files Reviewed:**
- `societygolf/organizer_dashboard (3).html` - Event creation & management
- `societygolf/pairings_module (3).html` - Drag & drop pairing system
- `societygolf/golfer_registration (5).html` - 1-click registration UI

**Current Tech Stack:**
- React 18 with Babel
- Tailwind CSS
- localStorage for data persistence

**Required Conversion:**
- React → Vanilla JavaScript (to match main app)
- localStorage → Supabase realtime sync
- Standalone HTML → Integrated dashboard sections

---

## What Needs to Be Integrated

### 1. Add Society Organizer Role

**Locations to Update:**

#### A. Dashboard Role Mappings
Add to all dashboard map objects:
```javascript
'society_organizer': 'societyOrganizerDashboard'
```

**Files/Lines:**
- `index.html` line 3917-3923
- `index.html` line 4231-4237
- `index.html` line 26314-26320
- `index.html` line 26436-26442

#### B. DevMode Role Switcher
Add button to DevMode panel:
```javascript
<button onclick="DevMode.switchToRole('society_organizer')">Society Organizer</button>
```

---

### 2. Create Society Organizer Dashboard

**Location:** After `adminDashboard` section (around line 24400)

**Structure:**
```html
<div id="societyOrganizerDashboard" class="screen">
  <div class="mx-auto max-w-7xl p-4 lg:p-8">
    <!-- Header -->
    <header class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Society Organizer Dashboard</h1>
      <p class="text-gray-600">Manage events, registrations, and pairings</p>
    </header>

    <!-- Tabs -->
    <nav class="bg-white border-b border-gray-200 mb-6">
      <div class="flex space-x-8">
        <button onclick="showOrganizerTab('events', event)" class="tab-button active">
          Events
        </button>
        <button onclick="showOrganizerTab('calendar', event)" class="tab-button">
          Calendar
        </button>
      </div>
    </nav>

    <!-- Tab: Events -->
    <div id="organizerTab-events" class="tab-content">
      <!-- Event creation form -->
      <!-- Event list -->
      <!-- Roster viewer -->
    </div>

    <!-- Tab: Calendar -->
    <div id="organizerTab-calendar" class="tab-content" style="display: none;">
      <!-- Calendar view -->
    </div>
  </div>
</div>
```

**Required JavaScript Functions:**
- `showOrganizerTab(tabName, event)` - Tab switching
- `SocietyEventManager.createEvent(eventData)` - Create event in Supabase
- `SocietyEventManager.updateEvent(eventId, updates)` - Update event
- `SocietyEventManager.deleteEvent(eventId)` - Delete event
- `SocietyEventManager.viewRoster(eventId)` - Show roster modal
- `SocietyEventManager.exportRegistrations(eventId)` - Export to CSV

---

### 3. Add Events Tab to Golfer Dashboard

**Location:** Golfer Dashboard Schedule Section

**Current Schedule Tab:** Line ~20200-20600 (needs inspection)

**New Structure:**
```html
<!-- Inside Golfer Dashboard Schedule Tab -->
<div class="mb-6">
  <div class="flex space-x-4 border-b border-gray-200">
    <button onclick="showScheduleView('bookings')" class="schedule-view-button active">
      My Bookings
    </button>
    <button onclick="showScheduleView('events')" class="schedule-view-button">
      Society Events
    </button>
  </div>
</div>

<!-- View: My Bookings (existing) -->
<div id="scheduleView-bookings" class="schedule-view">
  <!-- Existing booking list -->
</div>

<!-- View: Society Events (NEW) -->
<div id="scheduleView-events" class="schedule-view" style="display: none;">
  <div id="societyEventsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Event cards will be rendered here -->
  </div>
</div>
```

**Required JavaScript Functions:**
- `showScheduleView(viewName)` - Switch between bookings/events
- `SocietyEventsBrowser.loadEvents()` - Fetch from Supabase
- `SocietyEventsBrowser.renderEventCard(event)` - Display event card
- `SocietyEventsBrowser.registerForEvent(eventId)` - 1-click registration
- `SocietyEventsBrowser.joinWaitlist(eventId)` - Join waitlist
- `SocietyEventsBrowser.selectPartners(eventId)` - Choose up to 3 partners

---

### 4. Create Supabase Integration Module

**File:** `society-golf-supabase.js` (new file)

**Required Functions:**

#### Events Management
```javascript
class SocietyGolfSupabase {
  // Events
  async getEvents() { ... }
  async getEvent(eventId) { ... }
  async createEvent(eventData) { ... }
  async updateEvent(eventId, updates) { ... }
  async deleteEvent(eventId) { ... }

  // Registrations
  async getRegistrations(eventId) { ... }
  async registerPlayer(eventId, playerData) { ... }
  async updateRegistration(regId, updates) { ... }
  async deleteRegistration(regId) { ... }

  // Waitlist
  async getWaitlist(eventId) { ... }
  async joinWaitlist(eventId, playerData) { ... }
  async removeFromWaitlist(waitId) { ... }

  // Pairings
  async getPairings(eventId) { ... }
  async savePairings(eventId, pairingsData) { ... }
  async lockPairings(eventId) { ... }

  // Realtime subscriptions
  subscribeToEvent(eventId, callback) { ... }
  subscribeToRegistrations(eventId, callback) { ... }
  unsubscribeAll() { ... }
}
```

---

### 5. Create Pairings Module

**Location:** Modal overlay system (similar to existing modals)

**Structure:**
```html
<!-- Pairings Modal -->
<div id="pairingsModal" class="modal-backdrop">
  <div class="modal-container max-w-7xl">
    <div class="modal-header">
      <h2>Pairings - <span id="pairingsEventName"></span></h2>
      <button onclick="closePairingsModal()">×</button>
    </div>

    <div class="modal-body">
      <!-- Controls -->
      <div class="flex items-center gap-4 mb-4">
        <label>Group Size: <input type="number" id="groupSize" value="4" /></label>
        <label># Groups: <input type="number" id="numGroups" value="4" /></label>
        <button onclick="applyPartnerRequests()">Apply Partner Requests</button>
        <button onclick="clearGroups()">Clear</button>
        <button onclick="lockAndPrint()">Lock & Print</button>
      </div>

      <!-- Unassigned Players (drag source) -->
      <div id="unassignedPlayers" class="grid grid-cols-3 gap-2 mb-6">
        <!-- Draggable player badges -->
      </div>

      <!-- Groups (drop targets) -->
      <div id="pairingGroups" class="grid grid-cols-2 gap-4">
        <!-- Group cards -->
      </div>
    </div>
  </div>
</div>
```

**Required JavaScript:**
- Drag & drop functionality
- Partner preference algorithm (mutual pairs prioritized)
- Print stylesheet
- Lock/unlock logic

---

### 6. Create Registration Flow

**Components:**

#### A. Event Card Display
```javascript
function renderEventCard(event) {
  const isFull = event.max_players && registrations.length >= event.max_players;
  const userRegistered = registrations.some(r => r.player_id === AppState.currentUser.lineUserId);

  return `
    <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div class="bg-gradient-to-r from-sky-600 to-sky-400 text-white p-4">
        <div class="text-sm">${event.date}</div>
        <div class="text-xl font-bold">${event.name}</div>
      </div>
      <div class="p-4">
        <div class="grid grid-cols-3 gap-2 text-center mb-4">
          <div>
            <div class="text-xs text-gray-500">Max</div>
            <div class="font-bold">${event.max_players || '—'}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Registered</div>
            <div class="font-bold">${registrations.length}</div>
          </div>
          <div>
            <div class="text-xs text-gray-500">Spots</div>
            <div class="font-bold">${event.max_players ? (event.max_players - registrations.length) : '—'}</div>
          </div>
        </div>

        ${!userRegistered && !isFull ? `
          <button onclick="registerForEvent('${event.id}')" class="btn-primary w-full">
            Register Now
          </button>
        ` : ''}

        ${!userRegistered && isFull ? `
          <button onclick="joinWaitlist('${event.id}')" class="btn-warning w-full">
            Join Waitlist
          </button>
        ` : ''}

        ${userRegistered ? `
          <button onclick="selectPartners('${event.id}')" class="btn-success w-full">
            Select Partners
          </button>
        ` : ''}
      </div>
    </div>
  `;
}
```

#### B. Registration Modal
```html
<div id="registrationModal" class="modal-backdrop">
  <div class="modal-container max-w-2xl">
    <div class="modal-header">
      <h2>Register - <span id="regEventName"></span></h2>
    </div>
    <div class="modal-body">
      <!-- Name & Handicap (pre-filled from profile) -->
      <input id="regName" type="text" value="${AppState.currentUser.name}" />
      <input id="regHandicap" type="number" placeholder="Handicap" />

      <!-- Fee Breakdown -->
      <div class="bg-gray-50 rounded-lg p-4 mb-4">
        <div class="flex justify-between">
          <span>Green Fee</span>
          <span id="feeGreen">฿0</span>
        </div>
        <!-- More fees... -->
      </div>

      <!-- Optional Services -->
      <label>
        <input type="checkbox" id="wantTransport" />
        Transportation (+฿<span id="feeTransport">0</span>)
      </label>
      <label>
        <input type="checkbox" id="wantCompetition" />
        Competition (+฿<span id="feeCompetition">0</span>)
      </label>

      <!-- Total -->
      <div class="text-xl font-bold">
        Total: ฿<span id="feeTotal">0</span>
      </div>

      <button onclick="confirmRegistration()">Confirm Registration</button>
    </div>
  </div>
</div>
```

#### C. Partner Selection Interface
```javascript
function renderPartnerSelector(eventId, myRegistrationId) {
  const allPlayers = registrations.filter(r => r.paired_group === null);
  const myPrefs = registrations.find(r => r.id === myRegistrationId)?.partner_prefs || [];

  return allPlayers.map(player => {
    const isMe = player.id === myRegistrationId;
    const isSelected = myPrefs.includes(player.id);

    return `
      <button
        onclick="togglePartnerSelection('${player.id}')"
        class="partner-card ${isMe ? 'border-sky-600' : ''} ${isSelected ? 'bg-emerald-50' : ''}">
        <span>${player.player_name}</span>
        <span class="handicap-badge">${Math.round(player.handicap)}</span>
      </button>
    `;
  }).join('');
}
```

---

## Implementation Steps

### Step 1: Database Setup
1. Open Supabase SQL Editor
2. Run `society-golf-schema.sql`
3. Verify tables created
4. Check realtime publication enabled

### Step 2: Supabase Integration
1. Create `society-golf-supabase.js`
2. Implement all CRUD functions
3. Add realtime subscription handlers
4. Test with console commands

### Step 3: Society Organizer Dashboard
1. Add `societyOrganizerDashboard` HTML section to `index.html`
2. Create `showOrganizerTab()` function
3. Implement event creation form
4. Implement event list display
5. Add roster viewer modal
6. Test creating/editing/deleting events

### Step 4: Golfer Events Tab
1. Modify Golfer Dashboard Schedule tab
2. Add Events/Bookings view switcher
3. Implement event browser grid
4. Create registration modal
5. Create partner selection interface
6. Test registration flow

### Step 5: Pairings Module
1. Create pairings modal HTML
2. Implement drag & drop functionality
3. Add partner preference algorithm
4. Create print stylesheet
5. Test pairing workflow

### Step 6: Testing & Polish
1. Test full workflow: Create event → Register → Select partners → View pairings
2. Test waitlist auto-promotion
3. Test realtime sync across devices
4. Mobile responsiveness
5. Error handling

---

## Technical Considerations

### Data Flow
```
Organizer Creates Event
  ↓
Event saved to Supabase (society_events)
  ↓
Realtime broadcast to all connected clients
  ↓
Golfers see event in Events tab
  ↓
Golfer registers (1-click)
  ↓
Registration saved (event_registrations)
  ↓
If event full → waitlist (event_waitlist)
  ↓
Organizer creates pairings
  ↓
Pairings locked & saved (event_pairings)
  ↓
Print T-sheet
```

### Realtime Sync Strategy
- Subscribe to `society_events` on organizer dashboard mount
- Subscribe to `event_registrations` when viewing roster
- Subscribe to `event_waitlist` for auto-promotion notifications
- Unsubscribe on dashboard unmount

### State Management
```javascript
const SocietyGolfState = {
  currentEvent: null,
  myRegistrations: [],
  availableEvents: [],
  activeSubscriptions: []
};
```

---

## File Structure

```
MciPro/
├── index.html (MODIFY)
│   ├── Add societyOrganizerDashboard section
│   ├── Modify golferDashboard schedule tab
│   └── Add role mappings
│
├── society-golf-supabase.js (NEW)
│   └── All Supabase CRUD operations
│
├── society-golf-schema.sql (NEW - COMPLETED)
│   └── Database tables
│
└── societygolf/ (REFERENCE)
    ├── organizer_dashboard (3).html
    ├── pairings_module (3).html
    └── golfer_registration (5).html
```

---

## Estimated Effort

- **Database Setup:** 10 minutes
- **Supabase Integration Module:** 2-3 hours
- **Society Organizer Dashboard:** 3-4 hours
- **Golfer Events Tab:** 2-3 hours
- **Pairings Module:** 3-4 hours
- **Testing & Polish:** 2-3 hours

**Total:** 12-17 hours of focused development

---

## Next Steps

**Option A: Full Integration**
I can proceed with implementing all components step-by-step. This will require multiple file edits to index.html and creating new JavaScript modules.

**Option B: Modular Approach**
Create each component as a standalone module first, then integrate piece by piece. This allows for testing each component independently.

**Option C: Hybrid Approach**
Use the existing HTML files as-is but modify them to use Supabase instead of localStorage, then create a simple iframe integration into the main app.

---

## Ready to Proceed?

The database schema is ready to deploy. Once you run `society-golf-schema.sql` in Supabase, I can begin integrating the UI components into the main platform.

Which approach would you prefer?
