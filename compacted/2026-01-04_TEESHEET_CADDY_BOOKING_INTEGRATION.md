# Pro Shop Tee Sheet - Caddy Booking System Integration
## Date: 2026-01-04

---

## Summary

Integrated the Pro Shop Tee Sheet module with the main MciPro caddy booking system. Tee sheet now pulls caddies from `CaddySystem.allCaddys`, syncs bookings to `BookingManager`, and persists to Supabase via `SimpleCloudSync`.

---

## Architecture

```
Pro Shop (iframe)          Parent Window (index.html)
    │                              │
    │  ┌──────────────────────────────────────────┐
    │  │              ParentBridge                │
    │  │  - getCaddySystem() ────────► CaddySystem.allCaddys
    │  │  - getBookingManager() ─────► BookingManager.bookings
    │  │  - getCloudSync() ──────────► SimpleCloudSync.saveToCloud()
    │  └──────────────────────────────────────────┘
    │                              │
    ▼                              ▼
[Tee Sheet]               [Caddy Booking Module]
    │                              │
    └────────► Supabase ◄──────────┘
```

---

## Key Changes

### 1. ParentBridge Object (lines 2041-2180)

```javascript
const ParentBridge = {
  getParent() { /* returns window.parent or window */ },
  getCaddySystem() { /* accesses parent's CaddySystem */ },
  getBookingManager() { /* accesses parent's BookingManager */ },
  getCloudSync() { /* accesses parent's SimpleCloudSync */ },
  getAllCaddies(courseId) { /* filters caddies by homeClub */ },
  syncBookingToParent(booking) { /* syncs to BookingManager + Supabase */ },
  getBookingsFromParent(date, courseId) { /* loads bookings from parent */ }
};
```

### 2. Course Select Updated (lines 1218-1230)

Options now match `homeClub` values from `CaddySystem.allCaddys`:

| Value | Course Name |
|-------|-------------|
| pattana-golf-resort | Pattana Golf Club & Resort |
| pattaya-golf | Pattaya Golf Club |
| thai-country-club | Thai Country Club |
| siam-plantation | Siam Plantation Golf Club |
| royal-garden | Royal Garden Golf Club |
| bangpra-international | Bangpra International Golf Club |
| crystal-bay | Crystal Bay Golf Club |
| laem-chabang | Laem Chabang International Country Club |
| pleasant-valley | Pleasant Valley Country Club |
| royal-lakeside | Royal Lakeside Golf Club |

### 3. Enhanced getDay() (lines 2382-2404)

Merges local tee sheet bookings with bookings from parent BookingManager:

```javascript
const getDay = d => {
  // Get local tee sheet bookings
  let localBookings = JSON.parse(localStorage.getItem(storageKey(d)) || '[]');

  // Get bookings from parent (caddy booking module, etc.)
  const parentBookings = ParentBridge.getBookingsFromParent(d, courseId);

  // Merge: local + parent (avoiding duplicates)
  return [...localBookings, ...uniqueParent];
};
```

### 4. Enhanced setDay() (lines 2406-2423)

Syncs each booking to parent BookingManager and Supabase:

```javascript
const setDay = (d, arr) => {
  localStorage.setItem(storageKey(d), JSON.stringify(arr || []));

  arr.forEach(booking => {
    const parentBooking = {
      id: `teesheet-${booking.id}`,
      type: 'tee_time',
      source: 'teesheet',
      course: courseId,
      caddyBookings: (booking.golfers || []).filter(g => g.caddyNumber).map(g => ({...})),
      // ... other fields
    };
    ParentBridge.syncBookingToParent(parentBooking);
  });
};
```

### 5. Dynamic Caddy Loading (lines 2185-2198)

Caddies refresh when course changes:

```javascript
function refreshCaddies() {
  const courseId = el.courseSelect.value;
  allCaddies = ParentBridge.getAllCaddies(courseId);
  console.log('[TeeSheet] Loaded', allCaddies.length, 'caddies for course:', courseId || 'all');
}

el.courseSelect.addEventListener('change', () => {
  refreshCaddies();
  render();
});
```

---

## Data Flow

### Booking Creation (Tee Sheet → Parent)

1. User creates booking in tee sheet
2. `setDay()` saves to localStorage
3. `ParentBridge.syncBookingToParent()` converts to BookingManager format
4. BookingManager receives booking with `source: 'teesheet'`
5. `SimpleCloudSync.saveToCloud()` persists to Supabase

### Booking Display (Parent → Tee Sheet)

1. Tee sheet calls `getDay(date)`
2. Local bookings loaded from localStorage
3. `ParentBridge.getBookingsFromParent()` fetches from BookingManager
4. Bookings with `source: 'teesheet'` are excluded (already in local)
5. Remaining bookings merged and displayed with `fromParent: true` flag

---

## Booking Data Format

### Tee Sheet Format
```javascript
{
  id: 'abc123',
  time: '08:00',
  type: 'regular|vip|society|tournament',
  course: 'A',
  tee: 1,
  col: 0,
  golfers: [{
    name: 'John Doe',
    caddyId: 'pat001',
    caddyNumber: '001',
    caddyName: 'Somchai',
    caddyLocalName: 'สมชาย'
  }],
  notes: ''
}
```

### BookingManager Format
```javascript
{
  id: 'teesheet-abc123',
  type: 'tee_time',
  source: 'teesheet',
  course: 'pattana-golf-resort',
  courseDisplay: 'Pattana Golf Club & Resort',
  date: '2026-01-04',
  time: '08:00',
  status: 'confirmed',
  bookingType: 'regular',
  golfers: [...],
  caddyBookings: [{
    caddyId: 'pat001',
    caddyNumber: '001',
    caddyName: 'Somchai',
    caddyLocalName: 'สมชาย',
    golferName: 'John Doe',
    date: '2026-01-04',
    time: '08:00',
    course: 'pattana-golf-resort'
  }]
}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `public/proshop-teesheet.html` | Added ParentBridge, updated course options, enhanced getDay/setDay |

---

## Testing Checklist

- [x] Tee sheet loads caddies from parent CaddySystem
- [x] Course change refreshes caddy list filtered by homeClub
- [x] Booking in tee sheet syncs to parent BookingManager
- [x] Bookings from caddy booking module appear in tee sheet
- [x] Cloud sync triggered on booking save
- [x] Console logs bridge status on load

---

## Console Logs

On tee sheet load:
```
[TeeSheet] Parent Bridge Status: {caddySystem: true, bookingManager: true, cloudSync: true, caddyCount: 160, parentBookingsCount: 5}
[TeeSheet] Loaded 20 caddies for course: pattana-golf-resort
```

On booking save:
```
[TeeSheet] Booking synced to parent BookingManager
[TeeSheet] Booking synced to cloud
```

---

## Deployment

- **Production URL:** https://mycaddipro.com
- **Pro Shop Tee Sheet:** Pro Shop Dashboard → Tee Sheet tab
- **Deploy Time:** 2026-01-04
