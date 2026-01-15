# BUG: Intermittent Data Loading Failures
## "Events and other data would not load until refreshed"

**Discovered:** 2026-01-14
**Severity:** 🟡 MEDIUM-HIGH (Affects user experience throughout the day)
**Status:** ❌ NOT FIXED

---

## Problem Description

Throughout the day, events and other data would not load until the page was refreshed. This is an intermittent issue that affects multiple users.

---

## Root Cause: Promise.all() Failure Cascade

### Location
**File:** `public/index.html`
**Function:** `getAllPublicEvents()` (lines 47669-47897)
**Critical Code:** Lines 47704-47767

### The Issue

The `getAllPublicEvents()` function loads event data using **7 parallel database queries** with `Promise.all()`:

```javascript
const [
    regCountsResult,              // Query 1: Registration counts
    societyProfilesResult,        // Query 2: Society profiles
    userRegsResult,               // Query 3: User's registrations
    pendingRequestsResult,        // Query 4: Pending join requests
    waitlistCountsResult,         // Query 5: Waitlist counts
    userWaitlistResult,           // Query 6: User's waitlist positions
    creatorProfilesResult         // Query 7: Creator profiles
] = await Promise.all([
    // ... 7 queries ...
]);
```

### Why This Causes Intermittent Failures

**`Promise.all()` has ALL-OR-NOTHING behavior:**
- If **ANY ONE** of the 7 queries fails, the **ENTIRE** `Promise.all()` rejects
- All successful queries are discarded
- Function returns empty array `[]`
- User sees "no events" even though events exist

### Failure Scenarios

Any of these can cause ONE query to fail:
1. **Network hiccup** - brief connection issue
2. **Database overload** - query timeout during high load
3. **Supabase rate limiting** - temporary throttling
4. **Query timeout** - slow query exceeds timeout
5. **RPC function missing** - fallback query also fails
6. **Connection pool exhaustion** - no available connections

### Current Error Handling (INADEQUATE)

**In `getAllPublicEvents()` (line 47680-47683):**
```javascript
if (eventsError) {
    console.error('[SocietyGolf] Error fetching events:', eventsError);
    return [];
}
```
❌ Only catches the initial events query, NOT the Promise.all() failures

**In `loadEvents()` (line 77166-77170):**
```javascript
catch (error) {
    console.error('[GolferEventsSystem] Error loading events:', error);
    this.allEvents = [];
    this.filteredEvents = [];
}
```
❌ Just returns empty arrays - no retry, no user notification, no graceful degradation

---

## User Experience Impact

### What Users See:
1. Open Events tab
2. Loading spinner shows
3. Suddenly: "No events available" (even though events exist)
4. User refreshes page
5. Events load successfully (queries succeed this time)

### Frequency:
- Intermittent throughout the day
- More common during:
  - Peak usage times (database load)
  - Poor network conditions
  - After app wake from sleep (stale connections)

---

## Technical Analysis

### Promise.all() vs Promise.allSettled()

**Current (broken):**
```javascript
// If Query 4 fails, ALL 7 queries are discarded
const [q1, q2, q3, q4, q5, q6, q7] = await Promise.all([...]);
// Result: Complete failure, empty data
```

**Should be:**
```javascript
// If Query 4 fails, use other 6 successful queries
const results = await Promise.allSettled([...]);
const [q1, q2, q3, q4, q5, q6, q7] = results.map(r =>
    r.status === 'fulfilled' ? r.value : { data: [] }
);
// Result: Partial data shown, graceful degradation
```

### Cascading Effects

This same pattern appears in multiple places:
1. ✅ **Service Worker** - Correctly excludes Supabase API from cache
2. ❌ **getAllPublicEvents()** - Uses Promise.all() (broken)
3. ❌ **Other data loading functions** - May have similar issues

---

## Solution

### Fix 1: Use Promise.allSettled() ⭐ RECOMMENDED

**Replace (line 47704):**
```javascript
] = await Promise.all([
```

**With:**
```javascript
] = await Promise.allSettled([
```

**Then extract results with error handling:**
```javascript
const [
    regCountsResult,
    societyProfilesResult,
    userRegsResult,
    pendingRequestsResult,
    waitlistCountsResult,
    userWaitlistResult,
    creatorProfilesResult
] = results.map(result => {
    if (result.status === 'fulfilled') {
        return result.value;
    } else {
        console.warn('[SocietyGolf] Query failed:', result.reason);
        return { data: [] }; // Graceful fallback
    }
});
```

### Fix 2: Add Individual Error Handling

Wrap each critical query:
```javascript
window.SupabaseDB.client
    .from('society_profiles')
    .select('organizer_id, society_name, society_logo')
    .in('organizer_id', organizerIds)
    .catch(err => {
        console.warn('[SocietyGolf] Society profiles query failed:', err);
        return { data: [] };
    })
```

### Fix 3: Add Retry Logic

```javascript
async function retryQuery(queryFn, maxRetries = 2) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await queryFn();
        } catch (err) {
            if (i === maxRetries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
        }
    }
}
```

### Fix 4: User Notification

When partial failure occurs:
```javascript
if (failedQueriesCount > 0) {
    NotificationManager.show(
        'Some data could not be loaded. Showing partial results.',
        'warning',
        5000
    );
}
```

---

## Related Issues

### Same Pattern in Other Functions?

Search for other uses of `Promise.all()` with database queries:
```bash
grep -n "await Promise.all" public/index.html
```

These may have the same vulnerability.

---

## Testing Plan

### To Reproduce:
1. Throttle network to "Slow 3G" in DevTools
2. Open Events tab
3. Observe intermittent failures

### To Verify Fix:
1. Apply Promise.allSettled() fix
2. Throttle network to "Slow 3G"
3. Open Events tab multiple times
4. Should show partial data instead of complete failure
5. Console should show warnings for failed queries, not errors

---

## Priority

**HIGH** - This affects user experience throughout the day and causes confusion.

Users think:
- "The app is broken"
- "There are no events"
- "I need to refresh constantly"

This undermines trust in the application.

---

## Files to Modify

1. `public/index.html` (line 47704-47767)
   - Change `Promise.all()` to `Promise.allSettled()`
   - Add error handling for individual queries
   - Add user notification for partial failures

2. Search for other `Promise.all()` patterns:
   - `getAllPublicEvents()` ⚠️ (confirmed issue)
   - Other data loading functions? (need to check)

---

## Estimated Fix Time

- **Simple fix** (Promise.allSettled only): 15 minutes
- **Complete fix** (with retry + notifications): 1-2 hours
- **Testing**: 30 minutes

---

## Additional Notes

### Why This Wasn't Caught Earlier

1. **Works most of the time** - only fails under specific conditions
2. **No error logging to user** - fails silently
3. **Looks like "no data"** - not obviously a bug
4. **Refresh fixes it** - workaround is easy
5. **Intermittent** - hard to reproduce consistently

### Why It's Worse During the Day

- More database load
- More concurrent users
- More likely for ONE query to timeout
- Network conditions vary

---

**Generated:** 2026-01-14 18:30 UTC
**Discovered by:** User report of intermittent loading issues
**Analysis by:** Claude Sonnet 4.5
