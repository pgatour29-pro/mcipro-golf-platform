# Session Catalog - January 8, 2026
## Dashboard Schedule Tab & Caddy Booking Display Fixes

---

## ISSUES FIXED

### 1. Tee Sheet Booking Sync to Dashboard
**Problem:** Tee sheet bookings were not appearing in the golfer's Schedule tab or Today's Tee Time widget.

**Root Cause:** In `proshop-teesheet.html`, the `syncBookingToParent()` function was adding bookings to `BookingManager.bookings` array but NOT calling `saveToLocalStorage()` to persist them.

**Fix:** Added `bookingManager.saveToLocalStorage()` call after syncing:
```javascript
// CRITICAL: Save to localStorage so Schedule tab can read it
if (typeof bookingManager.saveToLocalStorage === 'function') {
    bookingManager.saveToLocalStorage();
    console.log('[TeeSheet] Saved to localStorage');
}
```

**File:** `public/proshop-teesheet.html` (line ~3123)

---

### 2. Duplicate Caddy Booking Displays (OVERKILL)
**Problem:** Same caddy booking data was showing in 3 places on the dashboard:
1. "Caddy Bookings" widget with CONFIRMED count (top)
2. "Upcoming Caddy Bookings" card (middle)
3. "📅 Upcoming Caddy Bookings" inside "My Caddy Booking" card (bottom)

**Fix:** Removed duplicate displays:
- Deleted `myCaddyBookingsWidget` section entirely (lines 28038-28055)
- Removed `standaloneCaddyBookings` container code from `displayStandaloneBookings()` function
- Kept only the "Upcoming Caddy Bookings" card next to "Today's Tee Time"

**File:** `public/index.html`

---

### 3. Schedule Tab Empty (No Caddy Bookings)
**Problem:** Schedule tab showed "No events scheduled" even though user had caddy bookings in the database.

**Root Cause:** Schedule tab only read from `BookingManager.bookings` / `localStorage.mcipro_bookings`, which didn't include caddy bookings from Supabase `caddy_bookings` table.

**Fix:** Modified `renderScheduleList()` to:
1. Fetch caddy bookings from Supabase `caddy_bookings` table
2. Convert them to Schedule-compatible format with `kind: 'tee'` and `kind: 'caddie'`
3. Add 30-second cache to avoid repeated database queries

**Code Added:**
```javascript
// Cache for Supabase caddy bookings (avoid repeated fetches)
_caddyBookingsCache: null,
_caddyBookingsCacheTime: 0,

async renderScheduleList() {
    // ... existing code ...

    // ALSO fetch caddy bookings from Supabase (with 30-second cache)
    const now = Date.now();
    const cacheAge = now - this._caddyBookingsCacheTime;
    if (!this._caddyBookingsCache || cacheAge > 30000) {
        // Fetch from caddy_bookings table
        const { data: caddyBookings } = await window.SupabaseDB.client
            .from('caddy_bookings')
            .select(`id, booking_date, tee_time, course_name, status, caddy_id,
                     caddy_profiles:caddy_id (name, photo_url, caddy_number)`)
            .eq('user_id', userId)
            .gte('booking_date', today)
            .in('status', ['pending', 'confirmed']);

        this._caddyBookingsCache = caddyBookings || [];
        this._caddyBookingsCacheTime = now;
    }

    // Convert to Schedule format
    this._caddyBookingsCache.forEach(cb => {
        bookings.push({
            id: `caddy_booking_${cb.id}`,
            groupId: `caddy_booking_${cb.id}`,
            type: 'tee_time',
            kind: 'tee',
            date: cb.booking_date,
            teeTime: `${cb.booking_date}T${cb.tee_time}`,
            course: cb.course_name,
            source: 'caddy_bookings'
        });
    });
}
```

**File:** `public/index.html` (lines ~20793-20894)

---

### 4. Slow Login Page Load
**Problem:** After adding Supabase fetch to `renderScheduleList()`, login was taking too long because the function was called 4+ times during init (immediately, 100ms, 500ms, 1000ms timeouts).

**Fix:** Added 30-second cache so Supabase query only runs once per 30 seconds, not on every render call.

---

### 5. Today's Tee Time Display Enhancement
**Problem:** Course name was showing as ID (`treasure-hill-golf`) instead of readable name.

**Fix:** Updated `TodaysTeeTimeManager.updateTodaysTeeTime()` to use `courseDisplay` field:
```javascript
const courseName = booking.courseDisplay || booking.course || booking.courseName || 'Golf Course';
const playerCount = booking.golfers?.length || booking.players || 1;
```

Also added group name display if available.

---

## FILES MODIFIED

| File | Changes |
|------|---------|
| `public/proshop-teesheet.html` | Added `saveToLocalStorage()` call in `syncBookingToParent()` |
| `public/index.html` | Removed duplicate caddy booking widgets, added Supabase fetch to Schedule tab, added cache, enhanced Today's Tee Time display |

---

## COMMITS THIS SESSION

1. **c2a1c522** - Fix tee sheet booking sync to dashboard Schedule tab and Today's Tee Time
2. **5da189ec** - Fix duplicate caddy bookings display and populate Schedule tab
3. **4a81de10** - Add 30-second cache to Schedule tab caddy bookings fetch

---

## KEY LEARNINGS

### 1. BookingManager Persistence
When modifying `BookingManager.bookings` array directly, MUST call `saveToLocalStorage()` to persist changes. Otherwise, Schedule tab won't see the data.

### 2. Avoid Duplicate UI Components
Don't show the same data in multiple places on the same page - it's overkill and confuses users.

### 3. Cache Database Queries
When a function is called multiple times during init (via timeouts), add caching to avoid repeated slow database queries.

### 4. Schedule Tab Data Format
Schedule tab expects bookings with:
- `id` and `groupId`
- `kind: 'tee'` for tee time bookings (required for group to show)
- `kind: 'caddie'` for caddie bookings
- `teeTime` in ISO format (`YYYY-MM-DDTHH:MM:SS`)
- `status: 'confirmed'`

---

## DATA FLOW

### Tee Sheet → Dashboard Sync
```
Pro Shop Tee Sheet booking created
    ↓
saveDay() called
    ↓
Builds parentBooking object with:
  - id: `teesheet-${booking.id}`
  - type: 'tee_time'
  - teeTime: ISO format
  - courseDisplay: readable course name
    ↓
ParentBridge.syncBookingToParent(parentBooking)
    ↓
bookingManager.bookings.push(booking)
    ↓
bookingManager.saveToLocalStorage()  ← THIS WAS MISSING
    ↓
localStorage['mcipro_bookings'] updated
    ↓
Schedule tab reads from localStorage
```

### Schedule Tab Data Sources
```
renderScheduleList()
    ↓
1. BookingManager.bookings (tee sheet sync)
    ↓
2. localStorage['mcipro_bookings'] (fallback)
    ↓
3. Supabase caddy_bookings table (NEW - with 30s cache)
    ↓
Merge all sources
    ↓
Filter by current user
    ↓
Group by groupId
    ↓
Render schedule cards
```

---

## TESTING CHECKLIST

- [ ] Hard refresh (`Ctrl+Shift+R`) to clear cache
- [ ] Create tee sheet booking → appears in Schedule tab
- [ ] Schedule tab shows caddy bookings from database
- [ ] No duplicate caddy booking sections on overview
- [ ] "Upcoming Caddy Bookings" card shows correctly
- [ ] Login speed is acceptable (not slow from repeated DB queries)
- [ ] Today's Tee Time shows course name correctly

---

## USER IDS REFERENCE

| Name | LINE User ID |
|------|--------------|
| Pete Park | U2b6d976f19bca4b2f4374ae0e10ed873 |

---

## SCREENSHOTS ANALYZED

1. **Schedule tab**: Empty - "No events scheduled"
2. **Caddy Bookings widget**: Showed "CONFIRMED · 4" with Pensri Nawin, Sirilak Thani
3. **Overview middle**: Today's Tee Time (empty) + Upcoming Caddy Bookings (3 caddies)
4. **Overview bottom**: Upcoming Events + My Caddy Booking (duplicate caddy list)

All issues addressed in this session.

---

## ADDITIONAL FIXES (Later in Session)

### 6. Live Scorecard startRound Freezing
**Problem:** Starting a round at Phoenix (or any course) was freezing the UI.

**Root Cause:** In `startRound()`, there was a sequential `for...of` loop fetching handicaps for each player one at a time. With 4 players, this meant 4 database calls waiting for each other.

**Fix:** Changed to `Promise.all()` for parallel fetching:
```javascript
// BEFORE - sequential (slow, freezes UI)
for (const player of this.players) {
    const hcps = await this.getPlayerSocietyHandicaps(player.id);
}

// AFTER - parallel (fast)
await Promise.all(players.map(p => this.getPlayerSocietyHandicaps(p.id)));
```

**File:** `public/index.html` (lines ~52718-52757)
**Commit:** `6eaac3b3`

---

### 7. NotificationManager Not Defined
**Problem:** Multiple console errors: `NotificationManager is not defined`

**Root Cause:** `NotificationManager.show()` was called 100+ times throughout the codebase but the object was **never defined**.

**Fix:** Added `window.NotificationManager` definition at line 6204 with a `show()` method that creates toast notifications.

**File:** `public/index.html` (lines 6204-6241)
**Commit:** `ac6fa74e`

---

## FULL COMMIT LIST

1. **c2a1c522** - Tee sheet sync fix (saveToLocalStorage)
2. **5da189ec** - Remove duplicate caddy booking displays
3. **4a81de10** - Add 30-second cache to Schedule tab
4. **8cfe6fc2** - Session catalog
5. **6eaac3b3** - HOTFIX: startRound freezing (parallel handicap fetch)
6. **ac6fa74e** - Add missing NotificationManager
