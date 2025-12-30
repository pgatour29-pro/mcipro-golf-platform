# Session Fixes - 2025-12-30
**Date:** 2025-12-30

---

## Fix 1: Caddy Booking Auto-Confirm
**Issue:** Caddy bookings showing "pending" instead of auto-confirming

## Problem
When a golfer booked an available caddy, the booking status was set to "pending" instead of being auto-confirmed in real-time as per system protocol.

## Root Cause
1. **Original code** at line 67646 checked `caddy.availability_status === 'available'`
2. **Problem:** Many caddies had `null` or `undefined` availability_status (default state)
3. **Result:** Null/undefined !== 'available', so bookings were set to 'pending'

## Fix Applied
**File:** `public/index.html` (line ~67646)

**Before:**
```javascript
const isAvailable = caddy.availability_status === 'available';
```

**After:**
```javascript
// Also treat undefined/null as available (default state)
const isAvailable = !caddy.availability_status || caddy.availability_status === 'available';
```

## Booking Flow (Corrected)
1. Golfer selects available caddy
2. System checks `availability_status`:
   - `null`, `undefined`, or `'available'` → Auto-confirm booking
   - `'booked'` or other → Set to pending, await caddy confirmation
3. If auto-confirmed:
   - Booking status = 'confirmed'
   - `confirmed_at` timestamp set
   - Caddy's `availability_status` updated to 'booked'
   - Success notification: "Booking confirmed for [caddy name]!"
4. Caddy dashboard and golf course updated in real-time

## Database Updates Made
Updated 3 existing bookings:
- `5ce5b63e-...` (2025-12-30 Royal Lakeside) → status: confirmed
- `9d02f2ee-...` (2025-11-13 Bangpra) → status: cancelled (past date)
- `e3002dbe-...` (2025-11-03 Thai Country Club) → status: cancelled (past date)

## Debug Logging Added
```javascript
console.log('[GolferCaddyBooking] Caddy found:', caddy.name, 'availability_status:', caddy.availability_status);
```

## Related Code Sections
- **Booking creation:** lines 67641-67698
- **Booking status logic:** line 67646
- **Caddy status update:** lines 67671-67677
- **Success notifications:** lines 67684-67688

## Files Modified
- `public/index.html` - Auto-confirm logic fix

## Deployment
- Git commit: `Fix: treat null availability_status as available for auto-confirm booking`
- Deployed to Vercel production

---

## Fix 2: Event Edit Badge Not Showing on Dashboard
**Issue:** When organizer edits an event, LINE notification sent but no badge/indicator on golfer dashboard

## Problem
When an event was edited:
1. LINE notification was sent (working)
2. But no badge appeared on the Society Events cube on the dashboard
3. User had to manually check Events tab to see changes

## Root Cause
The `subscribeToEventChanges()` method (which listens for event edits and updates badges) only ran when user opened the Society Events tab via `GolferEventsSystem.init()`.

If user was on dashboard overview, no subscription was active to detect event changes.

## Fix Applied
**File:** `public/index.html` (lines ~78061-78124)

Added new method `setupEarlyEventSubscription()` that:
1. Runs immediately on page load (along with `setupBadgeSubscription`)
2. Subscribes to `society_events` table changes via Supabase real-time
3. Shows toast notification with event name: "📅 [Event Name] has been updated"
4. Reloads events in background and updates the Society Events badge

**Initialization (lines ~78128-78139):**
```javascript
// CRITICAL: Set up badge subscription EARLY so it works before user opens Events view
window.GolferEventsSystem.setupBadgeSubscription();

// CRITICAL: Also subscribe to event changes EARLY for dashboard badge updates
window.GolferEventsSystem.setupEarlyEventSubscription();
```

**New Method:**
```javascript
setupEarlyEventSubscription() {
    // Subscribe to society_events table changes
    const subscription = window.SupabaseDB.client
        .channel('early_society_events_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'society_events'
        }, async (payload) => {
            // Show notification with event name
            if (payload.eventType === 'UPDATE') {
                const eventName = payload.new?.title || 'An event';
                NotificationManager.show(`📅 ${eventName} has been updated`, 'info', 4000);
            }
            // Reload events and update badge
            const events = await window.SocietyGolfDB.getAllPublicEvents();
            const { newCount, updatedCount } = EventNotificationSystem.countNotifications(events);
            EventNotificationSystem.updateCubeBadge(newCount, updatedCount);
        })
        .subscribe();
}
```

## Notification Flow (Corrected)
When organizer edits an event, golfer now sees:
1. **LINE Push Notification** - "📝 EVENT EDITED..." (existing)
2. **Dashboard Toast** - "📅 [Event Name] has been updated" (NEW)
3. **Society Events Badge** - Shows "X updated" count (NEW)

## Files Modified
- `public/index.html` - Added `setupEarlyEventSubscription()` method

## Deployment
- Git commit: `Add early event subscription for dashboard badge updates on event edits`
- Deployed to Vercel production

---

## Fix 3: Pete Park Handicap Showing Wrong Values (1.5/2.5/3.6 instead of 3.0)
**Issue:** Handicap display showing two values - old cached value under the correct value

## Root Cause
1. **Database out of sync:** TRGG society handicap was 2.5, global was 3.0
2. **PeteFix code outdated:** Hardcoded to correct to 3.6 instead of 3.0
3. **Watch list incomplete:** Only caught 1.0, not 1.5/2.5/3.6

## Fixes Applied

### Database Update
```sql
UPDATE society_handicaps
SET handicap_index = 3.0
WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
AND society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346';
```

### Code Updates (4 locations in public/index.html)
1. **Line ~6474:** `PETE_CORRECT_HCP = '3.0'` (was '3.6')
2. **Line ~8509:** Corrects to 3.0 (was 3.6)
3. **Line ~11224:** `PETE_CORRECT_HCP = 3.0` (was 3.6)
4. **Line ~19468:** Corrects to 3.0 (was 3.6)

### Expanded Watch List
Now catches all wrong values:
```javascript
if (text === '+1.0' || text === '+1' || text === '1.0' || text === '1' ||
    text === '-1.0' || text === '-1' ||
    text === '1.5' || text === '+1.5' || text === '-1.5' ||
    text === '2.5' || text === '+2.5' || text === '-2.5' ||
    text === '3.6' || text === '+3.6') {
```

## Deployment
- Git commit: `Fix Pete handicap: update from 3.6 to 3.0, add 1.5/2.5 to watch list`
- Deployed to Vercel production

---

## Fix 4: Alan Thomas Handicap Showing Wrong Value (4.0 instead of 11.0)
**Issue:** Alan Thomas profile showing 4.0 handicap when correct values are 11.0 (universal) and 10.9 (TRGG)

## Database State Before Fix
- `user_profiles.profile_data.handicap`: "11" ✓
- `society_handicaps (TRGG)`: 10.5 ← needed update to 10.9
- `society_handicaps (global)`: 11.0 ✓
- Dashboard displaying: 4.0 ← from stale localStorage cache

## Fixes Applied

### Database Update
```sql
UPDATE society_handicaps
SET handicap_index = 10.9
WHERE golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
AND society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346';
```

### Code Updates (4 locations in public/index.html)
Added "AlanFix" code blocks similar to PeteFix:

1. **Lines ~6524-6576:** Early IIFE cache clear + DOM watcher
2. **Lines ~8568-8577:** LINE login handler
3. **Lines ~11302-11312:** UserInterface.updateRoleSpecificDisplays
4. **Lines ~19552-19561:** ProfileSystem.updateDashboardData

### Watch Values
```javascript
// Catches: 4.0, 10.5 → Corrects to 11.0
if (hcpVal === 4 || hcpVal === 4.0 || hcpVal === 10.5) {
    handicap = 11.0;
}
```

### User Constants
```javascript
const ALAN_ID = 'U214f2fe47e1681fbb26f0aba95930d64';
const ALAN_CORRECT_HCP = 11.0;
```

## Deployment
- Git commit: `Add Alan Thomas handicap fix: correct 4.0 to 11.0, update TRGG to 10.9`
- Deployed to Vercel production

---

## Fix 5: iOS Safari LINE OAuth Double-Login Issue
**Issue:** On iOS, clicking LINE login returns to login page and requires clicking LINE again before reaching dashboard

## Problem
On iOS Safari, after completing LINE OAuth flow:
1. User clicks LINE login button
2. Redirects to LINE for authentication
3. Returns to app login page instead of dashboard
4. User must click LINE again to complete login

## Root Cause
iOS Safari has stricter localStorage access policies after OAuth redirects:
1. State is stored in localStorage before redirect: `localStorage.setItem('line_oauth_state', state)`
2. After OAuth redirect back, localStorage may not be immediately accessible on iOS
3. State validation fails because `localStorage.getItem('line_oauth_state')` returns null
4. User sees login page again instead of being logged in

## Fixes Applied

### 1. Added sessionStorage Backup for State (2 locations)

**Line ~8424-8425 (loginWithLINE):**
```javascript
localStorage.setItem('line_oauth_state', state);
sessionStorage.setItem('line_oauth_state_backup', state); // iOS Safari backup
```

**Line ~14383-14384 (showQRCodeRegistration):**
```javascript
localStorage.setItem('line_oauth_state', state);
sessionStorage.setItem('line_oauth_state_backup', state); // iOS Safari backup
```

### 2. Check Both Storage Locations on Callback (line ~12346-12347)
```javascript
// On iOS, localStorage might not be immediately available after redirect
const lineStoredState = localStorage.getItem('line_oauth_state') ||
                       sessionStorage.getItem('line_oauth_state_backup');
```

### 3. iOS Detection Fallback (line ~12360-12370)
```javascript
// iOS Safari fix: If we have code+state but no stored state, proceed anyway
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const stateAppearsValid = state && state.length >= 5 && state.length <= 50;
const lineOAuthMissingState = code && state && !storedState && stateAppearsValid;

if (lineOAuthMissingState && isIOS) {
    console.warn('[OAuth] iOS fix: No stored state found, but code+state present. Proceeding with LINE OAuth.');
    storedState = state; // Trust the state from URL on iOS when localStorage fails
}
```

## OAuth Flow (Corrected)
1. User clicks LINE login
2. State stored in BOTH localStorage AND sessionStorage
3. Redirect to LINE OAuth
4. Return to app with code+state in URL
5. Check localStorage first, fallback to sessionStorage
6. If iOS and still no stored state but URL has valid code+state, proceed anyway
7. Complete OAuth and show dashboard

## Files Modified
- `public/index.html` - Added sessionStorage backup and iOS fallback

## Deployment
- Git commit: `Fix: iOS Safari LINE OAuth double-login issue - add sessionStorage backup for state`
- Deployed to Vercel production
