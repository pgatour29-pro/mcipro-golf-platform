# Session Catalog: 2026-02-08 — Society Handicap Auto-Detect Fix

## Summary
User reported that the live scoring system wasn't automatically detecting the correct society handicap when a society event was selected. Investigation revealed FIVE separate bugs preventing auto-detection, plus a critical infrastructure bug where Vercel was caching `sw.js` for 30 days. Also found and fixed a race condition where `onSocietyChanged()` ran before the player was added to `this.players`, causing the society dropdown to update but the player handicap to stay on universal. Total of 8 commits / 7 deploys in this session (should have been 2-3 max).

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

### Impact on Today's Round
- **Front 9**: Pete played universal HCP 2.5 instead of TRGG 1.4 (caused by init order bug — Bug Fix 8)
- **Back 9**: User manually changed to 1.4, but match play engine still used 2.5 from gameConfigs (this bug)
- Both issues now fixed

### Commit
`173f12e3`

### File Modified
`public/index.html` — lines ~52642-52655 (updatePlayerHandicap), ~52672 (new method), ~52693 (promptManualHandicap)

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
