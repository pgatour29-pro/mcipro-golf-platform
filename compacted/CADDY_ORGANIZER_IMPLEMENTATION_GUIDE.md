# Caddy Organizer Feature - Implementation Guide

**Created:** 2025-11-03
**Status:** Ready to implement
**Priority:** High

---

## Feature Overview

**Personal Caddy Inventory & Booking Manager**

Allows golfers to:
- ✅ View all available caddies by golf course
- ✅ Save favorite caddies to personal list
- ✅ Mark regular caddies (frequently booked)
- ✅ Quick book caddies directly from list
- ✅ Add personal notes per caddy
- ✅ Track booking history with each caddy
- ✅ Rate and review caddies after rounds

---

## Database Schema

### Tables Created:

**1. `caddy_profiles`** - Master caddy database
- All available caddies across golf courses
- Public information: name, photo, rating, experience
- Course association: links to specific golf courses
- Skills & specialties

**2. `user_caddy_preferences`** - Personal caddy lists
- User's saved caddies
- Favorite flags
- Regular flags
- Personal notes & ratings
- Booking history

**3. `caddy_bookings`** - Booking records
- Track caddy reservations
- Link to tee time bookings
- Post-round ratings & reviews

### SQL File:
📄 `sql/create_caddy_organizer_tables.sql`

---

## UI Implementation

### 1. New Tab in Golfer Dashboard

**Location:** After "Live Scorecard" tab (line ~20317)

**Tab Button:**
```html
<button onclick="showGolferTab('caddies', event)" class="tab-button px-1 md:px-2">
    <span class="material-symbols-outlined text-sm">person_pin</span>
    <span class="ml-1">My Caddies</span>
</button>
```

### 2. Tab Content Structure

```
┌─────────────────────────────────────┐
│  My Caddy Organizer                 │
├─────────────────────────────────────┤
│  [All Courses ▼] [⭐ Favorites] [🔄 Regulars]│
├─────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │Caddy │  │Caddy │  │Caddy │     │
│  │Card  │  │Card  │  │Card  │     │
│  │  ⭐  │  │      │  │  💼  │     │
│  └──────┘  └──────┘  └──────┘     │
└─────────────────────────────────────┘
```

### 3. Caddy Card Layout

Each caddy card shows:
- **Photo** (or default avatar)
- **Name** + rating (⭐ 4.8)
- **Course name**
- **Experience** (8 years)
- **Languages** (🇬🇧 🇹🇭 🇯🇵)
- **Status badges:**
  - ⭐ Favorite (gold star)
  - 💼 Regular (blue badge)
  - 📅 "Booked 5 times"
- **Action buttons:**
  - ❤️ Add to Favorites
  - 📋 Add to My List
  - 📞 Book Caddy
  - 📝 Add Note

---

## Features Breakdown

### Feature 1: View All Caddies by Course ✅

**UI:**
- Dropdown selector for golf courses
- Grid layout of caddy cards
- Sort options: Rating, Experience, Name
- Filter: Favorites Only, Regulars Only, All

**Data Source:**
- Query: `SELECT * FROM caddy_profiles WHERE course_name = ?`
- Join with user_caddy_preferences to show personal flags

### Feature 2: Save to Personal List ✅

**Action:** Click "Add to My List" button

**Backend:**
```sql
INSERT INTO user_caddy_preferences (user_id, caddy_id)
VALUES (?, ?)
```

**UI Update:**
- Card gets "In My List" badge
- Button changes to "Remove from List"

### Feature 3: Mark as Favorite ⭐

**Action:** Click heart/star icon

**Backend:**
```sql
UPDATE user_caddy_preferences
SET is_favorite = true
WHERE user_id = ? AND caddy_id = ?
```

**UI Update:**
- Gold star appears on card
- Card moves to top of list
- "Favorites" filter shows this caddy

### Feature 4: Mark as Regular 💼

**Action:** Click "Mark as Regular" button

**Backend:**
```sql
UPDATE user_caddy_preferences
SET is_regular = true
WHERE user_id = ? AND caddy_id = ?
```

**UI Update:**
- Blue "Regular" badge appears
- Shows in "Regulars" filter

### Feature 5: Quick Book Caddy 📞

**Action:** Click "Book Caddy" button

**Flow:**
1. Open booking modal
2. Pre-fill caddy information
3. Select date + tee time
4. Confirm booking
5. Update booking history

**Backend:**
```sql
INSERT INTO caddy_bookings (user_id, caddy_id, booking_date, course_name)
VALUES (?, ?, ?, ?)
```

**Integration:**
- Links to existing tee time booking system
- Adds caddy to booking record

### Feature 6: Personal Notes 📝

**Action:** Click "Add Note" → opens note editor

**Backend:**
```sql
UPDATE user_caddy_preferences
SET personal_notes = ?
WHERE user_id = ? AND caddy_id = ?
```

**UI:**
- Shows note icon if notes exist
- Hover to preview note
- Click to edit

### Feature 7: View Booking History 📅

**UI:** Show on caddy card:
- "Booked 5 times"
- "Last booked: Nov 1, 2025"

**Data:**
```sql
SELECT times_booked, last_booked_date
FROM user_caddy_preferences
WHERE user_id = ? AND caddy_id = ?
```

---

## JavaScript Class Structure

### CaddyOrganizerSystem

```javascript
class CaddyOrganizerSystem {
    constructor() {
        this.currentCourse = null;
        this.allCaddies = [];
        this.myCaddies = [];
        this.filter = 'all'; // all, favorites, regulars
    }

    async init() {
        await this.loadMyCaddies();
        await this.loadAllCaddies();
        this.render();
    }

    async loadAllCaddies(courseName = null) {
        // Query caddy_profiles table
    }

    async loadMyCaddies() {
        // Query user_caddy_preferences joined with caddy_profiles
    }

    async addToMyList(caddyId) {
        // INSERT INTO user_caddy_preferences
    }

    async toggleFavorite(caddyId) {
        // UPDATE is_favorite
    }

    async toggleRegular(caddyId) {
        // UPDATE is_regular
    }

    async saveNote(caddyId, note) {
        // UPDATE personal_notes
    }

    async bookCaddy(caddyId) {
        // Open booking modal
    }

    filterCaddies(filter) {
        // Filter by favorites/regulars/all
    }

    render() {
        // Render caddy cards
    }
}
```

---

## Step-by-Step Implementation

### STEP 1: Run SQL Migration ✅

```bash
# In Supabase Dashboard → SQL Editor
# Run: sql/create_caddy_organizer_tables.sql
```

**Result:** Tables created, sample data inserted

### STEP 2: Add Tab Button

**File:** `index.html` line ~20318

**Add:**
```html
<button onclick="showGolferTab('caddies', event)" class="tab-button px-1 md:px-2">
    <span class="material-symbols-outlined text-sm">person_pin</span>
    <span class="ml-1">My Caddies</span>
</button>
```

### STEP 3: Add Tab Content

**File:** `index.html` (after other tabs, around line ~22000)

**Add:** Complete HTML structure with:
- Header with course filter
- Filter buttons (All, Favorites, Regulars)
- Caddy cards grid
- Empty states
- Modals (booking, notes)

### STEP 4: Add JavaScript Class

**File:** `index.html` (in script section)

**Add:** Complete `CaddyOrganizerSystem` class

### STEP 5: Initialize on Tab Load

**File:** `index.html` in `showGolferTab()` function

**Add:**
```javascript
if (tabName === 'caddies' && typeof CaddyOrganizerSystem !== 'undefined') {
    CaddyOrganizerSystem.init();
}
```

### STEP 6: Test

1. Login as golfer
2. Click "My Caddies" tab
3. Select a golf course
4. See list of caddies
5. Click "Add to My List"
6. Click star icon → mark as favorite
7. Click "Book Caddy" → opens booking modal

---

## Data Flow Diagrams

### Load Caddies Flow:
```
User clicks "My Caddies" tab
    ↓
CaddyOrganizerSystem.init()
    ↓
Load user's saved caddies (JOIN query)
    ↓
Load all caddies for selected course
    ↓
Render cards with badges (⭐💼📅)
```

### Add to Favorites Flow:
```
User clicks star icon
    ↓
toggleFavorite(caddyId)
    ↓
UPDATE user_caddy_preferences SET is_favorite = true
    ↓
Re-render card with gold star
    ↓
Show success notification
```

### Book Caddy Flow:
```
User clicks "Book Caddy"
    ↓
bookCaddy(caddyId)
    ↓
Open booking modal (pre-filled)
    ↓
User selects date + time
    ↓
INSERT INTO caddy_bookings
    ↓
UPDATE times_booked counter
    ↓
Show confirmation
```

---

## UI Mockups

### Caddy Card (Favorite + Regular):
```
┌────────────────────────────────┐
│  👤 [Photo]        ⭐ 4.8  ⭐   │
│  Somchai Khunpol              │
│  Phoenix Gold Golf Club        │
│  💼 Regular • 8 years exp      │
│  🇬🇧 🇹🇭 Languages              │
│  📅 Booked 12 times            │
│  ──────────────────────────    │
│  [📝 Note] [📞 Book] [❤️ Fav]  │
└────────────────────────────────┘
```

### Empty State:
```
┌────────────────────────────────┐
│           🏌️                   │
│   No Caddies Saved Yet         │
│                                 │
│   Browse caddies by selecting  │
│   a golf course above          │
│                                 │
│   [Browse Caddies]             │
└────────────────────────────────┘
```

---

## Integration Points

### 1. Golf Course Data
- Links to existing golf course inventory
- Uses `course_name` to filter caddies

### 2. Booking System
- Integrates with tee time booking
- Adds caddy to booking record

### 3. User Profile
- Uses AppState.currentUser.lineUserId
- Links to user's personal preferences

### 4. Notifications
- Shows NotificationManager alerts
- Success/error messages

---

## Estimated Implementation Time

| Task | Time | Difficulty |
|------|------|------------|
| SQL Migration | 5 min | Easy |
| Add Tab Button | 2 min | Easy |
| HTML Structure | 30 min | Medium |
| JavaScript Class | 60 min | Medium |
| Styling & Polish | 30 min | Easy |
| Testing | 20 min | Easy |
| **TOTAL** | **~2.5 hours** | **Medium** |

---

## Testing Checklist

- [ ] SQL migration runs successfully
- [ ] Tab appears in navigation
- [ ] Course selector loads courses
- [ ] Caddy cards display correctly
- [ ] "Add to My List" works
- [ ] Star icon toggles favorite status
- [ ] "Mark as Regular" works
- [ ] Personal notes save/load
- [ ] Booking modal opens
- [ ] Filters work (All/Favorites/Regulars)
- [ ] Empty states display
- [ ] Mobile responsive
- [ ] Performance (loads < 1 second)

---

## Future Enhancements (Phase 2)

- [ ] Caddy availability calendar
- [ ] Chat with caddy via LINE
- [ ] Request specific caddy for booking
- [ ] Group bookings with caddy assignments
- [ ] Caddy performance analytics
- [ ] Compare multiple caddies
- [ ] Caddy recommendations based on playing style
- [ ] Share caddy recommendations with friends
- [ ] Loyalty rewards for regular caddies

---

## Files to Modify

| File | Changes |
|------|---------|
| `sql/create_caddy_organizer_tables.sql` | ✅ Created |
| `index.html` | Add tab button, tab content, JavaScript class |
| `public/index.html` | Copy from index.html |
| `sw.js` | Update version number |

---

## Summary

This feature adds a comprehensive caddy management system to the golfer dashboard. It allows golfers to:

1. **Discover** caddies at different golf courses
2. **Save** their favorite caddies to a personal list
3. **Organize** caddies with favorites and regular flags
4. **Track** booking history with each caddy
5. **Book** caddies directly from their list
6. **Rate** and review caddies after rounds

The implementation is modular, database-driven, and integrates seamlessly with existing booking and course systems.

---

**Status:** Ready to implement
**Next Step:** Run SQL migration, then add UI components
**Expected Result:** Fully functional caddy organizer in ~2.5 hours
