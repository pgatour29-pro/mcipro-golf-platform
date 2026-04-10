# Session Catalog — 2026-04-09

## Overview
Profile display preference fix, My Caddies dashboard improvements, Caddy Notebook feature, Community Leaderboard enhancements (4-day history, ticker flip, View All modal).
All changes in `public/index.html` and `public/supabase-config.js`.

---

## 1. Profile Display Preference Fix (Home Course vs Society)
**Commits:** `4c11fe23`, `6e9ea545`
**Cache versions:** v314, v315

### The Bug
Users could select "Golf Society" as their header display preference in My Profile settings, but:
- The setting didn't save or take effect (header always showed home course)
- Blocking `alert()`/`confirm()` dialogs appeared behind the profile modal, trapping the UI

### Root Causes
1. `AppState.currentUser.profileData` was conditionally updated — if undefined (common on fresh logins), the sync was skipped entirely
2. `roleSpecific` data (containing `clubAffiliation`) was NOT saved to Supabase's `profile_data` JSONB column, so it was lost on reload
3. `roleSpecific` was not restored from Supabase when profile was loaded on login
4. `society_name` column was not synced from `clubAffiliation` on profile save
5. Blocking `alert()` for "Cloud sync failed" appeared behind the profile modal — user couldn't dismiss it

### What Was Fixed
- **`public/index.html`:**
  - `AppState.currentUser.profileData` now always created/updated on save (not conditional)
  - `profile_data.roleSpecific` synced to AppState on save
  - Modal closes BEFORE Supabase save runs (prevents trapped alerts)
  - Supabase error `alert()` replaced with non-blocking `NotificationManager`
  - Removed blocking `confirm()` for missing home course
  - `societyName` passed to `saveUserProfile` from `clubAffiliation`
  - `roleSpecific` loaded from Supabase `profile_data` on login (line ~11913)

- **`public/supabase-config.js`:**
  - Added `roleSpecific: profile.roleSpecific || {}` to `profile_data` JSONB in `saveUserProfile()`

### Key Code Locations
- Save flow: `saveProfileFromForm()` → line ~24287
- AppState sync: line ~24625
- Supabase save: `saveProfileToSupabase()` → line ~23162
- `saveUserProfile()` in supabase-config.js → line 304
- Profile load from Supabase: line ~11904
- Display logic: `updateRoleSpecificDisplays()` → line ~14643
- `updateDashboardData()` → line ~24023

### Display Preference Logic
```
profileDisplayPreference = 'homeCourse' | 'society'
If 'society' AND clubAffiliation is non-empty and not 'Independent':
  → Show society name, hide home course
Else:
  → Show home course, hide society
```

---

## 2. My Caddies Dashboard Card — Show Event Caddy Bookings
**Commit:** `223da951`
**Cache version:** v316

### The Bug
"My Caddies" card on dashboard always showed "No caddy bookings yet" even when user had caddy numbers saved in event registrations.

### Root Cause
`loadUserCaddyBookings()` only fetched the LAST registration with caddy numbers (limit 1), didn't filter to upcoming events, and didn't display them as booking cards.

### What Was Fixed
- `loadUserCaddyBookings()` now fetches ALL event registrations with caddy numbers
- Filters to future events only (`event_date >= today`)
- Sorts by date ascending
- New `displayEventCaddyBookings()` renders cards with caddy #, event name, course, date, time
- Fixed `society_events` join: changed `tee_time` to `start_time` (column name fix)

### Key Code Location
- `DashboardCaddyBooking` object → line ~31634

---

## 3. Caddy Notebook (NEW FEATURE)
**Commit:** `4275ea38`
**Cache version:** v317

### What It Is
A personal notepad for golfers to save caddy info they encounter on the course, for future reference and booking.

### What Was Added
- New dropdown option "My Caddy Notebook" in the My Caddy Organizer filter
- Add form: Caddy #, Name, Course, Notes fields + "Save to Notebook" button
- Entries list with date added and delete button
- Data stored in `localStorage` key `mcipro_caddy_notebook_{userId}`

### What Was Also Changed
- Filter buttons (All Caddies, Favorites, Regulars, My List) replaced with a `<select>` dropdown to save space on mobile

### Key Code Locations
- `CaddyNotebook` object → line ~31955 (before DashboardPerformance)
- Filter dropdown HTML → line ~37513
- Notebook section HTML → line ~37520
- `CaddyOrganizerSystem.setFilter()` updated → line ~19245

### Data Schema (localStorage)
```json
[{
  "id": "1775748000000",
  "number": "153",
  "name": "Noi",
  "course": "Green Valley",
  "notes": "Great putter reader",
  "addedAt": "2026-04-09T15:30:00.000Z"
}]
```

---

## 4. Community Leaderboard — Last 4 Event Days
**Commit:** `5931bc8d`
**Cache version:** v318

### The Change
"Recent Best Rounds" section now shows the last 4 event days instead of just 2.

### What Was Changed
- Lookback window: 1 day → 14 days
- Query limit: 15 → 40 rounds
- Fallback lookback: 30 → 60 days
- Day groups trimmed to 4 with `.slice(0, 4)`

### Key Code Location
- Recent rounds query → line ~29764
- Day group slicing → line ~29793

---

## 5. Community Ticker — Flip Display
**Commits:** `09945827`
**Cache version:** v320

### The Bug
The scrolling ticker bar ("LEADERS" strip) was static on mobile — CSS `translateX` animation wasn't firing reliably.

### What Was Changed
- Replaced CSS scroll animation with JavaScript flip/fade display
- Shows one stat at a time, fades to next every 3 seconds via `setInterval`
- Cycles through: special shots → category leaders → total players → total rounds
- 0.4s CSS opacity transition for smooth fade
- Added community summary stats: total players, total rounds played

### Key Code Location
- Ticker content build → line ~29718
- Flip interval → `window._tickerInterval`
- CSS `.ticker-fade-out` class

---

## 6. View All Day Leaderboard (NEW FEATURE)
**Commits:** `087f8c4b`, `281d1a5e`, `a633fd31`, `df779811`, `552fc7c1`, `c555a65c`, `0dda1e7c`
**Cache versions:** v321–v327

### What It Is
Each day in "Recent Best Rounds" now has a "View All →" link that opens a full leaderboard modal showing ALL rounds for that day.

### Implementation Journey
1. Initial: inline `onclick` calling `CommunityLeaderboardView.showDayLeaderboard()` — didn't work (scope issue with `const`)
2. Changed to `window.CommunityLeaderboardView` — still didn't work on mobile
3. Tried `addEventListener` after DOM insertion — worked on desktop, not mobile
4. Tried separate Supabase query in modal — got 400 errors (duplicate column filters)
5. **Final solution:** Store rounds data in `window._recentRoundsByDay` during initial load, use inline `onclick` calling `window._viewAllDay()` global function, modal reads from stored data (no extra query)

### What Was Added
- `window._recentRoundsByDay` — stores rounds grouped by date during leaderboard load
- `window._viewAllDay(dateStr)` — global function callable from inline onclick
- `window.CommunityLeaderboardView.showDayLeaderboard(dateStr)` — builds and shows modal
- Modal UI: dark theme, full player list ranked by gross score, medals for top 3, clickable player names, course info, player count

### Key Code Locations
- Data storage: line ~29797 (`window._recentRoundsByDay[dayDate] = rounds`)
- View All button: inline `onclick` in day header HTML
- `_viewAllDay` + `CommunityLeaderboardView`: line ~33443
- Modal builder: `showDayLeaderboard()` method

### Key Lesson
**Inline `onclick` with global functions is the most reliable pattern for dynamically generated HTML on mobile.** `addEventListener` on dynamically created elements inside complex DOM hierarchies fails on some mobile browsers. `const` declarations inside `<script>` tags are block-scoped and invisible to inline handlers — use `window.X` instead.

---

## Version History This Session

| Version | Commit | Description |
|---------|--------|-------------|
| v314 | `4c11fe23` | Profile display preference fix + roleSpecific persistence |
| v315 | `6e9ea545` | Remove blocking alerts/confirms from profile save flow |
| v316 | `223da951` | My Caddies card shows upcoming event caddy bookings |
| v317 | `4275ea38` | Caddy Notebook feature + filter dropdown |
| v318 | `5931bc8d` | Community leaderboard shows last 4 event days |
| v319 | `3f6ce815` | Ticker scroll fix attempt (CSS animation) |
| v320 | `09945827` | Ticker changed to flip/fade display |
| v321 | `087f8c4b` | View All link added (initial, broken) |
| v322 | `281d1a5e` | View All anchor tag + URL encoding |
| v323 | `a633fd31` | CommunityLeaderboardView scope fix (const → window) |
| v324 | `df779811` | View All addEventListener approach |
| v325 | `552fc7c1` | Fix Supabase 400 errors (query + caddy tee_time) |
| v326 | `c555a65c` | View All uses pre-stored data (no extra query) |
| v327 | `0dda1e7c` | View All inline onclick with global function (mobile fix) |

---

## Files Changed
- `public/index.html` — All UI and JS changes
- `public/supabase-config.js` — Added `roleSpecific` to `profile_data` JSONB
