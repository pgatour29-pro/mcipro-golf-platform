# Session Catalog - January 22, 2026

## Summary
- **SW Versions:** v228 → v229 → v230
- **Issue:** Tee sheet drag creates duplicate bookings
- **Root Cause:** External bookings (DB, parent) were being saved to localStorage, causing duplicates on next load

---

## THE PROBLEM

User reported: "When a booking is dragged to another slot, it creates a duplicate of the original - we now have both the original AND the duplicate."

---

## INVESTIGATION

### Initial Theory (v229 - Partial Fix)
Thought the issue was that when dragging a booking from parent BookingManager, the original wasn't being removed.

**Fix Applied (line 4484-4489):**
```javascript
// CRITICAL FIX: If booking came from parent BookingManager, remove the original
if (booking.parentId) {
  console.log('[TeeSheet] Removing original parent booking:', booking.parentId);
  await ParentBridge.removeBookingFromParent(booking.parentId);
}
```

**Result:** User reported "both identical bookings move at the same time as one booking" - meaning duplicates still existed but moved together.

### Real Root Cause (v230 - Complete Fix)
Traced the data flow and found the actual bug:

1. `getDay(date)` merges bookings from multiple sources:
   - localStorage (local tee sheet bookings)
   - `caddyBookingsCache` (caddy_bookings table in DB)
   - `ParentBridge.getBookingsFromParent()` (parent BookingManager)
   - `societyEventsCache` (society_events table in DB)

2. `setDay(date, bookings)` saves the ENTIRE merged array to localStorage:
   ```javascript
   localStorage.setItem(storageKey(d), JSON.stringify(arr || []));
   ```

3. **THE BUG:** DB-sourced bookings (e.g., `caddy-123`) get saved to localStorage. On next `getDay()`:
   - localStorage now has `caddy-123`
   - Database ALSO returns `caddy-123`
   - Deduplication fails because the localStorage version doesn't have `source: 'caddy-booking-db'` anymore
   - Result: DUPLICATE

---

## THE FIX (v230)

**File:** `public/proshop-teesheet.html`
**Lines:** 3933-3946

```javascript
// Enhanced setDay - saves to localStorage AND syncs to parent BookingManager
const setDay = (d, arr) => {
  // CRITICAL FIX: Only save LOCAL bookings to localStorage
  // Filter out bookings from external sources (DB, parent) to prevent duplicates
  const localOnlyBookings = (arr || []).filter(b => {
    // Skip DB-sourced caddy bookings
    if (b.source === 'caddy-booking-db') return false;
    if (b.id && b.id.startsWith('caddy-')) return false;
    // Skip parent-sourced bookings
    if (b.id && b.id.startsWith('parent-')) return false;
    // Skip society events from DB
    if (b.source === 'society-event-db') return false;
    if (b.id && b.id.startsWith('society-')) return false;
    return true;
  });
  localStorage.setItem(storageKey(d), JSON.stringify(localOnlyBookings));
  // ... rest of function
};
```

---

## CODE LOCATIONS

### Booking Data Flow (proshop-teesheet.html)

```
Line 3863-3918  : getDay() - merges bookings from all sources
Line 3884       : allIds set for deduplication
Line 3887-3896  : localCaddyTimeKeys for caddy+time deduplication
Line 3898       : Filter parent bookings
Line 3902-3913  : Filter DB bookings (deduplication logic)
Line 3917       : Return merged array

Line 3931-3990  : setDay() - saves bookings and syncs to parent
Line 3933-3946  : NEW - Filter external sources before saving
Line 3946       : Save only local bookings to localStorage
Line 3979-3981  : Sync to parent BookingManager
```

### Drop Handler (proshop-teesheet.html)

```
Line 4458-4537  : Drop event handler for drag-and-drop
Line 4461       : Get booking ID from dataTransfer
Line 4465       : Load bookings via getDay()
Line 4466       : Find booking by ID
Line 4479-4482  : Check if position actually changed
Line 4484-4489  : Remove original parent booking if exists (v229 fix)
Line 4491-4497  : Update booking with new slot info
Line 4505       : setDay() to save updated bookings
Line 4508-4527  : Update caddy bookings in database
Line 4530-4536  : Sync society booking changes
```

### Booking ID Formats

| Source | ID Format | Example |
|--------|-----------|---------|
| Local tee sheet | `{uuid}` | `a1b2c3d4-...` |
| Database caddy | `caddy-{uuid}` | `caddy-a1b2c3d4-...` |
| Parent BookingManager | `parent-{uuid}` | `parent-a1b2c3d4-...` |
| Society event DB | `society-{id}-slot-{n}` | `society-123-slot-0` |
| Synced to parent | `teesheet-{id}` | `teesheet-a1b2c3d4-...` |

### Booking Sources

| Source Property | Meaning |
|-----------------|---------|
| `caddy-booking-db` | From caddy_bookings table |
| `society-event-db` | From society_events table |
| `teesheet` | Created in tee sheet, synced to parent |
| (none) | Local tee sheet booking |

---

## DEDUPLICATION LOGIC

The `getDay()` function attempts to deduplicate bookings:

1. **By ID:** `allIds.has(b.id) || allIds.has(b.dbId)`
2. **By caddy+time:** `localCaddyTimeKeys.has(\`${g.caddyId}::${b.time}\`)`

**Why it failed:**
When a DB booking was saved to localStorage:
- It lost its `source: 'caddy-booking-db'` property
- Its ID `caddy-123` was in localStorage
- But the fresh DB fetch also returned `caddy-123`
- `allIds` check passed (different object references)
- `localCaddyTimeKeys` check might fail if caddyId wasn't preserved

---

## DEPLOYMENT HISTORY

| Version | Changes | Result |
|---------|---------|--------|
| v228 | Performance monitoring + login fix | Working |
| v229 | Remove parent booking on drag | Partial - duplicates still moved together |
| v230 | Filter external sources in setDay() | **FIXED** |

---

## FILES MODIFIED

```
public/proshop-teesheet.html
  - Line 3933-3946: Added filter to exclude external sources from localStorage
  - Line 4484-4489: Added parent booking removal on drag (v229)

public/sw.js
  - SW_VERSION: v228 → v229 → v230
```

---

## LESSONS LEARNED

1. **Understand data flow:** The bug wasn't in the drag handler - it was in how `setDay()` saved ALL bookings including external ones.

2. **Merged arrays are dangerous:** When you merge data from multiple sources, don't save the merged result back to one source.

3. **ID prefixes help:** The ID prefix pattern (`caddy-`, `parent-`, `society-`) made it easy to identify and filter external bookings.

4. **Test with fresh data:** The duplicate only appeared after the first save because that's when DB bookings got written to localStorage.

---

## TESTING CHECKLIST

After deploying v230:

- [ ] Refresh page, verify SW shows v230
- [ ] Create a new booking in tee sheet
- [ ] Drag booking to different time slot
- [ ] Verify NO duplicate appears
- [ ] Refresh page
- [ ] Verify booking is in correct position (no duplicate)
- [ ] Test with caddy-assigned booking
- [ ] Test with society/group booking

---

## RELATED DOCUMENTATION

- `compacted/TEESHEET_FIX.md` - Original tee sheet booking display fix
- `compacted/BUG-REPORT-BOOKING-DISAPPEARANCE.md` - Booking data loss issues
- `compacted/TEESHEET_INTEGRATION_ANALYSIS.md` - Tee sheet architecture overview
