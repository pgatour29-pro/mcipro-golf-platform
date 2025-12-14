# Session Catalog: Dashboard Redesign & Caddy Booking System
**Date:** December 14, 2025

## Summary
Redesigned the bottom section of the golfer dashboard, added caddy booking input for events, and fixed multiple navigation/registration bugs.

---

## Changes Made

### 1. Dashboard Bottom Section Redesign
**Location:** `public/index.html` lines 24701-24760

**Removed:**
- "Today's Tee Time" section (not needed)
- "Live Course Status" with GPS (no GPS on platform)

**Added:**
- **Upcoming Events** widget - Shows next 3 events user is REGISTERED for
- **My Caddy Booking** widget - Manual caddy number input per event

**New Modules Created:**
- `DashboardUpcomingEvents` - Loads user's registered events
- `DashboardCaddyBooking` - Saves caddy numbers per event
- `DashboardPerformance` - Shows actual round stats

---

### 2. Caddy Numbers Feature
**Database:** Added `caddy_numbers` column to `event_registrations` table

**SQL Script:** `sql/ADD_CADDY_NUMBERS_COLUMN.sql`
```sql
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS caddy_numbers TEXT;
```

**Files Modified:**

1. **Registration Form HTML** (lines 34758-34769)
   - Added caddy number input field after handicap
   - Text input with placeholder "e.g., 42, 15 (comma separated)"

2. **showRegistrationForm()** (lines 62665-62720)
   - Made async to load existing caddy numbers
   - Pre-fills caddy input for existing registrations
   - Shows "Update Registration" button in edit mode

3. **submitRegistration()** (lines 62830+)
   - Reads caddy numbers from input
   - Saves to database on both UPDATE and INSERT

4. **registerForEvent()** (line 39938)
   - Passes caddyNumbers to registerPlayer()

5. **registerPlayer()** (line 39898)
   - Includes caddy_numbers in database insert

6. **getRegistrations()** (line 39834)
   - Returns caddyNumbers field from database

7. **loadRegisteredPlayers()** (lines 62520-62539)
   - Displays caddy numbers in registered players list
   - Purple text with golfer emoji: "🏌️ Caddy: 42, 15"

---

### 3. Bug Fixes

#### Fix: Duplicate Registration Bug
**Problem:** Clicking "View/Edit Registration" created a new registration instead of updating

**Root Cause:** `editingRegistrationId` wasn't being set when showing form for existing registration

**Fix:** (lines 62414-62431)
```javascript
registerBtn.onclick = async () => {
    // Find and set the user's registration ID for edit mode
    const userId = AppState?.currentUser?.lineUserId;
    if (userId && this.currentEvent?.id) {
        const { data: reg } = await window.SupabaseDB.client
            .from('event_registrations')
            .select('id')
            .eq('event_id', this.currentEvent.id)
            .eq('player_id', userId)
            .maybeSingle();

        if (reg?.id) {
            this.editingRegistrationId = reg.id;
        }
    }
    this.showRegistrationForm();
};
```

#### Fix: Events Not Loading from "View All" Button
**Problem:** Clicking "View All →" from dashboard showed "No events"

**Root Cause:** `TabManager.loadTabData()` didn't have handler for `societyevents` tab

**Fix:** Added societyevents initialization (lines 7527-7537)
```javascript
if (dashboardId === 'golferDashboard' && tabName === 'societyevents') {
    setTimeout(() => {
        if (typeof GolferEventsSystem !== 'undefined') {
            GolferEventsSystem.init();
        }
    }, 100);
}
```

---

## SQL Scripts Created

### 1. ADD_CADDY_NUMBERS_COLUMN.sql
Adds caddy_numbers column to event_registrations table

### 2. FIX_DUPLICATE_REGISTRATION_DEC31.sql
Cleans up duplicate Pete Park registrations

---

## Mistakes Made

1. **Missing database column** - Created code to save caddy_numbers but forgot the column didn't exist in database yet

2. **Display not updated** - Added saving of caddy numbers but didn't update the display to show them

3. **Tab initialization missing** - `societyevents` init was in `showGolferTab()` but not in `TabManager.loadTabData()`, causing events not to load when navigating via "View All" button

4. **Edit mode not set** - When clicking "View/Edit Registration" for existing registration, `editingRegistrationId` wasn't set, causing duplicate registrations

---

## Testing Checklist

- [ ] Run SQL: `ALTER TABLE event_registrations ADD COLUMN IF NOT EXISTS caddy_numbers TEXT;`
- [ ] Register for an event with caddy numbers
- [ ] Verify caddy numbers appear in registered players list
- [ ] Click "View/Edit Registration" and verify it updates (not duplicates)
- [ ] Click "View All →" from dashboard and verify events load
- [ ] Check dashboard widgets load on login

---

## Files Modified
- `public/index.html` - Main application file (multiple sections)
- `sql/ADD_CADDY_NUMBERS_COLUMN.sql` - New SQL script
- `sql/FIX_DUPLICATE_REGISTRATION_DEC31.sql` - New SQL script
