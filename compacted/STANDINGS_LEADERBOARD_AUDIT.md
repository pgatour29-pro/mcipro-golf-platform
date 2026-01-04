# Standings & Leaderboard System Audit

**Updated:** 2026-01-03
**Files Modified:** `public/index.html`, `public/time-windowed-leaderboards.js`

## Summary

Comprehensive audit and fix of the golfer standings and leaderboard system. Fixed dynamic year filtering, society-specific standings, and historical year access (2025 archiving).

## Issues Found & Fixed

### Issue 1: Year Filter Was Hardcoded (FIXED)
**Problem:** Year dropdown was hardcoded to 2025, 2024, 2023 only.
- When 2026 arrives, 2025 data would not be visible
- No way to view historical years

**Solution:** Dynamic year population from `event_results` table.

**Location:** `loadPlayerStandings()` - Lines 75937-75976

```javascript
// Get all unique years from event_results
const { data: yearData, error: yearError } = await window.SupabaseDB.client
    .from('event_results')
    .select('event_date')
    .order('event_date', { ascending: false });

if (!yearError && yearData && yearData.length > 0) {
    // Extract unique years
    const years = [...new Set(yearData.map(r => {
        const date = r.event_date;
        if (date) return date.substring(0, 4);
        return null;
    }).filter(Boolean))].sort((a, b) => b - a);

    // Ensure current year is included
    const currentYear = new Date().getFullYear().toString();
    if (!years.includes(currentYear)) {
        years.unshift(currentYear);
    }

    // Populate dropdown
    yearFilter.innerHTML = years.map(year =>
        `<option value="${year}">${year}</option>`
    ).join('');
}
```

### Issue 2: Society Filter Not Applied (FIXED)
**Problem:** Society filter dropdown existed but never filtered results.
- All events from all societies were shown regardless of selection

**Solution:** Filter events by society using `organizer_name` match.

**Location:** `loadPlayerStandings()` - Lines 76022-76065

```javascript
if (selectedSocietyId) {
    // Get society profile to find organizer_name
    const { data: societyProfile } = await window.SupabaseDB.client
        .from('society_profiles')
        .select('society_name')
        .eq('id', selectedSocietyId)
        .single();

    if (societyProfile?.society_name) {
        // Get event IDs for this society
        const { data: societyEvents } = await window.SupabaseDB.client
            .from('society_events')
            .select('id')
            .eq('organizer_name', societyProfile.society_name)
            .gte('event_date', yearStart)
            .lte('event_date', yearEnd);

        eventIdsForSociety = (societyEvents || []).map(e => e.id);
    }
}

// Apply society filter to query
if (eventIdsForSociety && eventIdsForSociety.length > 0) {
    query = query.in('event_id', eventIdsForSociety);
}
```

### Issue 3: No Society ID in event_results (FIXED)
**Problem:** When points were saved, no society info was stored.
- Made future society filtering require expensive joins

**Solution:** Added `organizer_id` and `organizer_name` to event_results.

**Locations:**
- `assignPoints()` - Line 85887-85888
- `publishResults()` - Line 85997-85998

```javascript
const resultsToSave = leaderboard.map(entry => ({
    event_id: this.currentEventId,
    // ... other fields ...
    organizer_id: event?.organizer_id || null,
    organizer_name: event?.organizer_name || null
}));
```

### Issue 4: No Year Selection in Time-Windowed Yearly (FIXED)
**Problem:** Time-windowed yearly leaderboard only showed current year.
- No way to view 2025 standings after January 1, 2026

**Solution:** Added year dropdown that shows/hides when yearly tab is selected.

**Locations:**
- HTML: Line 28858-28860 (`leaderboardYearSelect` dropdown)
- JS: `time-windowed-leaderboards.js` lines 17-18, 31-32, 39-98, 248-252, 854-861

```javascript
// Constructor - added selectedYear tracking
this.selectedYear = new Date().getFullYear();
this.availableYears = [];

// populateYearDropdown() - dynamically populates from event_results
// setYear() - handles year changes
// showPeriod() - shows/hides dropdown when yearly tab selected
// getStandings() - uses this.selectedYear for yearly period
```

## Files Modified

### public/index.html

| Line(s) | Change |
|---------|--------|
| 28723-28725 | Removed hardcoded year options, replaced with dynamic comment |
| 75937-75976 | Added dynamic year population in `loadPlayerStandings()` |
| 76012 | Changed society filter value from `society_name` to `id` |
| 76022-76065 | Added society filtering logic |
| 85887-85888 | Added `organizer_id`, `organizer_name` to resultsToSave (assignPoints) |
| 85997-85998 | Added `organizer_id`, `organizer_name` to resultsToSave (publishResults) |
| 28858-28860 | Added `leaderboardYearSelect` dropdown |

### public/time-windowed-leaderboards.js

| Line(s) | Change |
|---------|--------|
| 17-18 | Added `selectedYear` and `availableYears` properties |
| 31-32 | Call `populateYearDropdown()` in init |
| 35-99 | Added year selection section with `populateYearDropdown()` and `setYear()` |
| 248-252 | Modified yearly case to use `this.selectedYear` |
| 854-861 | Show/hide year dropdown in `showPeriod()`, store `currentPeriod` |

## Points Calculation Audit (Verified)

Points are correctly calculated using the following logic:

```javascript
// In loadPlayerStandings() - Lines 76080-76102
results.forEach(result => {
    const pid = result.player_id;
    if (!playerStats[pid]) {
        playerStats[pid] = {
            player_id: pid,
            player_name: result.player_name || pid,
            total_points: 0,
            events_played: 0,
            wins: 0,
            top_3: 0,
            best_finish: 999
        };
    }
    const stats = playerStats[pid];
    stats.total_points += (result.points_earned || 0);
    stats.events_played += 1;
    if (result.position === 1) stats.wins += 1;
    if (result.position <= 3) stats.top_3 += 1;
    if (result.position < stats.best_finish) stats.best_finish = result.position;
});
```

**Sorting (Primary to Tertiary):**
1. Total points (highest first)
2. Wins (most wins first)
3. Best finish (lowest position number)

## Default Point Allocation

When points are assigned without custom allocation:

| Position | Points |
|----------|--------|
| 1st | 10 |
| 2nd | 9 |
| 3rd | 8 |
| 4th | 7 |
| 5th | 6 |
| 6th | 5 |
| 7th | 4 |
| 8th | 3 |
| 9th | 2 |
| 10th | 1 |
| 11th+ | 0 |

## User Flow

### My Season Standings
1. User navigates to Events > Standings tab
2. Year dropdown populated dynamically from `event_results`
3. Society dropdown populated from user's society memberships
4. User can filter by year AND/OR society
5. Stats cards show: Rank, Total Points, Events Played, Wins

### Time-Windowed Leaderboards
1. User navigates to Events > Leaderboards tab
2. Clicks Today/This Week/This Month/Year buttons
3. When "Year" is clicked, year dropdown appears
4. User can select any year with recorded events (e.g., 2025)
5. Leaderboard updates to show that year's standings

## Database Schema Notes

### event_results table fields:
- `event_id` - UUID of the event
- `round_id` - Optional round ID
- `player_id` - Player's LINE user ID
- `player_name` - Display name
- `division` - Optional division
- `position` - Finishing position
- `score` - Score value
- `score_type` - 'stableford', 'stroke', etc.
- `points_earned` - Championship points earned
- `status` - 'completed'
- `is_counted` - Boolean
- `event_date` - Date string (YYYY-MM-DD)
- `organizer_id` - NEW: Society organizer ID
- `organizer_name` - NEW: Society name

## Testing Recommendations

1. **Test Year Selection:**
   - Navigate to My Standings
   - Verify year dropdown shows all years with events
   - Select 2025 (or previous year)
   - Verify standings update correctly

2. **Test Society Filter:**
   - Select a specific society from dropdown
   - Verify only that society's events are counted
   - Check that stats reflect filtered data

3. **Test Time-Windowed Yearly:**
   - Click "Year" button in leaderboards
   - Verify year dropdown appears
   - Select different year
   - Verify leaderboard shows that year's data

4. **Test New Event Points:**
   - Create and complete a new event
   - Assign points via Organizer Scoring
   - Verify `organizer_id` and `organizer_name` are saved
