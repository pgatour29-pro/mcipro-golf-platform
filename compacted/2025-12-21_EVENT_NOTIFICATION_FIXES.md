# Event & Notification System Fixes

**Date:** December 21, 2025
**Session:** Event management and LINE notification improvements

---

## 1. Events Disappearing After Edit (CRITICAL)

### Problem
Travellers Rest December 31st event disappeared after editing from St. Andrews to Pleasant Valley.

### Root Cause
- `saveEvent()` was adding "Travellers Rest Golf -" prefix to event titles
- `getOrganizerEventsWithStats()` was querying for "TRGG -%" prefix only
- Events with the wrong prefix were filtered out and appeared "deleted"

### Solution
1. Query now matches BOTH prefixes using OR condition:
```javascript
eventsQuery = window.SupabaseDB.client
    .from('society_events')
    .select('*')
    .or(`title.ilike.${primaryPrefix}%,title.ilike.${secondaryPrefix}%`)
```

2. `saveEvent()` now checks for existing society prefixes before adding

### Commit
`896fb6c6 fix: Events disappearing after edit due to prefix mismatch`

---

## 2. TRGG/JOA Logos on Organizer Event Cards

### Problem
Logo appeared on golfer dashboard but not organizer event cards.

### Solution
Added logo detection logic to `renderEventCard()` based on event title prefix.

### Commit
`2592ed08 fix: Show TRGG/JOA logos on society organizer event cards`

---

## 3. Alert System for Event Visibility Issues

### Problem
No alert when events disappeared after save.

### Solution
Added post-save validation that shows:
- In-app notification (10 seconds)
- Browser alert popup with details
- LINE push notification to admin

### Commit
`c0c7d954 feat: Add alert system when events disappear after save`

---

## 4. LINE Notifications for All Event Actions

### Problem
Only event edits sent notifications, not creates or deletes.

### Solution
Added LINE notifications for all three event actions:

| Action | Organizer | Registered Golfers |
|--------|-----------|-------------------|
| Create | ✅ New event created | N/A |
| Edit | ✅ Event edited | ✅ Event updated (with cutoff) |
| Delete | ✅ Event deleted | ✅ Event cancelled |

### Commits
```
f9447444 feat: LINE notifications for all event changes (create, edit, delete)
1d63faf2 fix: Notify registered golfers when events are deleted/cancelled
```

---

## 5. Cutoff Date/Time Not Saving

### Problem
Event cutoff wasn't saving because code used wrong column name.

### Root Cause
- Code looked for `registration_close_date`
- Database column is `registration_cutoff`

### Solution
Fixed mapping in both `updateEvent` and `getOrganizerEventsWithStats`:
```javascript
cutoff: event.registration_cutoff || event.registration_close_date || event.cutoff
```

### Commit
`1f495c98 fix: Event cutoff date/time not saving - wrong column name`

---

## 6. Cutoff Display on Golfer Event Cards

### Problem
Cutoff not showing on golfer event cards even when set.

### Root Cause
`getAllPublicEvents()` used `e.cutoff` instead of `e.registration_cutoff`

### Solution
1. Fixed data loading:
```javascript
cutoff: e.registration_cutoff || e.cutoff
```

2. Added cutoff display to golfer event card:
```javascript
${event.cutoff ? `<div class="text-orange-600">⏰ Cutoff: ${this.formatDateTime(event.cutoff)}</div>` : ''}
```

3. Added `formatDateTime()` helper function

### Commit
`193d7690 feat: Show cutoff on golfer event cards + notify registered golfers`

---

## 7. Cutoff Time Wrong Timezone

### Problem
Cutoff time displayed differently on golfer cards vs organizer view.

### Root Cause
`new Date()` was parsing UTC offset causing timezone shift.

### Solution
Strip timezone before parsing:
```javascript
formatDateTime(dateTimeStr) {
    const localStr = dateTimeStr.substring(0, 16);  // Strip timezone
    const dt = new Date(localStr);
    // Format as local time...
}
```

### Commits
```
75ec40fa fix: Cutoff time display now matches organizer (strip timezone)
4e6a8027 fix: Cutoff in LINE notifications also uses correct timezone format
```

---

## 8. system_alert Handler Missing

### Problem
Edge function returned 400 for `type: 'system_alert'` because it wasn't handled.

### Solution
Added `handleSystemAlert()` function to edge function.

### Commit
`20f56279 fix: Add system_alert handler to LINE push notification edge function`

---

## 9. Notification Delivery Failures (Sanity Check)

### Problems Found
1. `handleDirectMessage` - returned early if `messaging_user_id` was null
2. `handleEventUpdate` - only notified `status='confirmed'` registrations
3. `handleEventUpdate` - no `messaging_user_id` lookup
4. `handleNewEvent` - dropped users without `user_profiles` row

### Solution
- All handlers now fall back to `line_user_id` when `messaging_user_id` is null
- Removed restrictive status filters
- Added fallback for users without profiles

### Commit
`01d8b93c fix: Multiple notification delivery issues in LINE push edge function`

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Event prefix query, cutoff mapping, notifications |
| `supabase/functions/line-push-notification/index.ts` | system_alert handler, fallback fixes |

---

## Git Commit Summary

```
592aaad1 docs: Catalog notification system sanity check and fixes
01d8b93c fix: Multiple notification delivery issues in LINE push edge function
20f56279 fix: Add system_alert handler to LINE push notification edge function
1d63faf2 fix: Notify registered golfers when events are deleted/cancelled
4e6a8027 fix: Cutoff in LINE notifications also uses correct timezone format
75ec40fa fix: Cutoff time display now matches organizer (strip timezone)
193d7690 feat: Show cutoff on golfer event cards + notify registered golfers
1f495c98 fix: Event cutoff date/time not saving - wrong column name
f9447444 feat: LINE notifications for all event changes (create, edit, delete)
c0c7d954 feat: Add alert system when events disappear after save
2592ed08 fix: Show TRGG/JOA logos on society organizer event cards
896fb6c6 fix: Events disappearing after edit due to prefix mismatch
```

---

## Testing Checklist

- [ ] Edit an event - should NOT disappear from list
- [ ] Check organizer event cards show TRGG/JOA logos
- [ ] Edit event and see if cutoff saves correctly
- [ ] Check golfer event cards show cutoff with correct time
- [ ] Delete an event - registered golfers should receive cancellation notice
- [ ] Create a new event - organizer should receive LINE notification
- [ ] Send a direct message - recipient should receive LINE notification
