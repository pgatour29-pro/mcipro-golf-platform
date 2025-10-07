# Tee Sheet Pro Shop Integration Analysis

**Date:** October 4, 2025
**File:** `teesheetproshop.html`
**Purpose:** Central booking hub for golf course operations

---

## 1. Current Architecture

### Technology Stack
- **Framework:** React (standalone, no build process)
- **Language Support:** Multilingual (English, Thai, Korean, Japanese)
- **State Management:** React hooks (useState, useMemo, useCallback)
- **Sync System:** ScheduleSyncManager (singleton pattern)

### Core Components

#### ScheduleSyncManager (Lines 72-304)
**Purpose:** Central sync orchestrator for bookings, caddies, and golfer profiles

**Key Features:**
- Validates booking conflicts (caddy availability, golfer double-booking)
- Syncs bookings to caddy schedules and golfer profiles
- Maintains active bookings in memory via Map data structures
- Provides cancellation and conflict detection

**Data Structures:**
```javascript
{
  golferProfiles: Map(),      // Golfer ID → profile
  caddySchedules: Map(),       // Caddy ID → schedule with shifts
  activeBookings: Map()        // Booking ID → enhanced booking
}
```

#### BookingModal (Line 901+)
**Purpose:** Modal for creating/editing tee time bookings

**Features:**
- Golfer management (add/remove players)
- Caddy assignment per golfer
- Booking type selection (regular, tournament, lesson, maintenance)
- VIP status flagging
- Notes and special requests

#### TeeSheet Component
**Purpose:** Main grid display showing tee times across multiple courses

**Features:**
- Time slot grid (rows = times, columns = tees)
- Course lanes (multiple courses)
- Drag-and-drop booking movement
- Lock/unlock slots
- Clear day function

---

## 2. Current Booking Flow

### Step 1: User Clicks Empty Slot
- Opens BookingModal with selected time slot
- Modal initialized with empty golfer list

### Step 2: User Fills Booking Details
- Adds golfers (name, phone, email, handicap)
- Assigns caddies to golfers
- Selects booking type
- Adds notes

### Step 3: Save Booking
```javascript
handleSaveBooking(slot, booking) {
  // Line 2726-2754
  if (booking.status === 'cancelled') {
    syncManager.cancelBooking(booking.id);
    // Remove from grid
  } else {
    // Update demoRows state
    // Booking stored in slot.booking
  }
}
```

### Step 4: Sync to Schedules
```javascript
syncManager.syncBookingToSchedules(booking, slot) {
  // Lines 137-203
  1. Validate conflicts
  2. Update caddy schedules
  3. Update golfer profiles
  4. Store enhanced booking
  5. Return sync result
}
```

---

## 3. Integration Points with Main Platform (index.html)

### Current Gaps

#### ❌ No Shared Data Store
- **Problem:** Tee sheet uses React state (`demoRows`), main platform uses `BookingManager` + localStorage
- **Impact:** Bookings made in tee sheet don't appear in golfer dashboard
- **Impact:** Bookings made in golfer dashboard don't appear in tee sheet

#### ❌ No Cloud Sync Integration
- **Problem:** Tee sheet doesn't use `SimpleCloudSync` or Netlify Blobs
- **Impact:** Bookings not persisted to server
- **Impact:** No cross-device sync for pro shop staff

#### ❌ No Caddy Availability Sync
- **Problem:** Tee sheet's `ScheduleSyncManager.caddySchedules` is in-memory only
- **Impact:** Main platform's caddy booking doesn't check tee sheet availability
- **Impact:** Double-booking risk

#### ❌ No Golfer Profile Integration
- **Problem:** Tee sheet creates local golfer profiles, main platform has `ProfileSystem`
- **Impact:** Duplicate profile data
- **Impact:** Golfer history not shared

---

## 4. Proposed Integration Strategy

### Phase 1: Shared Cloud Storage ✅ CRITICAL

**Goal:** Use same Netlify Blobs storage for both systems

**Implementation:**
1. Add Netlify Blobs SDK to teesheetproshop.html
2. Replace ScheduleSyncManager storage with cloud sync
3. Use same data format as index.html BookingManager

**Code Changes:**
```javascript
// In teesheetproshop.html
class CloudSyncAdapter {
  static async saveBooking(booking) {
    const response = await fetch('/.netlify/functions/bookings', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer mcipro-site-key-2024',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        baseVersion: localStorage.getItem('mcipro_cloud_version') || 0,
        bookings: [booking]
      })
    });
    return response.json();
  }

  static async loadBookings() {
    const response = await fetch('/.netlify/functions/bookings', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mcipro-site-key-2024'
      }
    });
    return response.json();
  }
}
```

**Integration Point (Line 2726):**
```javascript
const handleSaveBooking = async (slot, booking) => {
  // Existing tee sheet state update
  setDemoRows(prevRows => ...);

  // NEW: Sync to cloud
  await CloudSyncAdapter.saveBooking(booking);
};
```

---

### Phase 2: Unified Booking Format ✅ CRITICAL

**Goal:** Ensure both systems use same booking object structure

**Current Tee Sheet Format:**
```javascript
{
  id: string,
  golfers: [
    { id, name, phone, email, handicap, isVIP }
  ],
  caddyBookings: [
    { caddyId, caddyName, caddyNumber, golferId }
  ],
  bookingType: 'regular'|'tournament'|'lesson'|'maintenance',
  notes: string,
  status: 'confirmed'|'pending'|'cancelled'
}
```

**Main Platform Format (index.html):**
```javascript
{
  id: string,
  kind: 'tee'|'caddie'|'service',
  golferId: string,
  golferName: string,
  course: string,
  courseId: string,
  date: 'YYYY-MM-DD',
  time: 'HH:MM',
  teeTime: ISO timestamp,
  players: number,
  status: 'confirmed'|'pending'|'cancelled',
  caddieId?: string,
  caddieName?: string,
  groupId: string,
  updatedAt: timestamp
}
```

**Unified Format (Proposal):**
```javascript
{
  // Core fields (compatible with both)
  id: string,
  kind: 'tee',
  groupId: string,

  // Time fields
  date: 'YYYY-MM-DD',
  time: 'HH:MM',
  teeTime: ISO timestamp,

  // Course fields
  course: string,
  courseId: string,
  teeNumber: number,

  // Booking fields
  bookingType: 'regular'|'tournament'|'lesson'|'maintenance',
  status: 'confirmed'|'pending'|'cancelled',
  players: number,

  // Golfer fields
  golfers: [
    {
      id: string,
      name: string,
      phone: string,
      email: string,
      handicap: number,
      isVIP: boolean,
      caddieId?: string,
      caddieName?: string
    }
  ],

  // Legacy compatibility
  golferId: string,  // = golfers[0].id
  golferName: string, // = golfers[0].name

  // Metadata
  notes: string,
  updatedAt: timestamp,
  syncStatus: 'synced'|'pending'|'conflict'
}
```

**Migration Strategy:**
1. Create converter functions in both systems
2. Tee sheet saves in unified format
3. Main platform reads and converts legacy format
4. Deprecate old format over time

---

### Phase 3: Caddy Availability Sync ⚠️ IMPORTANT

**Goal:** Real-time caddy availability across both systems

**Current Issue:**
- Main platform: Caddy availability in `caddyDatabase` array (index.html:13913+)
- Tee sheet: Caddy schedules in `ScheduleSyncManager.caddySchedules` Map

**Solution:**
1. Store caddy schedules in Netlify Blobs
2. Update when booking confirmed
3. Query before showing available caddies

**New Function Endpoint:**
`/.netlify/functions/caddy-schedules`

**Implementation:**
```javascript
// GET /.netlify/functions/caddy-schedules?date=2025-10-10
// Returns: { caddyId: { shifts: [...], bookings: [...] } }

// PUT /.netlify/functions/caddy-schedules
// Body: { caddyId, date, shift: { startTime, endTime, status, bookingId } }
```

---

### Phase 4: Golfer Profile Unification 🔄 NICE-TO-HAVE

**Goal:** Single source of truth for golfer data

**Current Issue:**
- Main platform: `ProfileSystem` with localStorage `mcipro_user_profile`
- Tee sheet: In-memory golfer profiles in ScheduleSyncManager

**Solution:**
1. Create golfer profile endpoint
2. Link by phone number or email
3. Auto-populate returning golfer data

**Benefits:**
- Pre-fill golfer info on repeat bookings
- Handicap tracking
- Booking history
- VIP status persistence

---

### Phase 5: Real-time Updates 🚀 FUTURE

**Goal:** Live updates when bookings change

**Options:**
1. **Polling:** Check cloud every 30s (simple, works everywhere)
2. **WebSockets:** Real-time push (complex, requires server)
3. **Server-Sent Events:** One-way push (middle ground)

**Recommended:** Start with polling, upgrade to WebSockets if needed

---

## 5. Implementation Roadmap

### Week 1: Foundation
- [ ] Add Netlify Blobs fetch calls to teesheetproshop.html
- [ ] Create unified booking format converter
- [ ] Test round-trip: Tee sheet → Cloud → Main platform

### Week 2: Integration
- [ ] Implement CloudSyncAdapter in tee sheet
- [ ] Update handleSaveBooking to sync to cloud
- [ ] Load tee sheet bookings from cloud on init
- [ ] Test: Create booking in tee sheet → Appears in golfer dashboard

### Week 3: Caddy Sync
- [ ] Create caddy-schedules Netlify function
- [ ] Update ScheduleSyncManager to use cloud caddy schedules
- [ ] Test: Book caddy in tee sheet → Shows as booked in main platform

### Week 4: Polish & Testing
- [ ] Add conflict resolution UI
- [ ] Handle offline mode
- [ ] Cross-device testing
- [ ] Performance optimization

---

## 6. Technical Challenges

### Challenge 1: React vs Vanilla JS
**Issue:** Tee sheet uses React, main platform uses vanilla JS
**Solution:** Keep separate, communicate via shared cloud storage
**Tradeoff:** Not real-time, but avoids major rewrite

### Challenge 2: State Management
**Issue:** React state updates don't trigger main platform updates
**Solution:** Polling mechanism in main platform checks for cloud updates
**Tradeoff:** 30s delay acceptable for pro shop use case

### Challenge 3: Data Migration
**Issue:** Existing bookings in old format
**Solution:** Converter reads both formats, writes unified format
**Tradeoff:** Migration period where both formats exist

### Challenge 4: Conflict Resolution
**Issue:** Two staff members book same slot simultaneously
**Solution:** Use baseVersion conflict detection (409 response)
**Tradeoff:** Last-write-wins for now, manual resolution later

---

## 7. Critical Integration Points (Code References)

### Tee Sheet → Cloud (NEW CODE NEEDED)
**Location:** Line 2726 in teesheetproshop.html
**Action:** Add cloud sync to handleSaveBooking

### Cloud → Main Platform (ALREADY EXISTS)
**Location:** Line 2440 in index.html
**Function:** `SimpleCloudSync.loadFromCloud()`
**Status:** ✅ Working

### Main Platform → Cloud (ALREADY EXISTS)
**Location:** Line 2563 in index.html
**Function:** `SimpleCloudSync.saveToCloud()`
**Status:** ✅ Working

### Tee Sheet → Cloud (MISSING)
**Location:** TBD
**Function:** CloudSyncAdapter.saveBooking()
**Status:** ❌ Not implemented

### Cloud → Tee Sheet (MISSING)
**Location:** TBD
**Function:** CloudSyncAdapter.loadBookings()
**Status:** ❌ Not implemented

---

## 8. Success Metrics

### Must Have (MVP)
- [ ] Booking created in tee sheet appears in golfer dashboard within 30s
- [ ] Booking created in golfer dashboard appears in tee sheet on refresh
- [ ] Caddy booked in tee sheet shows as unavailable in main platform
- [ ] No duplicate bookings across systems

### Nice to Have
- [ ] Golfer data auto-populates on repeat booking
- [ ] Booking history visible in both systems
- [ ] Conflict warnings before saving
- [ ] Real-time updates (< 5s delay)

### Performance
- [ ] Tee sheet loads all bookings < 2s
- [ ] Save booking completes < 1s
- [ ] Cloud sync completes < 500ms
- [ ] No UI blocking during sync

---

## 9. Next Steps

**Immediate (Today):**
1. Review this analysis with stakeholder
2. Confirm unified booking format
3. Prioritize Phase 1 vs Phase 3

**This Week:**
1. Implement CloudSyncAdapter in teesheetproshop.html
2. Test booking flow: Tee sheet → Cloud → Main platform
3. Create converter for legacy bookings

**Next Week:**
1. Add caddy schedule sync
2. Test cross-device scenarios
3. User acceptance testing with pro shop staff

---

## 10. Questions for Stakeholder

1. **Data Priority:** Should tee sheet bookings take precedence over golfer dashboard bookings in conflicts?
2. **Caddy Assignment:** Can golfers book caddies themselves, or only pro shop staff?
3. **Real-time Needs:** How fast do updates need to appear (30s polling vs real-time)?
4. **Migration:** Do we need to preserve existing tee sheet bookings, or start fresh?
5. **Access Control:** Should tee sheet be password protected for pro shop staff only?

---

**END OF ANALYSIS**
