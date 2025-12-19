# Fix: Society Dashboard Scores Not Showing

**Date:** December 16, 2025
**Session:** Society event scores not appearing in dashboard

---

## Problem

Society scores were not being displayed in the Society Dashboard standings. Events played under a society were not showing up in that society's leaderboard.

---

## Root Cause

The `time-windowed-leaderboards.js` was filtering society events using **only** `organizer_name` matching:

```javascript
// OLD CODE (broken)
const { data: societyEvents } = await this.supabase
    .from('society_events')
    .select('id')
    .eq('organizer_name', society.name);  // Only matched by name string
```

This could fail if:
1. The `organizer_name` in `society_events` didn't exactly match `societies.name` (case sensitivity, whitespace, typos)
2. The event was linked via `society_id` foreign key but `organizer_name` was null or different
3. Legacy events had different naming conventions

---

## Fix Applied

Changed the event filtering logic to use **both** `society_id` (correct FK) and `organizer_name` (fallback):

```javascript
// NEW CODE (fixed)
// Query by society_id first (correct way)
const { data: eventsBySocietyId } = await this.supabase
    .from('society_events')
    .select('id')
    .eq('society_id', filterSociety);

// Also query by organizer_name as fallback for legacy events
let eventsByOrganizerName = [];
if (society && society.name) {
    const { data: legacyEvents } = await this.supabase
        .from('society_events')
        .select('id')
        .eq('organizer_name', society.name);
    eventsByOrganizerName = legacyEvents || [];
}

// Combine both result sets (deduplicated)
const allEventIds = new Set([
    ...(eventsBySocietyId || []).map(e => e.id),
    ...eventsByOrganizerName.map(e => e.id)
]);
```

---

## File Changed

- `public/time-windowed-leaderboards.js` (lines 205-247)

---

## Data Flow (How It Works Now)

```
Society Dashboard loads
    ↓
Gets society ID from current context
    ↓
Queries society_events WHERE society_id = [id]
    ↓
ALSO queries society_events WHERE organizer_name = [society.name]
    ↓
Combines both sets (deduplicated)
    ↓
Filters scorecards to only include those with matching event_id
    ↓
Calculates standings and displays
```

---

## Database Relationship

```
societies
    ├── id (UUID)
    └── name (TEXT)

society_events
    ├── id (TEXT)
    ├── society_id (UUID) → FK to societies.id  ← PRIMARY LINK
    └── organizer_name (TEXT)                    ← LEGACY LINK

scorecards
    ├── id (TEXT)
    └── event_id (TEXT) → FK to society_events.id
```

---

## Testing

1. Go to Society Dashboard
2. Check Standings tab (Daily/Weekly/Monthly/Yearly)
3. Scores from society events should now appear
4. Console will log: `Society has X events (by society_id: Y, by organizer_name: Z)`

---

## Related Files

- `public/time-windowed-leaderboards.js` - Main leaderboard calculation
- `public/society-dashboard-enhanced.js` - Dashboard UI
- `sql/society-golf-schema.sql` - Database schema
