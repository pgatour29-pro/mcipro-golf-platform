# Caddy Booking - Event/Group Selection Enhancement
## Date: 2026-01-04

---

## Summary

Enhanced the golfer caddy booking modal to support two booking scenarios:
1. **My Tee Time** - Golfer creates their own tee time and books a caddy
2. **Joining Event** - Golfer selects from their registered society events or enters group details manually

---

## Booking Flow

```
Golfer clicks "Book Caddy"
    ↓
Modal shows booking type toggle:
    [My Tee Time] | [Joining Event]
    ↓
If "My Tee Time":
    - Golfer sets date, time manually
    - Course from caddy's home course
    ↓
If "Joining Event":
    - Dropdown loads registered events from Supabase
    - Select event → Auto-fills date/time/course (read-only)
    - Or select "Enter manually" → Shows group name input
    ↓
Golfer selects holes (9/18) and adds notes
    ↓
Confirm → Booking saved with event context
```

---

## UI Elements Added

### Booking Type Toggle (lines 68520-68530)
```html
<button id="bookingTypeOwn" onclick="GolferCaddyBooking.setBookingType('own')">
    My Tee Time
</button>
<button id="bookingTypeEvent" onclick="GolferCaddyBooking.setBookingType('event')">
    Joining Event
</button>
```

### Event Selection Dropdown (lines 68537-68543)
```html
<select id="bookingEventSelect" onchange="GolferCaddyBooking.onEventSelected()">
    <option value="">-- Select from your registered events --</option>
    <option value="manual">📝 Enter event details manually</option>
    <!-- Dynamically loaded events -->
</select>
```

### Manual Group Name Input (lines 68546-68552)
```html
<input type="text" id="bookingEventName" placeholder="e.g., TRGG Monthly, Corporate Outing">
```

### Course Display (lines 68575-68581)
```html
<input type="text" id="bookingCourse" readonly>
```

---

## New Methods in GolferCaddyBooking

| Method | Lines | Description |
|--------|-------|-------------|
| `setBookingType(type)` | 68620-68650 | Toggles between 'own' and 'event' modes |
| `loadUserEventsForBooking()` | 68653-68691 | Loads user's registered events from Supabase |
| `onEventSelected()` | 68694-68726 | Auto-fills form when event selected |

### Properties Added
- `selectedEventData` - Stores selected event object
- `userEvents` - Cache of loaded events by ID

---

## Database Query

Events loaded from `event_registrations` joined with `society_events`:

```javascript
await window.supabaseClient
    .from('event_registrations')
    .select('event_id, society_events(id, title, event_date, start_time, course_name, organizer_name)')
    .eq('player_id', userId)
    .gte('society_events.event_date', new Date().toISOString().split('T')[0]);
```

---

## Booking Data Structure

### Before (simple booking)
```javascript
{
    user_id: userId,
    caddy_id: caddyId,
    course_name: caddy.course_name,
    booking_date: date,
    tee_time: time,
    holes: 18,
    status: 'confirmed'
}
```

### After (with event context)
```javascript
{
    user_id: userId,
    caddy_id: caddyId,
    course_name: eventData?.course_name || caddy.course_name,
    booking_date: date,
    tee_time: time,
    holes: 18,
    status: 'confirmed',
    notes: requests,
    // Event context (if joining event)
    event_id: eventData?.id,
    event_name: eventData?.title,
    group_name: eventData?.organizer_name || manualGroupName
}
```

---

## Auto-Fill Behavior

When user selects an event from dropdown:

| Field | Behavior |
|-------|----------|
| Date | Set to event date, becomes read-only (gray background) |
| Time | Set to event start_time, option added if not in list |
| Course | Set to event course_name, read-only |
| Group Name | Hidden (uses event organizer_name) |

When user selects "Enter manually":

| Field | Behavior |
|-------|----------|
| Date | Editable |
| Time | Editable |
| Course | Hidden |
| Group Name | Shows input field |

---

## Key Line Numbers (index.html)

| Section | Lines |
|---------|-------|
| Modal HTML with toggle | 68497-68618 |
| Booking type toggle buttons | 68520-68530 |
| Event selection dropdown | 68537-68543 |
| Group name input | 68546-68552 |
| Course display | 68575-68581 |
| `setBookingType()` method | 68620-68650 |
| `loadUserEventsForBooking()` method | 68653-68691 |
| `onEventSelected()` method | 68694-68726 |
| Updated `confirmBooking()` | 68731-68820 |

---

## Testing Checklist

- [x] "My Tee Time" mode works (default)
- [x] "Joining Event" mode shows event dropdown
- [x] Events load from user's registrations
- [x] Selecting event auto-fills date/time/course
- [x] Date field becomes read-only when event selected
- [x] Manual entry option shows group name input
- [x] Booking saved with event_id, event_name, group_name
- [x] Toggle between modes resets form correctly

---

## Related Files

- `notify-caddy-booking/index.ts` - Notification function (includes event context)
- `2026-01-04_TEESHEET_CADDY_BOOKING_INTEGRATION.md` - Tee sheet integration
- `2026-01-04_NOTIFY_CADDY_BOOKING_FUNCTION.md` - Notification function docs

---

## Deployment

- **Commit:** 26106d5c
- **Production:** https://mycaddipro.com
- **Deploy Time:** 2026-01-04
