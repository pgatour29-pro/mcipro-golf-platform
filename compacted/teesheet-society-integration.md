# Tee Sheet Society Event Integration

## Summary
Integrated society events and caddy bookings into the pro shop tee sheet, allowing golfers who book caddies for society events to appear in their specific time slots.

## Files Modified
- `public/proshop-teesheet.html`

## Key Features Implemented

### 1. Society Events on Tee Sheet
- Society events fetched from `society_events` table in Supabase
- Events filtered by selected course (course name mapping implemented)
- Events displayed as blocked time ranges with multiple slots (5-min intervals)
- Each slot shows: time, group name, golfers with caddy info

### 2. Caddy Booking Integration
- Caddy bookings fetched from `caddy_bookings` table
- Golfers appear in the exact slot matching their `tee_time`
- Multiple golfers can share same slot
- Cancelled bookings filtered out (`.neq('status', 'cancelled')`)

### 3. Course Name Mapping
```javascript
const courseNameToId = {
  'treasure hill golf & country club': 'treasure-hill-golf',
  'treasure hill': 'treasure-hill-golf',
  'treasure hill cc': 'treasure-hill-golf',
  'greenwood': 'greenwood',
  'pattana': 'pattana',
  'burapha': 'burapha-ac',
  // ... many more courses
};
```

### 4. Calendar Navigator
- Month view showing all society events
- Pre-fetches society events for entire month when opened
- Click any day to navigate directly to that date
- Shows society event previews (deduplicated by groupId)

### 5. Auto-Refresh & Performance
- Initial load with retry mechanism (1.5s + 2s retries if no data)
- 30-second auto-refresh for live updates
- **Two-phase rendering**: Society events render immediately, caddy bookings added after
- Cache clearing helper: `clearAllCaches(date, courseId)`

## Database Tables Used

### society_events
- `id`, `title`, `event_date`, `start_time`, `end_time`
- `course_name`, `society_id`, `status`

### caddy_bookings
- `id`, `user_id`, `caddy_id`, `booking_date`, `tee_time`
- `status`, `created_at`, `course_name`
- Joined with `caddy_profiles` for caddy name/number
- Joined with `user_profiles` for golfer name

### event_registrations
- `id`, `event_id`, `player_id`, `player_name`, `caddy_numbers`
- Note: Not used for tee sheet display (only caddy_bookings show)

## Key Code Sections

### Fetch Society Events (line ~2406)
```javascript
async function fetchSocietyEvents(date) {
  const { data } = await supabaseClient
    .from('society_events')
    .select('id, title, event_date, start_time, end_time, course_name, society_id, status')
    .eq('event_date', date);

  // Filter by selected course
  const filteredData = data.filter(evt => {
    const eventCourseId = matchCourseToId(evt.course_name);
    return eventCourseId === selectedCourseId;
  });

  // Create time slots for blocked range
  // ...
}
```

### Caddy Booking Enrichment (line ~3715)
```javascript
// Add caddy bookings to the slot that matches their exact tee_time
caddyBookings.forEach(cb => {
  const cbMins = minutes(cb.time);
  // Only add to slot if caddy booking time matches this slot's time
  if (cbMins !== slotMins) return;

  // Add golfer to slot
  b.golfers.push({
    name: golfer.name,
    caddyId: golfer.caddyId,
    caddyName: golfer.caddyName,
    caddyNumber: golfer.caddyNumber
  });
});
```

### Calendar Month Fetch (line ~5492)
```javascript
async fetchMonthSocietyEvents(year, month) {
  const { data } = await supabaseClient
    .from('society_events')
    .select('...')
    .gte('event_date', firstDay)
    .lte('event_date', lastDay);

  // Populate societyEventsCache for each date
}
```

## Issues Fixed

1. **Pete Park showing 12 times** - Fixed by matching exact slot time, not event range
2. **Wrong courses showing** - Added course filtering with name mapping
3. **3-5 min load delay** - Added retry mechanism on initial load
4. **Calendar not showing events** - Added fetchMonthSocietyEvents for calendar
5. **Incorrect event on Jan 23** - Deleted erroneous T.Hill event from database
6. **Slow caddy booking load (30-60s)** - Two-phase rendering, society events show instantly
7. **Today button text overflow** - CSS specificity fix with `.date-control .today-btn`
8. **Broken user_profiles join** - user_id is LINE ID, not foreign key - requires separate lookup

## Data Flow (Two-Phase Rendering)

```
User opens tee sheet
    ↓
fetchAndRender() called
    ↓
Phase 1: fetchSocietyEvents(date)
    ↓
render() - displays society events immediately
    ↓
Phase 2: Promise.all([
  fetchCaddyBookings(date),      // 2 queries: caddy_bookings + user_profiles
  fetchEventRegistrations(date)
])
    ↓
render() - adds caddy bookings to society slots
    ↓
Display complete tee sheet with golfer names
```

### Why Two-Phase?
- Society events = 1 fast query → instant display
- Caddy bookings = 2 sequential queries (caddy_bookings then user_profiles for golfer names)
- Without two-phase, caddy booking delay blocks everything

### 6. Today Button
- Quick navigation back to current date
- Blue button in date control area
- Fetches fresh data after navigation
- CSS: `.date-control .today-btn` overrides parent's `width: 40px`

### 7. fetchAndRender (line ~4814)
```javascript
async function fetchAndRender() {
  const currentDate = el.dateInput.value;

  // Phase 1: Society events render immediately
  await fetchSocietyEvents(currentDate);
  render();

  // Phase 2: Caddy bookings added after
  await Promise.all([
    fetchCaddyBookings(currentDate),
    fetchEventRegistrations(currentDate)
  ]);
  render();
}
```

### 8. fetchCaddyBookings (line ~2287)
```javascript
// Query 1: Get caddy bookings with caddy profile
const { data } = await supabaseClient
  .from('caddy_bookings')
  .select('*, caddy_profiles(name, caddy_number, photo_url)')
  .eq('booking_date', date)
  .neq('status', 'cancelled');

// Query 2: Get user profiles for golfer names (user_id = LINE ID)
const { data: profiles } = await supabaseClient
  .from('user_profiles')
  .select('line_user_id, name, email')
  .in('line_user_id', userIds);
```

## Testing Notes

- Test URL: https://mycaddipro.com/proshop-teesheet.html?course=treasure-hill-golf
- Navigate to date with society event (e.g., Jan 21, 2026)
- Verify golfers with caddy bookings appear in correct slot
- Verify other courses' events don't appear on Treasure Hill tee sheet
- Click "Today" button to return to current date
