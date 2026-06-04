# SESSION CATALOG — May 26, 2026

## Summary
Continued fixes from May 24-25 session. Mobile scroll issue finally resolved. New proximity stat feature added. Several database corrections. Community leaderboard improvements. TRGG Player of the Year feature built with all 845 players seeded. Fixed FAB buttons blocking keypad. Added POY admin update tool.

---

## FIXES APPLIED

### 1. Mobile Scroll — FINALLY FIXED
**Issue:** Scorecard page started scrolled down on mobile, showing GROUP section instead of hole info strip.
**Root Cause:** `round-active` CSS class (which changes margins, hides elements) was applied AFTER `window.scrollTo(0,0)`. Mobile layout shift overrode the scroll.
**Fix:** Moved `golferDash.classList.add('round-active')` BEFORE the scroll call. Added final scroll reset at end of startRound with RAF and timeouts.
**Key Lesson:** ALWAYS apply CSS layout changes BEFORE scroll calls on mobile.

### 2. teamHcp ReferenceError Fixed
**Issue:** `calculateScrambleHcp()` threw `ReferenceError: teamHcp is not defined` on every scorecard init.
**Root Cause:** `teamHcp` defined inside `else` block but referenced in `console.log` outside it.
**Fix:** Wrapped log in `if (typeof teamHcp !== 'undefined')`.

### 3. Live Leaderboard Showing Previous Day's Scores
**Issue:** Live leaderboard showed yesterday's scores mixed with today's.
**Root Cause:** Queried scorecards by `event_id` without date filter.
**Fix:** Added `gte('created_at', today)` filter.

### 4. Incomplete Round in Avg Score Leaderboard
**Issue:** Jason Kang's 13-hole 56-stroke round appeared as #1 in Lowest Round and Avg Score.
**Root Cause:** Filter was `total_gross >= 55`, no `holes` column exists in rounds table.
**Fix:** Raised minimum to `>= 60`. Deleted the specific incomplete round from DB.

### 5. Khao Kheow Event Linked to Wrong Society
**Issue:** Khao Kheow May 24 round showing under TRGG instead of JOA.
**Root Cause:** Round's `society_event_id` pointed to TRGG event.
**Fix:** Created proper JOA event for Khao Kheow and relinked the round.

### 6. Pete's Scorecard Wrong Handicap
**Issue:** May 24 scorecard showed HCP 1.1 (JOA) instead of 0.3 (TRGG).
**Root Cause:** Event was linked to JOA when round was played.
**Fix:** Updated scorecard handicap to 0.3, playing_handicap to 0, recalculated all net scores and stableford points.

### 7. Stats Row Spacing
**Issue:** FW BKR / GS BKR labels overlapping with Putts label.
**Fix:** Changed from `gap-4 justify-center` to `justify-evenly` for equal spacing.

### 8. Stats Buttons Color
**Issue:** Proximity buttons were purple.
**Fix:** Changed to green (#22c55e) to match app theme.
**Rule:** NO PURPLE anywhere in the system. This is a global directive.

---

## NEW FEATURES

### Proximity to Hole Stat
**What:** New stat tracking distance from the pin when on the green.
**UI:** Three buttons (10, 20, 30+) representing feet from the flag/cup.
- Tap to select, tap same again to deselect
- Green highlight when active
- Located on second row below main stats (FW, GIR, Putts, FW BKR, GS BKR)
- Larger buttons (40x32px) with "Proximity ft" label

**Database:**
- Added `proximity INTEGER` column to `scores` and `round_holes` tables
- Values: 10, 20, or 30 (representing 10ft, 20ft, 30+ ft)

**Make Percentage Stats:**
- "Made" = 1-putt from that distance
- Per-round scorecard view shows: 10ft Make %, 20ft Make %, 30+ft Make %
- Community Leaderboard adds: Make % 10ft, Make % 20ft, Make % 30+ft categories
- Minimum 3 attempts to qualify for leaderboard

**Save Flow:** Proximity value saved alongside other stats (fairway_hit, gir, putts, bunkers) in the score upsert during round completion.

---

## UI CHANGES

### Keypad Buttons Thinned
- min-height: 52px → 42px
- padding: 10px → 6px
- Saves vertical screen space to accommodate the new proximity row

### Stats Layout — Two Rows
- Row 1: FW, GIR, − 2 + Putts, FW BKR, GS BKR
- Row 2: Proximity ft — 10 | 20 | 30+ (centered, separated by divider line)

### Tab Animation Disabled During Active Round
- `.tab-content.active` animation set to `none` during `round-active`
- Prevents potential layout interference on mobile

---

## DATABASE CHANGES

| Table | Column | Type | Description |
|-------|--------|------|-------------|
| scores | proximity | INTEGER | Distance from pin: 10, 20, or 30 |
| round_holes | proximity | INTEGER | Distance from pin: 10, 20, or 30 |
| rounds | (deleted row) | - | Removed Jason Kang's incomplete 13-hole round (56 gross) |
| society_events | (new row) | - | Created JOA event for Khao Kheow May 24 |
| scorecards | handicap | - | Updated Pete's May 24 scorecard from 1.1 to 0.3 |
| scores | net_score, stableford_points | - | Recalculated for Pete's May 24 scorecard with HCP 0 |
| trgg_players | (new table) | - | 655 TRGG players with display_name, handicaps |
| trgg_rounds | (new table) | - | 4,319 stableford rounds for POY ranking |
| trgg_poy_cache | (new table) | - | Pre-computed POY rankings (faster than view) |
| trgg_player_of_year_view | (new view) | - | Computes best 20 rounds per player, ranks by total pts |

---

## NEW FEATURE: TRGG Player of the Year

### Overview
Full Player of the Year leaderboard system at `/poy.html`. Rankings based on best 20 stableford rounds per player. Data sourced from masterscoreboard.co.uk.

### Database Schema
- **trgg_players**: 655 players with display_name, first/last name, handicaps
- **trgg_rounds**: 4,319 individual stableford round scores linked to players
- **trgg_player_of_year_view**: SQL view using window functions (ROW_NUMBER, RANK) to compute top-20 rounds per player
- **trgg_poy_cache**: Pre-computed cache table for fast reads (view was too slow for page load)

### Page Features (`/poy.html`)
- Top 3 podium with gold/silver/bronze cards
- Stats summary (total players, rounds, top 20 average)
- Searchable leaderboard with all 655 players
- Tap any player to expand and see individual scores color-coded:
  - Green: 36+ pts (above average)
  - Blue: 30-35 pts (average)
  - Red: <30 pts (below average)
- Best/worst/avg score per player
- Dark theme matching the main app
- Back button to return to app

### Navigation
- Desktop: Trophy "POY" button in Society Events subtab bar
- Mobile: "Player of the Year" option in Society Events dropdown menu
- Both open /poy.html in a new tab

### Fuckups During Build
1. **Missing Supabase JS library**: poy.html loaded supabase-config.js but not the actual `@supabase/supabase-js` library from CDN. SupabaseDB.client was never initialized. Page showed "Loading..." forever.
2. **No RLS policies**: Tables created without read policies. Supabase blocked all anonymous reads. Had to add `FOR SELECT USING (true)` policies.
3. **Slow view query**: The SQL view with window functions across 4,319 rounds was too slow for page load. Created trgg_poy_cache table with pre-computed results.

### Key Lesson
When creating standalone HTML pages that use Supabase:
1. Include the Supabase JS library CDN script BEFORE supabase-config.js
2. Add RLS read policies on new tables
3. Use cache tables for complex views with large datasets

### Commits
- `9868e7d4` — Initial POY page + seed data (655 players, 4,319 rounds)
- `8a130f6e` — Add POY link to Society Events nav (desktop + mobile)
- `3b1e5630` — Switch from view to cache table for speed
- `5e758b61` — Fix: add missing Supabase JS library script

---

## COMMITS (chronological)

1. `73efe706` — Delete incomplete round + raise min gross to 60
2. `ed429035` — Disable slideUp animation during active round
3. `345cef07` — requestAnimationFrame scroll fix (didn't work alone)
4. `2ebc6e9a` — **THE FIX**: Apply round-active BEFORE scroll + final reset
5. `4aff5568` — Stats row justify-evenly spacing
6. `d977908a` — Add Proximity to Hole stat (10/20/30+)
7. `b1ba2220` — Proximity make % in round view + community leaderboard
8. `954f4d91` — Stack proximity under putts (reverted next commit)
9. `5a7ba9c5` — Two-row stats: main stats top, proximity centered bottom
10. `6d93d236` — Larger proximity buttons + thinner keypad
11. `35a79547` — Hide fixed FAB buttons during active round (unblock keypad)
12. `9868e7d4` — TRGG Player of the Year page + 655 players seeded
13. `8a130f6e` — POY link in Society Events nav (desktop + mobile)
14. `3b1e5630` — Switch POY from view to cache table for speed
15. `5e758b61` — Fix: add missing Supabase JS library to poy.html
16. `bf1c52df` — POY admin update button (Pete-only)
17. `seed_trgg_poy_missing.sql` — Added remaining 190 players (pos 656-841)

---

## ADDITIONAL FIXES

### FAB Buttons Blocking Keypad
**Issue:** Backspace and checkmark buttons on keypad bottom row did "absolutely nothing" on mobile.
**Root Cause:** Fixed-position FAB buttons (dashboardBackBtn z-index:9999, scrollToTopBtn) were overlapping the keypad's bottom row, intercepting all touch events.
**Fix:** Hide FABs during active round via `body.round-active-mode` CSS class. Removed on round end.
**Lesson:** Fixed-position buttons with high z-index can silently block touch events on elements beneath them. Always check for z-index conflicts when UI elements don't respond to taps.

### POY Missing Players
**Issue:** Seed file only had 655 of 841 players (cut off at position 638).
**Fix:** Parsed Pete's full masterscoreboard paste and inserted remaining 190 players (positions 656-841, scores 28 down to 4).
**Lesson:** Always verify data completeness against the source. Don't assume a seed file is complete.

### POY Page Not Loading (3 issues)
1. **Missing Supabase JS library**: poy.html had `<script src="supabase-config.js">` but not the actual Supabase client library CDN. Fix: Added `@supabase/supabase-js` CDN script before config.
2. **No RLS policies**: New tables blocked all reads. Fix: Added `FOR SELECT USING (true)` policies.
3. **Slow view**: Complex SQL view with window functions on 4,319 rounds. Fix: Created `trgg_poy_cache` table + `refresh_trgg_poy_cache()` function.

---

## KEY RULES REINFORCED

1. **LAYOUT BEFORE SCROLL** — Apply CSS class changes before scrollTo calls (mobile critical)
2. **NO PURPLE** — Global directive, use green (#22c55e) for highlights
3. **FILTER LIVE DATA BY DATE** — Always add today's date filter for live views
4. **MIN 60 GROSS** — Use >= 60 to exclude incomplete rounds (no `holes` column in rounds table)
5. **CHECK BOTH SOCIETY TABLES** — `societies` vs `society_profiles` have different IDs
