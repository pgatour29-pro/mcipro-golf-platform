# SESSION CATALOG — May 29, 2026

## Summary
Community rankings for ALL stats, proximity ranking fixes (race condition + Supabase row limit), course auto-select fix, proximity label UX, score entry bug. Multiple commits to fix proximity ranking that should have been caught on first pass.

---

## FUCKUPS

### FUCKUP #1: Proximity Ranking Not Showing (3 COMMITS TO FIX)
**Issue:** Avg Proximity to Pin showed the value (12.9ft) but no community ranking badge, while all other stats had rankings.
**Root Cause Chain:**
1. First attempt: Changed minimum players threshold from 2 to 1. Still didn't show.
2. Second attempt: Found race condition — `addCommunityRankings()` ran before `loadSeasonStats()` finished rendering the proximity value. `loadSeasonStats` then overwrote the ranking badge with `textContent`. Fixed with `.then()` chaining. Still didn't show.
3. Third attempt: Found the REAL issue — Supabase default 1000-row limit. The query fetched 500 rounds × 18 holes = 9000 rows but Supabase only returned 1000. Pete's recent rounds with proximity data weren't in those 1000 rows. Fixed by batching queries in chunks of 50 rounds.

**3 commits wasted:** `b4172c76` → `cc4a45f5` → `46ef6ef7`

**Lessons:**
1. **Supabase has a 1000-row default limit.** When querying round_holes across many rounds, ALWAYS batch in small chunks (50 rounds × 18 holes = 900 rows per batch, safely under the limit).
2. **Check async execution order.** If function A sets element text and function B appends to it, B MUST run after A completes. Use `.then()` or `await`.
3. **Fix the root cause first.** The threshold change (commit 1) was a guess. The race condition (commit 2) was partially right. The row limit (commit 3) was the actual problem. Should have investigated data flow before guessing.

### FUCKUP #2: Event-Day Ranking Missing Proximity/Approach/BB/GB
**Issue:** Event Day Ranking box showed Gross/FW/GIR/Putts/3-Putts/Bounce Back/Give Back but NOT Proximity or Approach.
**Root Cause:** Threshold was `proxPlayers.length > 1` — needed 2+ players with proximity data. Since proximity tracking is new, only 1 player had data.
**Fix:** Changed all event-day ranking thresholds from `> 1` to `>= 1`.
**Lesson:** Same threshold issue as community rankings. Should have fixed BOTH at the same time in the first pass. Pattern: when fixing a threshold in one place, grep for the same pattern in all ranking code.

### FUCKUP #3: Course Not Auto-Selecting When Event Selected
**Issue:** Selecting "TRGG - GREEN VALLEY FREE FOOD FRIDAY" event left course dropdown as "-- Select Course --".
**Root Cause:** Two issues:
1. `courseId` field was missing from `getAllPublicEvents()` event mapping (line ~63990). Only `courseName` was mapped.
2. Fuzzy course matching failed because event course_name was "GREEN VALLEY FREE FOOD FRIDAY". The word overlap score was 2/5 × 70 = 28, below the 40 threshold. "FREE", "FOOD", "FRIDAY" diluted the match.
**Fix:** Added `courseId` to event mapping. Added day-of-week names and event-type words (free, special, tournament, championship, classic, cup, etc.) to the strip function.
**Lesson:** When events have decorative text in course_name (day themes, special names), the fuzzy matcher needs to strip those words. Always check what actual course_name values look like in the DB before trusting fuzzy matching.

### FUCKUP #4: Score Entry Not Accepting (Hole 8+)
**Issue:** Starting from hole 8, first score entry on each hole was rejected. Required multiple taps before score would register.
**Root Cause:** `nextHole()`, `prevHole()`, `goToHole()`, and `goToLatestHole()` did NOT clear `currentScore` or `_inputLocked` state when switching holes. If `_inputLocked` was still true from the previous hole's save (150ms timeout hadn't expired), the first digit on the new hole was silently rejected. Also possible that stale `currentScore` digits accumulated across holes.
**Fix:** Added `this.currentScore = ''` and `this._inputLocked = false` to all four hole navigation methods.
**Lesson:** ANY function that changes `currentHole` must also reset input state (`currentScore`, `_inputLocked`). This is an invariant — hole change = clean input slate. Should have a single `resetInputState()` helper called from all navigation methods.

---

## NEW FEATURES

### Community Rankings on ALL Stats
- Round History page now ranks: Avg Score, Best Score, FW%, GIR%, Putts/Rnd, 3-Putts/Rnd, Avg Proximity, Bounce Back%, Give Back%
- Shows as "#rank/total" badge next to each stat value
- Shows #1/1 even when only one player has data (rankings start somewhere)
- Batched round_holes query in chunks of 50 to avoid Supabase 1000-row limit
- Rankings run AFTER loadSeasonStats completes (no race condition)

### Event-Day Rankings on ALL Stats
- Round detail card now shows: Gross, FW, GIR, Putts, 3-Putts, Proximity, Approach, Bounce Back, Give Back
- Queries include proximity and approach_proximity columns
- Shows rankings even with 1 player having data

### Putt Distance Tracking (Both Rows Always Visible)
- "1st Putt Distance" (blue) — always visible on every hole
- "2nd Putt Distance" (green) — always visible on every hole
- Previously approach row only showed on GIR holes
- Players can track both putt distances regardless of GIR status

---

## COMMITS

1. `59afd0bc` — Auto-create new player profiles for unmatched handicap paste names
2. `5ea73b5d` — Add community rankings to Round History and event-day rankings
3. `cb1ddbf6` — Rank ALL stats in community rankings and event-day rankings
4. `b4172c76` — Show community ranking even when only 1 player has data (#1/1)
5. `cc4a45f5` — Fix proximity ranking not showing (race condition with loadSeasonStats)
6. `46ef6ef7` — Fix proximity ranking: batch round_holes query and lower threshold
7. `4c8e3dae` — Show proximity/approach/BB/GB in event-day ranking even with 1 player
8. `f773136b` — Fix course auto-select: add courseId to event mapping + strip event words
9. `c4cff6dc` — Clarify proximity labels: 1st Putt Distance / 2nd Putt Distance on GIR
10. `647cd4f3` — Show both putt distance rows on every hole, not just GIR
11. `4b3a1780` — Fix score entry: clear currentScore and inputLock on hole navigation

---

## KEY RULES REINFORCED

1. **Supabase 1000-row limit** — ALWAYS batch round_holes queries in chunks of 50 rounds. 500 rounds × 18 holes = 9000 rows, but Supabase only returns 1000.
2. **Async execution order** — If function A renders and function B appends, chain them with `.then()` or `await`. Never fire-and-forget two async functions that depend on each other.
3. **Fix ALL instances at once** — When fixing a threshold/pattern in one ranking system, grep for the same pattern in all ranking code. Don't fix community rankings but miss event-day rankings.
4. **Hole navigation = reset input** — ANY function that changes `currentHole` MUST clear `currentScore` and `_inputLocked`. This is an invariant.
5. **Strip event-specific words in fuzzy matching** — Event course_name can contain day themes ("FREE FOOD FRIDAY"), tournament names, etc. The strip function must remove these for reliable matching.
6. **Check actual DB values** — Before trusting fuzzy matching, query the DB to see what values actually look like. "GREEN VALLEY FREE FOOD FRIDAY" ≠ "Green Valley".
7. **Don't guess — investigate data flow** — The proximity ranking took 3 commits because the first two were guesses. Should have traced the data flow end-to-end first.
