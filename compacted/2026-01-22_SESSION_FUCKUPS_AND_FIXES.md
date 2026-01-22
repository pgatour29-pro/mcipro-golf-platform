# Session Catalog - January 22, 2026 (Complete Fuckups & Fixes)

## Summary
- **SW Versions:** v228 → v229 → v230 → v231 → v232 → v233
- **Issues Fixed:**
  1. Tee sheet drag creates duplicate bookings
  2. Login loop (3-4 attempts to login)
  3. Society event disappears when dragged on tee sheet

---

## ISSUE #1: TEE SHEET DRAG DUPLICATE BUG

### Problem
When dragging a booking to another slot, it creates a duplicate - both the original AND the copy exist.

### Investigation & Fuckups

**v229 - WRONG FIX (Partial)**
- Thought the issue was parent BookingManager not removing original
- Added code to remove parent booking on drag:
```javascript
if (booking.parentId) {
    await ParentBridge.removeBookingFromParent(booking.parentId);
}
```
- **Result:** User reported "both identical bookings move at the same time" - still duplicates!

**v230 - CORRECT FIX**
- Found the REAL root cause: `setDay()` was saving ALL bookings to localStorage, including ones from external sources (DB, parent)
- On next `getDay()`, it loaded from BOTH localStorage AND DB = duplicates

### Root Cause
```javascript
// setDay() was doing this:
localStorage.setItem(storageKey(d), JSON.stringify(arr || []));
// This saved DB bookings (caddy-xxx) to localStorage
// Next getDay() loaded from localStorage AND database = DUPLICATE
```

### The Fix (v230)
```javascript
// Filter out external sources before saving
const localOnlyBookings = (arr || []).filter(b => {
  if (b.source === 'caddy-booking-db') return false;
  if (b.id && b.id.startsWith('caddy-')) return false;
  if (b.id && b.id.startsWith('parent-')) return false;
  if (b.source === 'society-event-db') return false;
  if (b.id && b.id.startsWith('society-')) return false;
  return true;
});
localStorage.setItem(storageKey(d), JSON.stringify(localOnlyBookings));
```

### Files Modified
- `public/proshop-teesheet.html` lines 3933-3946
- `public/sw.js` version bump

---

## ISSUE #2: LOGIN LOOP (3-4 ATTEMPTS)

### Problem
User needs 3-4 attempts to login. OAuth callback keeps getting interrupted.

### Investigation & Fuckups

**v228 (Previous Session)**
- Added `__oauth_in_progress` flag to prevent build ID reload during OAuth
- Set flag only IF state validation passed
- **FUCKUP:** If state didn't match, flag was never set!

**v231 - PARTIAL FIX**
- Changed to set flag IMMEDIATELY when code+state present (before validation)
- Also check sessionStorage backup for state (iOS Safari)
```javascript
if (code && state) {
    // Set flag FIRST - before state validation
    sessionStorage.setItem('__oauth_in_progress', 'true');
    sessionStorage.setItem('__pending_oauth_code', code);
    sessionStorage.setItem('__pending_oauth_state', state);
    // Clean URL
    history.replaceState(null, '', cleanUrl);
    // State validation happens later in DOMContentLoaded
}
```

**v232 - MORE DEFENSIVE CHECKS**
- Added multiple indicators check in build ID reload:
```javascript
const oauthInProgress = sessionStorage.getItem('__oauth_in_progress');
const pendingCode = sessionStorage.getItem('__pending_oauth_code');
const hasOAuthCallback = oauthInProgress || pendingCode;
if (hasOAuthCallback) {
    console.log('[BUILD] Skipping reload - OAuth callback detected');
    localStorage.setItem(key, buildId);
}
```
- Added `mc_build_seen` and `line_oauth_state` to preserved keys in `ensureCleanSlateForNewUser()`

### Root Cause
1. Build ID reload was interrupting OAuth callback
2. `__oauth_in_progress` flag only set if state matched (which could fail)
3. `ensureCleanSlateForNewUser()` was clearing `mc_build_seen` causing reload loops

### Files Modified
- `public/index.html` lines 28219-28260 (immediate script)
- `public/index.html` lines 13531-13551 (build ID check)
- `public/index.html` lines 13977-13986 (preserved keys)

---

## ISSUE #3: SOCIETY EVENT DISAPPEARS WHEN DRAGGED

### Problem
User created society event for Jan 23 at Treasure Hill. Dragged it on tee sheet to test, event disappeared from dashboard completely.

### Investigation

Checked database - no Treasure Hill event for Jan 23 exists. Either:
1. Event was deleted
2. Event was never saved to database (only localStorage)
3. Time change wasn't persisted

### Root Cause
`syncSocietyBookingChange()` only updated `change_log` and `notes` - it did NOT update `start_time`!

```javascript
// OLD CODE - only updated metadata, not the actual time!
const { error: updateError } = await supabase
  .from('society_events')
  .update({
    change_log: changeLog,
    updated_at: new Date().toISOString(),
    updated_by: 'proshop',
    notes: existingEvent?.notes + changeText
  })
  .eq('id', eventId);
// start_time WAS NEVER UPDATED!
```

Also, `eventId` extraction was broken - `booking.groupId` is `society-{id}` but database expects just `{id}`.

### The Fix (v233)
```javascript
// Extract raw event ID - strip 'society-' prefix
let eventId = booking.eventId || booking.groupId;
if (eventId && eventId.startsWith('society-')) {
  eventId = eventId.replace('society-', '');
}

// Build update data including start_time
const updateData = {
  change_log: changeLog,
  updated_at: new Date().toISOString(),
  updated_by: 'proshop',
  updated_by_name: 'Pro Shop',
  notes: existingEvent?.notes + changeText
};

// CRITICAL: Update start_time when time changes
if (oldTime !== newTime) {
  updateData.start_time = newTime + ':00';
}

await supabase.from('society_events').update(updateData).eq('id', eventId);
```

### Files Modified
- `public/proshop-teesheet.html` lines 4081-4127

---

## DEPLOYMENT HISTORY

| Version | Changes | Result |
|---------|---------|--------|
| v228 | Previous: OAuth in_progress flag | Login still broken |
| v229 | Remove parent booking on drag | WRONG - duplicates still moved together |
| v230 | Filter external sources in setDay() | Fixed duplicates |
| v231 | Set OAuth flag before state validation | Partial login fix |
| v232 | Multiple OAuth checks + preserved keys | More defensive login fix |
| v233 | Update society event start_time on drag | Fixed society event time persistence |

---

## CODE LOCATIONS

### Tee Sheet Drag Handler
```
proshop-teesheet.html
Line 4471-4544  : Drop event handler
Line 4499-4502  : Remove parent booking (v229)
Line 4512       : setDay() call
Line 4537-4543  : Society booking sync
```

### setDay() Filter (v230)
```
proshop-teesheet.html
Line 3933-3946  : Filter external sources before localStorage save
```

### Society Booking Sync
```
proshop-teesheet.html
Line 4007-4160  : syncSocietyBookingChange()
Line 4085-4090  : eventId extraction fix (v233)
Line 4118-4122  : start_time update fix (v233)
```

### OAuth Immediate Script
```
index.html
Line 28221-28260 : Immediate OAuth detection
Line 28244-28246 : Set flags before validation (v231)
```

### Build ID Check
```
index.html
Line 13531-13551 : Build ID reload logic
Line 13537-13543 : Multiple OAuth checks (v232)
```

### Preserved Keys
```
index.html
Line 13977-13986 : ensureCleanSlateForNewUser preserved keys
Line 13984-13985 : Added mc_build_seen, line_oauth_state (v232)
```

---

## BOOKING ID FORMATS

| Source | ID Format | Example |
|--------|-----------|---------|
| Local tee sheet | `{uuid}` | `a1b2c3d4-...` |
| Database caddy | `caddy-{uuid}` | `caddy-a1b2c3d4-...` |
| Parent BookingManager | `parent-{uuid}` | `parent-a1b2c3d4-...` |
| Society event DB | `society-{id}-slot-{n}` | `society-123-slot-0` |
| Synced to parent | `teesheet-{id}` | `teesheet-a1b2c3d4-...` |

---

## LESSONS LEARNED

### 1. Don't Save Merged Arrays Back to Single Source
When `getDay()` merges data from multiple sources, DON'T save the merged result back to localStorage. Filter first.

### 2. Set Flags BEFORE Validation
OAuth flag must be set IMMEDIATELY when callback detected, not after state validation passes.

### 3. Update ALL Relevant Fields
When syncing changes to database, update the ACTUAL data fields (like `start_time`), not just metadata (like `change_log`).

### 4. ID Prefixes Need Stripping
When IDs have prefixes like `society-`, strip them before database queries.

### 5. Multiple Defensive Checks
Don't rely on a single flag - check multiple indicators to be safe.

### 6. Preserve Critical Keys
Don't let cleanup functions clear keys needed for other functionality (like `mc_build_seen`).

---

## TESTING CHECKLIST

### Tee Sheet Drag
- [ ] Drag local booking to new slot - no duplicate
- [ ] Drag caddy booking (from DB) to new slot - no duplicate
- [ ] Drag society event to new slot - time persists in database
- [ ] Refresh after drag - booking in correct position

### Login
- [ ] Close all tabs, reopen
- [ ] Verify SW shows v233
- [ ] Click LINE login
- [ ] Should reach dashboard on FIRST attempt
- [ ] No reload loop

### Society Events
- [ ] Create event from dashboard
- [ ] View on tee sheet
- [ ] Drag to new time
- [ ] Check database - start_time should be updated
- [ ] Check dashboard - event should show at new time
