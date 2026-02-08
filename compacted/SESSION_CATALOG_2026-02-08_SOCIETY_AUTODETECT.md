# Session Catalog: 2026-02-08 — Society Handicap Auto-Detect Fix

## Summary
User reported that the live scoring system wasn't automatically detecting the correct society handicap when a society event was selected. Investigation revealed FOUR separate bugs preventing auto-detection. Also discovered and fixed a critical infrastructure bug: Vercel was caching `sw.js` for 30 days due to conflicting header rules, which was why ALL previous session fixes were invisible to the user (stuck on SW v267). Total of 6 deploys across TWO sessions today (this session: 6 commits, but the first 4 should have been batched into 1).

---

## FUCKUPS BY CLAUDE

### Fuckup 1: Deployed 6 Times Instead of Batching
**Severity:** HIGH — User frustration, CLAUDE.md says batch into ONE deploy
**What Happened:** Made 6 separate commits/deploys:
1. `ba4c4031` — onchange handler + init order + organizer_id in query
2. `088cd0da` — Guest name matching fix
3. `4c480ee9` — Name matching fallback for NULL organizer_id
4. `cee06896` — SW v268 bump (realized user was stuck on v267)
5. `7da1f5a3` — Vercel headers fix (sw.js was cached 30 days)
6. `f678121b` — society_id + normalized name matching (final fix)

Commits 1-4 should have been ONE deploy. Should have fully diagnosed the data flow, checked all matching scenarios, and verified the user was running new code BEFORE deploying anything.
**Lesson:** DIAGNOSE COMPLETELY before making ANY changes. Check ALL data paths, not just the first one you find.

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

### New Method: onEventChanged() (line ~52721)
Created new method that:
1. Gets selected event from `this.loadedEvents`
2. Tries to match event to a society profile (4 strategies — see Bug Fix 4)
3. Sets the society dropdown to the matched society
4. Calls `onSocietyChanged()` to update player handicaps

### Commit
`ba4c4031`

### File Modified
`public/index.html` — line 31929 (dropdown), line ~52721 (new method)

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
**Status:** Completed
**Root Cause:** `loadEvents()` ran BEFORE `loadSocietyOptions()` in init. When events auto-selected, `societyProfilesCache` was null.

### Fix Applied
Swapped order at line ~54144:
```javascript
// Before: loadEvents() first, then loadSocietyOptions()
// After: loadSocietyOptions() first, then loadEvents()
await this.loadSocietyOptions();
await this.loadEvents();
```

### Commit
`ba4c4031`

### File Modified
`public/index.html` — lines ~54144-54155

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
- `public/index.html` — line 49637 (event mapping), lines 52740-52765 (onEventChanged)

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

## Bug Fix 7: SW Version Bump (v267 → v268 → v269)

**Type:** Cache invalidation
**Status:** Completed

- `cee06896` — v267 → v268 (didn't reach user due to CDN caching)
- `f678121b` — v268 → v269 (included in final fix deploy)

### File Modified
`public/sw.js` — line 4

---

## All Commits (Chronological, This Session Only)

| Commit | Description |
|--------|-------------|
| `ba4c4031` | Add onchange handler, organizer_id query, init order swap |
| `088cd0da` | Fix guest name matching — empty names matching everything |
| `4c480ee9` | Add name matching fallback (insufficient — "TRGG Pattaya" ≠ "Travellers Rest Golf Group") |
| `cee06896` | Bump SW v268 (didn't reach user — CDN caching) |
| `7da1f5a3` | Fix vercel.json header order — sw.js was cached 30 days |
| `f678121b` | Final fix: society_id UUID match + normalized name matching, SW v269 |

---

## Database Issues (NOT Fixed — Data Quality)

These are data quality issues in the `society_events` table that made matching hard:

1. **`organizer_id` is NULL** for all TRGG and JOA events (column is UUID type, society_profiles uses TEXT type — type mismatch means they can never match even if populated)
2. **`society_id` is inconsistent** — only some TRGG events have it set to the correct UUID, others are NULL
3. **`organizer_name` is inconsistent** — some TRGG events use "TRGG Pattaya", others use "Travellers Rest Golf Group"

Proper data fix would be: set `society_id` on ALL events to the correct society profile UUID. This would make Strategy 1 (UUID match) work for everything and eliminate the need for name matching heuristics.

---

## Mandatory Lessons for Future Sessions

1. **DIAGNOSE COMPLETELY before deploying.** Check all data values, all matching paths, all transformation pipelines. Don't deploy after finding the first bug — there may be 4 more.
2. **Check actual HTTP response headers** when fixes aren't reaching the user. `curl -I` or PowerShell `Invoke-WebRequest -Method HEAD` shows what the server ACTUALLY sends vs. what the config says.
3. **Vercel header rules: LAST match wins** for same header key. Specific rules MUST come AFTER wildcard rules to take precedence.
4. **`"anystring".includes("")` is always `true`** in JavaScript. Always check for empty/short strings before using `.includes()` for matching.
5. **Check the actual database values** before writing matching logic. Run `SELECT DISTINCT` to see what you're actually matching against.
6. **Read the full data transformation pipeline** — raw DB fields may not all be included in the mapped objects your code receives.
7. **The sw.js caching bug affected BOTH sessions today.** Total wasted deploys across both sessions: 12+. One `curl -I` check would have found it immediately.
