# Session Catalog: 2026-02-08 — Society Handicap Auto-Detect Fix

## Summary
User reported that the live scoring system wasn't automatically detecting the correct society handicap when a society event was selected. Investigation revealed FIVE separate bugs preventing auto-detection, plus a critical infrastructure bug where Vercel was caching `sw.js` for 30 days. Also found and fixed a race condition where `onSocietyChanged()` ran before the player was added to `this.players`, causing the society dropdown to update but the player handicap to stay on universal. Then found that manual handicap changes didn't propagate to scoring engines (match play used stale handicap). Found a wrong course ID mapping that broke Start Round for Pattaya CC entirely. Found that inline handicap allocation copies didn't round decimal handicaps, causing wrong shot counts for 3/4 players. Consolidated all inline copies to use the single `allocHandicapShots()` source of truth. Then user reported buddies list not showing on mobile — fixed the wrong thing first (z-index), then found formatHandicapDisplay crash, then force-reload logic, but the REAL issue was a stale cache-buster `?v=20260107` on the script tag meaning mobile was serving a month-old JS file. Deployed 4 times for what should have been 1. Total of 19 commits / 15 deploys across this multi-session span (should have been 5-6 max). 10 fuckups, 15 bug fixes, 17 lessons.

---

## FUCKUPS BY CLAUDE

### Fuckup 1: Deployed 7 Times Instead of Batching
**Severity:** HIGH — User frustration, CLAUDE.md says batch into ONE deploy
**What Happened:** Made 8 separate commits across 7 deploys:
1. `ba4c4031` — onchange handler + init order + organizer_id in query
2. `088cd0da` — Guest name matching fix
3. `4c480ee9` — Name matching fallback for NULL organizer_id
4. `cee06896` — SW v268 bump (realized user was stuck on v267)
5. `7da1f5a3` — Vercel headers fix (sw.js was cached 30 days)
6. `f678121b` — society_id + normalized name matching
7. `b7719a5a` — Init order race condition (autoAddCurrentUser before loadEvents)

Commits 1-4 should have been ONE deploy. Commits 6-7 should have been ONE deploy.
**Lesson:** DIAGNOSE COMPLETELY before making ANY changes. Check ALL data paths, init order, timing, and data values before deploying.

### Fuckup 2: Didn't Check Vercel Response Headers Until Deploy 5
**Severity:** CRITICAL — Root cause of ALL update failures across BOTH sessions today
**What Happened:** The `vercel.json` had conflicting Cache-Control headers for `sw.js`:
- Rule at line 8: `/sw.js` → `no-cache, no-store, must-revalidate` (correct)
- Rule at line 39: `/(.*).js` → `public, max-age=2592000` (30 day cache)

Vercel applies the LAST matching rule, so the wildcard won. `sw.js` was cached for 30 days on Vercel's CDN. Every deploy was invisible because the CDN served the old cached `sw.js`.

This was the root cause of ALL update problems across BOTH sessions today (the previous session deployed 8 times and the user never got the new code). Should have checked the actual HTTP response headers on the FIRST deploy failure.
**Lesson:** When fixes aren't reaching the user, check the ACTUAL HTTP response headers with `curl -I` or PowerShell `Invoke-WebRequest`. Don't just look at the config file — verify what the server is actually sending.

### Fuckup 3: Assumed Name Matching Would Work Without Checking Actual Data
**Severity:** MEDIUM — Required an extra deploy
**What Happened:** Added name matching fallback (commit `4c480ee9`) comparing `selectedEvent.societyName` against `society_profiles.society_name`. Assumed they'd be similar strings. They weren't:
- Event `societyName`: "TRGG Pattaya" (abbreviated)
- Society `society_name`: "Travellers Rest Golf Group" (full name)

These are completely different strings — no substring match possible. Should have queried the actual database values BEFORE writing the matching code.
**Lesson:** ALWAYS check the actual data values before writing matching logic. `SELECT DISTINCT organizer_name FROM society_events` would have revealed this immediately.

### Fuckup 4: Didn't Check the Event Object Schema
**Severity:** LOW — Part of initial investigation failure
**What Happened:** The `getAllPublicEvents()` function maps raw DB fields to event objects. The raw event has `society_id` (which IS set for some TRGG events), but this field was NOT included in the mapped object. Should have read the full mapping at line 49612 before writing matching code.
**Lesson:** Read the full data transformation pipeline before writing code that depends on the transformed data.

### Fuckup 5: Didn't Check Init Order / Timing Before First Deploy
**Severity:** HIGH — Required yet another deploy
**What Happened:** After getting the society matching working, the society dropdown updated correctly but the player's handicap stayed on universal. The init order was:
1. `loadSocietyOptions()` → societies loaded
2. `loadEvents()` → auto-selects today's event → fires `onSocietyChanged()` → loops `this.players` → **EMPTY ARRAY**
3. course picker setup...
4. `autoAddCurrentUser()` → adds player with **universal HCP** (too late!)

Should have traced the FULL flow during initial investigation: event auto-select → onSocietyChanged → player loop → when are players added? This would have been caught immediately.
**Lesson:** TRACE THE FULL EXECUTION PATH including init order and timing. Don't just check "does the matching work?" — check "does the result actually reach the UI?"

### Fuckup 6: Wrong Course ID Mapping Broke Start Round for Pattaya CC
**Severity:** CRITICAL — User could not start a round at all
**What Happened:** The `COURSE_ID_MAP` in `loadCourseData()` (line 54929) had an incorrect entry:
```javascript
'pattaya_county': 'pattaya_country_club'
```
The database stores holes under `course_id = 'pattaya_county'`, NOT `'pattaya_country_club'`. This mapping caused `loadCourseData` to query for a course_id that doesn't exist, returning zero holes, which made `startRound()` bail out with "No hole data found for this course/tee."

The user clicked Start Round, saw the loading flash, and ended up back on the setup page. User thought Claude broke startRound with the handicap propagation fix — but this was a pre-existing wrong mapping. Claude should have checked `COURSE_ID_MAP` entries against actual database `course_id` values when first working on course-related code.

**When Did This Break?** Unknown — the mapping may have been wrong since it was added. The user may not have played Pattaya CC via the live scorecard recently enough to notice. It was NOT caused by the v271 handicap propagation fix, but appeared to the user as if it was because v271 was the most recent deploy.

**Lesson:** When investigating a "broken" feature, CHECK THE CONSOLE OUTPUT FIRST. The error `[LiveScorecard] ❌ NO HOLES FOUND for course: pattaya_county` was clearly visible in the console. Instead of reading 500 lines of startRound code looking for syntax errors, should have asked the user for console output immediately. Also: NEVER add ID mappings without verifying them against `SELECT DISTINCT course_id FROM course_holes`.

### Fuckup 7: Duplicated Handicap Allocation Logic in 7+ Places
**Severity:** CRITICAL — Root cause of recurring scoring bugs (Bug Fix 11)
**What Happened:** The correct handicap allocation function `allocHandicapShots()` existed since early development, but inline copies of the same logic were scattered across `calculateTeamMatchPlay` (2 copies) and `calculateHolesStatus` (2 copies), plus other scoring functions. Each inline copy had its own implementation of handicap-to-shots math, and some copies used `Math.abs(hcpValue)` (raw decimal) instead of `Math.round(Math.abs(hcpValue))`, causing wrong shot counts for any non-integer handicap. This is why scoring bugs kept reappearing — fixing one copy left the other broken copies untouched.

**Impact:** For today's round (2026-02-11), Perry (HCP 0.9) got 0 shots instead of 1, Alan (HCP 8.5) got 8 instead of 9, Richard (HCP 10.8) got 10 instead of 11. Wrong stableford points AND wrong match play results.

**Lesson:** NEVER copy-paste logic that already has a canonical function. Any time a calculation is needed in multiple places, call the ONE source of truth function instead of reimplementing it inline.

### Fuckup 8: Fixed the WRONG Problem — Z-Index Instead of Data Loading
**Severity:** HIGH — Wasted a deploy, user had to correct Claude
**What Happened:** User reported "buddies list does not show up in the mobile version." Claude assumed it was a CSS/visibility issue and deployed a z-index fix (replacing Tailwind arbitrary `z-[99999]` with inline styles) plus mobile button layout fixes. User immediately corrected: "no. in the buddies modal, buddies tab does not show anything, only thing that shows up is in the suggestions, groups and add tabs." The modal was OPENING fine — the issue was the tab CONTENT being blank. Claude didn't ask clarifying questions or investigate the actual rendering code before deploying.
**Lesson:** LISTEN TO THE USER and ASK CLARIFYING QUESTIONS before assuming the problem. "Does not show up" could mean many things. Should have asked: "Does the modal open? Can you see the tabs? What do you see when you click the Buddies tab?" Also: investigate the rendering path (data loading → template → DOM insertion) before assuming CSS.

### Fuckup 9: Deployed 4 Times for Buddies Fix Instead of Batching
**Severity:** HIGH — CLAUDE.md explicitly says batch into ONE deploy
**What Happened:** Made 4 separate deploys for the buddies fix:
1. `bf0f6a92` v275 — z-index + button layout (WRONG FIX)
2. `fa7c131d` v276 — formatHandicapDisplay safe fallback + try-catch (correct fix, but didn't reach mobile)
3. `d0941a53` v277 — force-reload data + max-h-[90vh] inline style (still didn't reach mobile)
4. `bf411fd1` v278 — Updated cache-buster ?v=20260208 (THE ACTUAL FIX)

Deploy 1 was the wrong fix. Deploys 2-3 were correct code changes but useless because the cache-buster wasn't updated. Deploy 4 was what actually fixed it. Should have been 1 deploy with all fixes + cache-buster update.
**Lesson:** Before deploying ANY fix to an external JS file, CHECK THE SCRIPT TAG'S CACHE-BUSTER PARAMETER. If `?v=` hasn't been updated, the browser will serve the old cached version regardless of how many times you deploy.

### Fuckup 10: Didn't Check Cache-Buster Until Deploy 4
**Severity:** CRITICAL — The ONLY reason mobile wasn't getting updates
**What Happened:** The `<script src="golf-buddies-system.js?v=20260107">` tag had a cache-buster from January 7th. Combined with Vercel's `Cache-Control: public, max-age=2592000` (30 days) for JS files, the mobile browser was serving the month-old version. Three entire deploys (v276, v277) were completely invisible to the mobile user because the URL hadn't changed. This is the EXACT SAME CLASS OF BUG as Fuckup 2 (sw.js cached by Vercel CDN) — browser caching preventing code updates from reaching the user — and Claude made the same mistake again.
**Lesson:** When code changes aren't reaching a specific platform (mobile but not desktop), the FIRST thing to check is: is the browser serving a cached old version? Check: (1) the `?v=` cache-buster on the script tag, (2) the HTTP Cache-Control headers, (3) the service worker cache strategy. This was lesson 3 from Fuckup 2, and Claude failed to apply it.

### Fuckup 11: Told the User to Deploy When Network Was Down
**Severity:** MEDIUM — User frustration
**What Happened:** When DNS resolution failed for github.com and api.vercel.com, Claude told the user "Once your network is back, run: `git push origin master && vercel --prod --yes`." The CLAUDE.md explicitly states deployment is Claude's job: "ALWAYS DEPLOY AFTER CHANGES." Claude should have kept retrying silently instead of punting the task to the user.
**Lesson:** NEVER tell the user to do deployment tasks. That's Claude's job per CLAUDE.md. If network is down, keep retrying or wait — don't dump it on the user.

---

## Bug Fix 1: No onchange Handler on Event Dropdown

**Type:** Missing wiring
**Status:** Completed
**Root Cause:** The event dropdown (`scorecardEventSelect`) at line 31929 had NO `onchange` handler. Selecting an event did nothing to trigger society auto-detection.

### Fix Applied
```html
<!-- Before -->
<select id="scorecardEventSelect" class="w-full rounded-lg border px-3 py-2">

<!-- After -->
<select id="scorecardEventSelect" class="w-full rounded-lg border px-3 py-2" onchange="LiveScorecardManager.onEventChanged()">
```

### New Method: onEventChanged() (line ~52722)
Created new method that:
1. Gets selected event from `this.loadedEvents`
2. Tries to match event to a society profile (4 strategies — see Bug Fix 5)
3. Sets the society dropdown to the matched society
4. Calls `onSocietyChanged()` to update player handicaps

### Commit
`ba4c4031`

### File Modified
`public/index.html` — line 31929 (dropdown), line ~52722 (new method)

---

## Bug Fix 2: Missing organizer_id in Society Profiles Query

**Type:** Incomplete data fetch
**Status:** Completed
**Root Cause:** `loadSocietyOptions()` at line 52469 only fetched `id, society_name` — missing `organizer_id` needed for event-to-society matching.

### Fix Applied
```javascript
// Before
.select('id, society_name')

// After
.select('id, society_name, organizer_id')
```

### Commit
`ba4c4031`

### File Modified
`public/index.html` — line 52471

---

## Bug Fix 3: Wrong Init Order — Events Loaded Before Societies

**Type:** Race condition
**Status:** Completed (then superseded by Bug Fix 8)
**Root Cause:** `loadEvents()` ran BEFORE `loadSocietyOptions()` in init. When events auto-selected, `societyProfilesCache` was null.

### Fix Applied
Swapped order at line ~54154:
```javascript
// Before: loadEvents() first, then loadSocietyOptions()
// After: loadSocietyOptions() first, then loadEvents()
await this.loadSocietyOptions();
await this.loadEvents();
```

### Commit
`ba4c4031`

### File Modified
`public/index.html` — lines ~54154-54167

---

## Bug Fix 4: Guest Name Matching — Empty Names Match Everything

**Type:** Logic bug
**Status:** Completed
**Root Cause:** In `getPlayerSocietyHandicaps()` at line ~52545, name matching used:
```javascript
searchName.includes(memberName.toLowerCase())
```
When `memberName` was empty string `""`, `"pete park".includes("")` → `true` in JavaScript. Every empty-name guest member (1000+ TRGG-GUEST entries) matched every player search.

### Fix Applied
```javascript
// Before
const memberName = m.member_data?.name || m.name || '';
if (memberName.toLowerCase().includes(searchName) || searchName.includes(memberName.toLowerCase())) {

// After
const memberName = (m.member_data?.name || m.name || '').trim();
if (memberName.length >= 2 && (memberName.toLowerCase().includes(searchName) || searchName.includes(memberName.toLowerCase()))) {
```

### Commit
`088cd0da`

### File Modified
`public/index.html` — line ~52545

---

## Bug Fix 5: Society Auto-Detect — Data Type Mismatch + NULL organizer_id

**Type:** Data mismatch
**Status:** Completed (required 2 iterations)
**Root Cause:** THREE data problems prevented event-to-society matching:

| Field | society_events (TRGG) | society_profiles (TRGG) |
|-------|----------------------|------------------------|
| `organizer_id` | NULL (UUID type) | "trgg-pattaya" (TEXT type) |
| `society_id` | NULL or "7c0e4b72..." | N/A (this IS the profile UUID) |
| `organizer_name` | "TRGG Pattaya" or "Travellers Rest Golf Group" | N/A |
| `society_name` | N/A | "Travellers Rest Golf Group" |

- `organizer_id` match fails: event has NULL
- Name match fails: "TRGG Pattaya" ≠ "Travellers Rest Golf Group"
- `society_id` match not attempted: field wasn't in mapped event object

### Fix Applied — Final Version (4-Layer Matching)

Added `societyId` to event mapping in `getAllPublicEvents()`:
```javascript
societyId: e.society_id || null,
```

Rewrote matching in `onEventChanged()` with 4 strategies:
```javascript
// 1. Match by society_id UUID (most reliable when set)
if (selectedEvent.societyId) {
    matchingSociety = this.societyProfilesCache.find(s => s.id === selectedEvent.societyId);
}
// 2. Match by organizer_id
if (!matchingSociety && selectedEvent.organizerId) {
    matchingSociety = this.societyProfilesCache.find(s => s.organizer_id === selectedEvent.organizerId);
}
// 3. Match by society/organizer name string comparison
if (!matchingSociety && selectedEvent.societyName) {
    const eventSocName = selectedEvent.societyName.toLowerCase();
    matchingSociety = this.societyProfilesCache.find(s =>
        s.society_name.toLowerCase() === eventSocName ||
        eventSocName.includes(s.society_name.toLowerCase()) ||
        s.society_name.toLowerCase().includes(eventSocName)
    );
}
// 4. Normalize organizer name → match against organizer_id
// "TRGG Pattaya" → "trgg-pattaya" matches organizer_id "trgg-pattaya"
if (!matchingSociety && selectedEvent.organizerName) {
    const normalized = selectedEvent.organizerName.toLowerCase().replace(/\s+/g, '-');
    matchingSociety = this.societyProfilesCache.find(s =>
        s.organizer_id && s.organizer_id.toLowerCase() === normalized
    );
}
```

### Which Strategy Matches Each Society

| Society | Event organizer_name | Matching Strategy |
|---------|---------------------|-------------------|
| TRGG (with society_id set) | "Travellers Rest Golf Group" | Strategy 1 (UUID) |
| TRGG (no society_id, full name) | "Travellers Rest Golf Group" | Strategy 3 (name match) |
| TRGG (no society_id, abbreviated) | "TRGG Pattaya" | Strategy 4 (normalized: "trgg-pattaya") |
| JOA | "JOA Golf Pattaya" | Strategy 3 (exact name match) |

### Commits
- `4c480ee9` — First attempt (name matching only — failed for "TRGG Pattaya")
- `f678121b` — Final fix (4-layer matching with society_id + normalized name)

### Files Modified
- `public/index.html` — line 49638 (event mapping), lines 52741-52767 (onEventChanged)

---

## Bug Fix 6: Service Worker Cached for 30 Days by Vercel CDN

**Type:** Critical infrastructure bug
**Status:** Completed
**Root Cause:** In `vercel.json`, the `/sw.js` no-cache header rule came BEFORE the `/(.*).js` wildcard 30-day cache rule. When both rules match the same path, Vercel applies the LAST matching Cache-Control value. The wildcard won:

```
Actual HTTP response for sw.js:
Cache-Control: public, max-age=2592000  ← 30 DAYS!
X-Vercel-Cache: HIT                    ← Served from CDN cache
Age: 482                               ← Cached for 8 minutes+
```

This meant:
- Every deploy was invisible — CDN kept serving old sw.js
- User was stuck on SW v267 despite 4+ deploys to v268
- ALL code fixes from both sessions today were invisible
- The same problem existed in the previous session (8 deploys, none visible)

### Fix Applied
Moved `/sw.js` and `/sw-register.js` header rules to END of the headers array, AFTER the `/(.*).js` wildcard:

```json
// Before: sw.js rule at position 1, wildcard at position 6
// After: wildcard at position 4, sw.js rule at position 11 (last)
```

### Verified Fix
```
After deploy:
Cache-Control: no-cache, no-store, must-revalidate  ← CORRECT
Age: 0                                               ← FRESH
```

### Commit
`7da1f5a3`

### File Modified
`vercel.json` — reordered headers array

---

## Bug Fix 7: SW Version Bumps (v267 → v268 → v269 → v270)

**Type:** Cache invalidation
**Status:** Completed

- `cee06896` — v267 → v268 (didn't reach user due to CDN caching)
- `f678121b` — v268 → v269 (included in society matching fix)
- `b7719a5a` — v269 → v270 (included in init order fix)

### File Modified
`public/sw.js` — line 4

---

## Bug Fix 8: Init Order Race Condition — Player Added After Society Auto-Select

**Type:** Race condition / init order bug
**Status:** Completed
**Root Cause:** The init order in `LiveScorecardManager.init()` was:
1. `loadSocietyOptions()` — loads society profiles ✓
2. `loadEvents()` — auto-selects today's event → fires `onEventChanged()` → matches TRGG → calls `onSocietyChanged()` → loops through `this.players` → **EMPTY ARRAY** (no players yet!)
3. course picker setup, tee markers...
4. `autoAddCurrentUser()` — adds player with **universal handicap** (too late!)

When `onSocietyChanged()` ran at step 2, `this.players` was empty. The `for (const player of this.players)` loop body never executed. The player was then added at step 4 with their universal handicap from localStorage.

This is why the user saw the society dropdown correctly set to TRGG (HCP 1.4) but the player card still showed universal (HCP 2.5). The dropdown was updated at step 2, but the player handicap was never touched because the player didn't exist yet.

### Why "50% of the Time" Behavior
- **Auto-selected during init** → FAILS: players array empty when `onSocietyChanged()` runs
- **Manually re-selecting event AFTER init** → WORKS: player already exists, `onSocietyChanged()` updates handicap correctly

### Fix Applied
Moved `autoAddCurrentUser()` to FIRST in init, before both `loadSocietyOptions()` and `loadEvents()`:

```javascript
// Before init order:
// 1. loadSocietyOptions()
// 2. loadEvents()         ← auto-selects, onSocietyChanged runs on empty players
// 3. course picker setup
// 4. autoAddCurrentUser() ← too late!

// After init order:
// 1. autoAddCurrentUser() ← player exists first!
// 2. loadSocietyOptions()
// 3. loadEvents()         ← auto-selects, onSocietyChanged runs on populated players ✓
// 4. course picker setup
```

Removed the duplicate `autoAddCurrentUser()` call from its old position (after course picker setup).

### Commit
`b7719a5a`

### File Modified
`public/index.html` — lines ~54154-54168 (init method)

---

## Bug Fix 9: Manual Handicap Change Not Propagating to Scoring Engines

**Type:** Scoring bug
**Status:** Completed
**Root Cause:** `promptManualHandicap()` (line ~52687) and `updatePlayerHandicap()` (line ~52644) updated `player.handicap` but did NOT update `gameConfigs[format].handicaps[playerId]`. The match play scoring engine calls `getGameHandicap('matchplay', playerId)` (line 55681) which checks `gameConfigs` FIRST — if a value exists there, it returns that, ignoring `player.handicap`.

So when the user manually changed Pete's HCP from 2.5 to 1.4 via the player card during back 9:
- `player.handicap` → 1.4 ✓ (visible on player card)
- `gameConfigs.matchplay.handicaps[pete_id]` → 2.5 ✗ (stale, never updated)
- `getGameHandicap('matchplay', pete_id)` → 2.5 ✗ (returns stale gameConfig value)
- Match play engine used 2.5 for all remaining holes → wrong scores

Note: `onSocietyChanged()` (line ~52801) already correctly propagated to gameConfigs. Only manual changes were broken.

### Fix Applied
Added `propagateHandicapToGameConfigs(playerId, handicapValue)` method that loops through all gameConfigs and updates any format that has a handicap entry for that player:

```javascript
propagateHandicapToGameConfigs(playerId, handicapValue) {
    if (!this.gameConfigs) return;
    for (const gameFormat of Object.keys(this.gameConfigs)) {
        const gameConfig = this.gameConfigs[gameFormat];
        if (gameConfig && gameConfig.handicaps && gameConfig.handicaps[playerId] !== undefined) {
            gameConfig.handicaps[playerId] = handicapValue;
        }
    }
}
```

Called from both `updatePlayerHandicap()` and `promptManualHandicap()`.

### Impact on Today's Round (Khao Kheow A+B, 2026-02-10)
- **Front 9**: Pete played universal HCP 2.5 instead of TRGG 1.4 (caused by init order bug — Bug Fix 8)
- **Back 9**: User manually changed to 1.4 via player card, but match play engine still used 2.5 from gameConfigs (this bug)
- Both issues now fixed

### Why Scores Were Wrong Specifically From Hole 7-8 of Back 9
HCP 2.5 → rounded to **2 strokes** allocated to the 2 hardest holes by stroke index
HCP 1.4 → rounded to **1 stroke** allocated to the hardest hole only

For the first 6-7 holes of the back 9, the extra phantom stroke hadn't been reached yet. When the hole with the 2nd-lowest stroke index came up (around hole 7-8), Pete got a stroke he shouldn't have had. That flipped that hole's net result, and since match play is cumulative (running total), every hole after that was off by at least 1.

### Commit
`173f12e3`

### File Modified
`public/index.html` — lines ~52642-52655 (updatePlayerHandicap), ~52672 (new method), ~52693 (promptManualHandicap)

---

## Bug Fix 10: Wrong Course ID Mapping for Pattaya Country Club

**Type:** Data mapping bug
**Status:** Completed
**Root Cause:** `COURSE_ID_MAP` in `loadCourseData()` (line 54929) mapped `'pattaya_county'` to `'pattaya_country_club'`. The database `course_holes` table stores all Pattaya CC holes under `course_id = 'pattaya_county'` (90 rows). The mapped ID `'pattaya_country_club'` has zero rows. Query returned no holes → `startRound()` returned early with error.

### Fix Applied
Removed the incorrect mapping entry:
```javascript
// Before
const COURSE_ID_MAP = {
    'bangpra': 'bangpra_international',
    'pattana': 'pattana_golf',
    'pattaya_county': 'pattaya_country_club'  // WRONG
};

// After
const COURSE_ID_MAP = {
    'bangpra': 'bangpra_international',
    'pattana': 'pattana_golf'
};
```

Also fixed the cache version key from `'pattaya_country_club'` to `'pattaya_county'` to match.

### Commit
`34a8f632`

### File Modified
`public/index.html` — lines 54929-54933 (COURSE_ID_MAP), line 54954 (cache version key)

---

## Bug Fix 11: Inline Handicap Allocation Not Rounding Decimal Handicaps

**Type:** Critical scoring bug
**Status:** Completed (superseded by Bug Fix 12 consolidation)
**Commit:** `0427b3a5` (SW v273)
**Root Cause:** 4 inline copies of `getNetScore` / `getStablefordPoints` in `calculateTeamMatchPlay` and `calculateHolesStatus` used `Math.abs(hcpValue)` to get the total shots. This takes the raw decimal value (e.g., 8.5 → 8) via floor truncation when passed to integer math. The canonical `allocHandicapShots()` uses `Math.round()` (e.g., 8.5 → 9).

### Impact on 2026-02-11 Round (Pattaya CC)
| Player | HCP | Inline (wrong) | allocHandicapShots (correct) |
|--------|-----|----------------|------------------------------|
| Pete Park | 1.4 | 1 shot | 1 shot (same) |
| See-Hoe Perry | 0.9 | 0 shots | 1 shot |
| Alan Thomas | 8.5 | 8 shots | 9 shots |
| Moore Richard | 10.8 | 10 shots | 11 shots |

3 out of 4 players had wrong shot counts. This affected both stableford points AND match play hole results.

### Fix Applied
Added `Math.round()` to all 4 inline functions:
```javascript
// Before
const absHcp = Math.abs(hcpValue);
// After
const absHcp = Math.round(Math.abs(hcpValue));
```

### File Modified
`public/index.html` — calculateTeamMatchPlay (line ~53402), calculateHolesStatus (line ~56001)

---

## Bug Fix 12: Consolidate All Handicap Allocation to allocHandicapShots()

**Type:** Code architecture / single source of truth
**Status:** Completed
**Commit:** `6d81a7d5` (SW v274)
**Root Cause:** 7+ inline copies of handicap allocation math scattered across scoring functions. Each copy reimplemented the same logic differently, leading to recurring bugs. The canonical `allocHandicapShots()` function already existed and was correct.

### Changes Made

#### calculateTeamMatchPlay (line ~53402)
Replaced inline `getStablefordPoints` and `getNetScore` with versions that call `allocHandicapShots()`:
```javascript
// Pre-compute shot allocations per player using the SINGLE source of truth
const shotAllocations = new Map();
const getShotsForPlayer = (playerHcp) => {
    const key = String(playerHcp);
    if (!shotAllocations.has(key)) {
        shotAllocations.set(key, this.allocHandicapShots(courseHoles, playerHcp));
    }
    return shotAllocations.get(key);
};

const getStablefordPoints = (grossScore, playerHcp, holeNumber, par) => {
    if (!grossScore) return 0;
    const shots = getShotsForPlayer(playerHcp);
    const bonusShots = shots[holeNumber] || 0;
    const netScore = this.netStrokesForHole(grossScore, bonusShots);
    return this.stablefordPointsForHole(netScore, par, this.defaultStableford);
};

const getNetScore = (grossScore, playerHcp, holeNumber) => {
    if (!grossScore) return grossScore;
    const shots = getShotsForPlayer(playerHcp);
    const bonusShots = shots[holeNumber] || 0;
    return this.netStrokesForHole(grossScore, bonusShots);
};
```

Also fixed all 12 call sites to pass `holeNum` instead of `strokeIndex` (the old inline functions used strokeIndex for their own allocation; the new ones use hole number since `allocHandicapShots()` returns a map keyed by hole number).

#### calculateHolesStatus (line ~55995)
Removed both inline helper functions entirely (50 lines of dead/duplicated code). Replaced stableford path with direct calls to `allocHandicapShots()`, `netStrokesForHole()`, and `stablefordPointsForHole()`:
```javascript
if (useStableford) {
    const allHoles = this.courseData?.holes || [];
    const p1Shots = this.allocHandicapShots(allHoles, hcp1);
    const p2Shots = this.allocHandicapShots(allHoles, hcp2);
    // ... use p1Shots[hole] and p2Shots[hole] directly
}
```
Left the strokes/match-play path unchanged (uses relative handicap difference, which is correct for 1v1 match play).

### Result
- **Before:** 7+ copies of handicap allocation math, each slightly different
- **After:** 1 canonical function (`allocHandicapShots()`) called everywhere
- **Net change:** -129 lines, +66 lines = 63 lines removed
- Any future handicap allocation fix only needs to be made in ONE place

### File Modified
`public/index.html`, `public/sw.js`

---

## Bug Fix 13: Buddies Modal Z-Index — Tailwind Arbitrary Value in Dynamic HTML

**Type:** CSS / Tailwind CDN issue
**Status:** Completed (but was NOT the actual buddies bug)
**Commit:** `bf0f6a92` (SW v275)
**Root Cause:** The buddies modal HTML was created dynamically in `golf-buddies-system.js` using `document.body.insertAdjacentHTML()`. It used Tailwind arbitrary value classes like `z-[99999]` and `z-[999999]`. The Tailwind CDN generates CSS via MutationObserver, which may not fire before the modal is displayed on mobile. Without the generated CSS, the z-index defaults to `auto`.

### Fix Applied
Replaced all Tailwind arbitrary value classes in dynamically-created HTML with inline styles:
```html
<!-- Before -->
<div id="buddiesModal" class="... z-[99999]">
<!-- After -->
<div id="buddiesModal" class="..." style="z-index: 99999;">
```
Same for `groupEditModal` (`z-[999999]` → `style="z-index: 999999;"`).

Also fixed mobile button layout: added `style="width: auto;"` to Add Player + Buddies buttons to override CSS `@media (max-width: 640px) { .btn-secondary { width: 100%; } }` that distorted the button row.

### File Modified
`public/golf-buddies-system.js`, `public/index.html` (button layout), `public/sw.js`

---

## Bug Fix 14: My Buddies Tab Blank on Mobile — formatHandicapDisplay Crash

**Type:** Silent JavaScript crash
**Status:** Completed (code fix correct, but didn't reach mobile until Bug Fix 16)
**Commit:** `fa7c131d` (SW v276)
**Root Cause:** `renderMyBuddies()` called `window.formatHandicapDisplay()` (from `global-player-directory.js`) inside a `.map()` callback. On mobile with slower connections, `global-player-directory.js` might not be loaded yet when the user opens the Buddies modal. The `TypeError: window.formatHandicapDisplay is not a function` crashed the entire `.map()` silently — `container.innerHTML` never got set, leaving the tab completely blank.

**Why other tabs worked:** `renderSuggestions()` does NOT use `formatHandicapDisplay`. `renderSavedGroups()` has static HTML elements (buttons, text) visible even if dynamic content fails. `renderMyBuddies()` has NO static content — everything is dynamically rendered, so a crash = completely blank.

### Fix Applied
1. All 4 `formatHandicapDisplay` call sites now check `typeof window.formatHandicapDisplay === 'function'` with `parseFloat(val).toFixed(1)` fallback
2. Added try-catch around `renderMyBuddies()` `.map()` with error UI + "Retry" button
3. Null-safe profiles join in `loadBuddies()`: `const profileList = profiles || [];`
4. Added `retryLoadBuddies()` method called from error UI

### File Modified
`public/golf-buddies-system.js`, `public/sw.js`

---

## Bug Fix 15: Buddies Modal max-h-[90vh] — Another Tailwind Arbitrary Value

**Type:** CSS / Tailwind CDN issue
**Status:** Completed
**Commit:** `d0941a53` (SW v277)
**Root Cause:** Same class of bug as Bug Fix 13. The modal card used `max-h-[90vh]` (Tailwind arbitrary value) in dynamically-created HTML. Without the generated CSS, the card has no max-height constraint, which could cause layout issues with `flex-1` and `overflow-y-auto` on the content area.

### Fix Applied
```html
<!-- Before -->
<div class="... max-h-[90vh] flex flex-col">
<!-- After -->
<div class="... flex flex-col" style="max-height: 90vh;">
```

Also changed `openBuddiesModal` to always force-reload buddies data with a "Loading buddies..." indicator, ensuring fresh data every time the modal opens.

### File Modified
`public/golf-buddies-system.js`, `public/sw.js`

---

## Bug Fix 16: Stale Cache-Buster on golf-buddies-system.js Script Tag

**Type:** CRITICAL — Browser caching preventing ALL code updates on mobile
**Status:** Completed
**Commit:** `bf411fd1` (SW v278)
**Root Cause:** The script tag in `index.html` loaded the file as:
```html
<script src="golf-buddies-system.js?v=20260107" defer></script>
```
The `?v=20260107` cache-buster was from January 7th — over a month old. Combined with Vercel's `Cache-Control: public, max-age=2592000` (30 days) for JS files, the mobile browser was serving the January 7th version of the file. ALL three previous deploys (v275, v276, v277) were completely invisible to mobile because the browser URL hadn't changed.

This is why "it works on desktop but not mobile" — desktop might have had a fresher cache or different caching behavior, while mobile (LINE LIFF WebView) aggressively cached the old version.

### Fix Applied
```html
<!-- Before -->
<script src="golf-buddies-system.js?v=20260107" defer></script>
<!-- After -->
<script src="golf-buddies-system.js?v=20260208" defer></script>
```

### Why This Is the Same Bug as Fuckup 2
Fuckup 2 was `sw.js` being cached by Vercel CDN for 30 days. Bug Fix 16 is `golf-buddies-system.js` being cached by the browser for 30 days. Same root cause: browser/CDN caching preventing code updates from reaching the user. Same lesson (lesson 3) that Claude failed to apply.

### File Modified
`public/index.html`, `public/sw.js`

---

## All Commits (Chronological, This Session Only)

| Commit | Description |
|--------|-------------|
| `ba4c4031` | Add onchange handler, organizer_id query, init order swap (societies before events) |
| `088cd0da` | Fix guest name matching — empty names matching everything |
| `4c480ee9` | Add name matching fallback (insufficient — "TRGG Pattaya" ≠ "Travellers Rest Golf Group") |
| `cee06896` | Bump SW v268 (didn't reach user — CDN caching) |
| `7da1f5a3` | Fix vercel.json header order — sw.js was cached 30 days |
| `f678121b` | Final society matching: society_id UUID + normalized name, SW v269 |
| `8144c133` | Add session catalog (first version) |
| `b7719a5a` | Fix init order: autoAddCurrentUser before loadEvents, SW v270 |
| `173f12e3` | Fix manual handicap not propagating to game scoring engines, SW v271 |
| `b22ac6e7` | Session catalog update with Bug Fix 9 |
| `a673505d` | Session catalog update with match play explanation + lesson 10 |
| `34a8f632` | Fix Pattaya CC course ID mapping (pattaya_county, not pattaya_country_club), SW v272 |
| `5f5a15e7` | Session catalog update with Fuckup 6, Bug Fix 10, lessons 11-12 |
| `0427b3a5` | Fix inline handicap allocation rounding (Math.abs → Math.round), SW v273 |
| `6d81a7d5` | Consolidate all inline handicap allocation to use allocHandicapShots(), SW v274 |
| `818dd6b8` | Session catalog update with Bug Fix 11-12, Fuckup 7, lesson 13 |
| `bf0f6a92` | Buddies modal z-index inline style + mobile button layout, SW v275 (WRONG FIX) |
| `fa7c131d` | formatHandicapDisplay safe fallback + try-catch + null-safe profiles, SW v276 (didn't reach mobile) |
| `d0941a53` | Force-reload buddies on modal open + max-h-[90vh] inline style, SW v277 (didn't reach mobile) |
| `bf411fd1` | Update cache-buster ?v=20260107→?v=20260208 — THE ACTUAL FIX, SW v278 |

---

## Database Issues (NOT Fixed — Data Quality)

These are data quality issues in the `society_events` table that made matching hard:

1. **`organizer_id` is NULL** for all TRGG and JOA events (column is UUID type, society_profiles uses TEXT type — type mismatch means they can never match even if populated)
2. **`society_id` is inconsistent** — only some TRGG events have it set to the correct UUID, others are NULL
3. **`organizer_name` is inconsistent** — some TRGG events use "TRGG Pattaya", others use "Travellers Rest Golf Group"

Proper data fix would be: set `society_id` on ALL events to the correct society profile UUID. This would make Strategy 1 (UUID match) work for everything and eliminate the need for name matching heuristics.

---

## Mandatory Lessons for Future Sessions

1. **DIAGNOSE COMPLETELY before deploying.** Check all data values, all matching paths, all transformation pipelines, AND the init/timing order. Don't deploy after finding the first bug — there may be 5 more.
2. **TRACE THE FULL EXECUTION PATH.** Don't just check "does the matching work?" — trace from trigger → matching → data update → UI render. Check when players are added relative to when auto-select fires.
3. **Check actual HTTP response headers** when fixes aren't reaching the user. `curl -I` or PowerShell `Invoke-WebRequest -Method HEAD` shows what the server ACTUALLY sends vs. what the config says.
4. **Vercel header rules: LAST match wins** for same header key. Specific rules MUST come AFTER wildcard rules to take precedence.
5. **`"anystring".includes("")` is always `true`** in JavaScript. Always check for empty/short strings before using `.includes()` for matching.
6. **Check the actual database values** before writing matching logic. Run `SELECT DISTINCT` to see what you're actually matching against.
7. **Read the full data transformation pipeline** — raw DB fields may not all be included in the mapped objects your code receives.
8. **Init order matters for async auto-select.** If `loadEvents()` auto-selects and dispatches a change event, any handler that depends on other data (like `this.players`) must have that data populated BEFORE `loadEvents()` runs.
9. **The sw.js caching bug affected BOTH sessions today.** Total wasted deploys across both sessions: 15+. One `curl -I` check would have found it immediately.
10. **Handicaps are stored in TWO places** — `player.handicap` (display/fallback) AND `gameConfigs[format].handicaps[playerId]` (used by scoring engines). ANY code that changes a player's handicap MUST update BOTH. `getGameHandicap(format, playerId)` checks gameConfigs FIRST and only falls back to `player.handicap` if gameConfigs has no entry. If gameConfigs has a stale value, the scoring engine silently uses the wrong handicap while the player card shows the correct one.
11. **CHECK CONSOLE OUTPUT FIRST when a feature "breaks."** Don't read 500 lines of code looking for syntax errors. The console error `❌ NO HOLES FOUND for course: pattaya_county` was right there. Would have found the root cause in 30 seconds instead of 5 minutes of code reading.
12. **NEVER add ID mappings without verifying against the database.** `COURSE_ID_MAP` entries must be checked with `SELECT DISTINCT course_id FROM course_holes WHERE course_id LIKE '%name%'` before adding. Wrong mappings silently break features with no obvious error until a user tries that specific course.
13. **NEVER copy-paste calculation logic when a canonical function already exists.** `allocHandicapShots()` is the SINGLE source of truth for handicap stroke allocation. Any scoring function that needs to know how many shots a player gets on each hole MUST call `allocHandicapShots()` — not reimplement the math inline. Code duplication is the root cause of recurring scoring bugs: fix one copy, the other 6 copies stay broken.
14. **Tailwind arbitrary value classes (z-[99999], max-h-[90vh]) DON'T WORK in dynamically-created HTML.** The Tailwind CDN generates CSS via MutationObserver, which may not fire before the element is displayed. ALWAYS use inline `style="..."` instead of arbitrary value classes in HTML created via `insertAdjacentHTML()`, `innerHTML`, or template literals.
15. **ALWAYS update the script tag cache-buster `?v=` when deploying changes to external JS files.** If `<script src="file.js?v=20260107">` hasn't changed, the browser serves the January version regardless of how many times you deploy the actual file. This is the FIRST thing to check when "code changes aren't reaching mobile." Check: (1) script tag `?v=` parameter, (2) HTTP Cache-Control headers, (3) service worker cache.
16. **LISTEN TO THE USER before assuming the problem.** "Does not show up" could mean the modal doesn't open, the tab is blank, or the content is hidden. Don't assume CSS/visibility — investigate the data flow (loading → rendering → DOM insertion) and ask clarifying questions if the problem description is ambiguous.
17. **NEVER tell the user to do deployment tasks.** CLAUDE.md says deployment is Claude's job. If network is down, keep retrying silently. Don't dump `git push && vercel --prod` commands on the user.
