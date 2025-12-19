# LINE Push Notifications for Events - December 14, 2025

## Summary
Added LINE push notifications for ALL event creation - society events, golfer events, public events, and private events.

## Problem
- LINE notifications were only working for DMs and announcements (called from frontend)
- Event notifications were NOT being sent because:
  1. Database triggers had wrong column names
  2. Frontend wasn't calling the Edge Function for events
  3. Multiple code paths for event creation were not all covered

## Solution
Added LINE notification calls to ALL event creation code paths in the frontend.

## Files Modified

### 1. `public/index.html`

#### A. `SocietyGolfDB.createEvent()` (line ~39018-39047)
Added LINE notification after successful event insert:
```javascript
// Send LINE push notification for ALL new events
const createdEvent = data?.[0];
if (createdEvent) {
    try {
        const notifResponse = await fetch('https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'new_event',
                record: {
                    id: createdEvent.id,
                    title: createdEvent.title,
                    event_date: createdEvent.event_date,
                    start_time: createdEvent.start_time,
                    course_name: createdEvent.course_name,
                    society_id: createdEvent.society_id || null,
                    creator_id: createdEvent.creator_id,
                    organizer_name: createdEvent.organizer_name,
                    is_private: createdEvent.is_private,
                    description: createdEvent.description
                }
            })
        });
        const notifResult = await notifResponse.json();
        console.log('[SocietyGolfDB] LINE notification sent for new event:', notifResult);
    } catch (notifErr) {
        console.error('[SocietyGolfDB] LINE notification failed:', notifErr);
    }
}
```

#### B. `GolferEventsSystem.createGolferEvent()` (line ~65506-65534)
Added LINE notification after successful event insert (same pattern).

#### C. `SocietyOrganizerSystem.saveEvent()` (line ~53024-53057)
Added LINE notification for event UPDATES when significant changes occur:
- Date changed
- Time changed
- Venue changed

### 2. `supabase/functions/line-push-notification/index.ts`

Updated `handleNewEvent()` to handle private events:
```typescript
// For society events, notify all society members
if (event.society_id) {
    // Query society_members table
}

// For private events or events without society members
if (!event.society_id || golferIds.length === 0) {
    // Try to find society by organizer_name
    // Get registered players for this event
    // Include creator_id
}
```

## Event Creation Code Paths

| Code Path | Location | Used By | Notification Added |
|-----------|----------|---------|-------------------|
| `SocietyGolfDB.createEvent()` | line ~38952 | Society organizers | Yes |
| `GolferEventsSystem.createGolferEvent()` | line ~65409 | Golfers (main path) | Yes |
| `GolferEventsSystem.createEvent()` | line ~64254 | Golfers (legacy) | Uses SocietyGolfDB |

## Notification Recipients

| Event Type | Recipients |
|------------|------------|
| Society Event (public) | All society members with LINE accounts |
| Society Event (private) | All society members with LINE accounts |
| Golfer Event (public) | Creator + registered players |
| Golfer Event (private) | Creator + registered players |

## Edge Function Logic

The `line-push-notification` Edge Function determines recipients:

1. **If `society_id` exists**: Query `society_members` table for active members
2. **If `organizer_name` exists**: Look up society by name, get members
3. **Always**: Include `creator_id` and any `event_registrations`
4. **Filter**: Only LINE users (IDs starting with "U")
5. **Check preferences**: Exclude users who opted out via `notification_preferences` table

## Data Flow

```
User Creates Event
       ↓
Frontend inserts to society_events
       ↓
Frontend calls Edge Function with event data
       ↓
Edge Function finds recipients
       ↓
Edge Function calls LINE Messaging API
       ↓
Users receive LINE push notification
```

## Testing

To test:
1. Create any event (society or golfer, public or private)
2. Check browser console for: `LINE notification sent:`
3. Verify LINE notification received on phone

## Console Logs

Successful notification:
```
[GolferEvents] LINE notification sent: {success: true, notified: 5}
```
or
```
[SocietyGolfDB] LINE notification sent for new event: {success: true, notified: 12}
```

## Notification Message Format

New events use a Flex Message card with:
- Green header with "NEW EVENT" badge
- Event title
- Date and venue
- "View Event" button linking to the app

## Related Files

| File | Purpose |
|------|---------|
| `public/index.html` | Frontend event creation + notification calls |
| `supabase/functions/line-push-notification/index.ts` | Edge Function |
| `sql/LINE_PUSH_NOTIFICATIONS_SETUP.sql` | Database tables (notification_preferences, notification_log) |
| `docs/LINE_PUSH_NOTIFICATIONS_GUIDE.md` | Full documentation |

## Lessons Learned

1. **Multiple code paths**: Event creation had 3+ different paths - need to add notification to ALL of them
2. **Frontend > Triggers**: Calling Edge Function from frontend is more reliable than database triggers
3. **Column name consistency**: Frontend translates field names to match Edge Function expectations
4. **Private events need special handling**: No society_id means need alternative recipient lookup
