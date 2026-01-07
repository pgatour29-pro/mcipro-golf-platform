# Session Catalog - January 7, 2026
## Handicap Display Fix & Alan Thomas Score Posting

---

## FUCK-UPS AND MISTAKES

### 1. Rocky Jones Plus Handicap Display (-1.9 vs +1.9)

**The Problem:**
Rocky Jones has a plus handicap (+1.9), which is stored internally as -1.9 (negative number = plus handicap). The buddy list was showing "-1.9" instead of "+1.9".

**Root Cause:**
The `formatHandicapDisplay()` function was correctly implemented and deployed, BUT **browser caching** was serving the old JavaScript file.

**Cache Headers Found:**
```
Cache-Control: public, max-age=2592000  (30 DAYS!)
X-Vercel-Cache: HIT
```

**The Fix:**
Added cache-busting query parameter to the script tag:
```html
<!-- BEFORE -->
<script src="golf-buddies-system.js" defer></script>

<!-- AFTER -->
<script src="golf-buddies-system.js?v=20260107" defer></script>
```

**Files Modified:**
- `public/index.html` (line 138)

**Commit:** `ec93eb7f` - Add cache-bust to golf-buddies-system.js to fix stale handicap display

---

### 2. Previous Session Fuck-Ups (Carried Over)

#### effectiveHandicap Undefined Error
- **What happened:** Introduced `effectiveHandicap` variable without defining it
- **Result:** ReferenceError crashed ALL game calculations (match play, Nassau, stableford)
- **Fix:** Reverted all `effectiveHandicap`/`playingHandicap` changes back to using `player.handicap`

#### Rocky's Handicap Value Confusion
- Initially put as -1.9 (correct for storage)
- Changed to 1.9 (wrong - displayed as "1.9" not "+1.9")
- Changed back to -1.9 (correct storage)
- But display still showed "-1.9" due to browser cache

#### Accidentally Committed Screenshots Folder
- Committed large screenshots folder to repo
- Had to remove and add to .gitignore
- **Commit:** `763783c0` - Remove screenshots folder from repo
- **Commit:** `f9bdff35` - Add screenshots to gitignore

---

## SUCCESSFUL FIXES

### 1. Plus Handicap Display System

**How Plus Handicaps Work:**
```
Storage: -1.9 (negative number)
Display: +1.9 (with plus sign)

formatHandicapDisplay(-1.9) → "+1.9"
```

**Code Flow:**
```javascript
// golf-buddies-system.js (4 locations: lines 438, 688, 1055, 1178)
const handicap = window.formatHandicapDisplay(handicapValue);

// index.html line 11485
window.formatHandicapDisplay = function(handicap) {
    return HandicapManager.formatDisplay(handicap);
};

// index.html line 11374-11379
static formatDisplay(handicap) {
    if (handicap === null || handicap === undefined) return '-';
    const num = parseFloat(handicap);
    if (isNaN(num)) return String(handicap);
    if (num < 0) return `+${Math.abs(num).toFixed(1)}`;  // KEY LINE
    return num.toFixed(1);
}
```

### 2. Alan Thomas Score Posted

**Round Details:**
| Field | Value |
|-------|-------|
| Date | January 7, 2026 |
| Course | Bangpakong Riverside CC |
| Gross Score | 74 |
| Stableford Points | 44 |
| Handicap Used | 10.4 |
| Tee Marker | White |
| Course Rating | 70.5 |
| Slope Rating | 124 |
| Event | TRGG - Bangpakong (Monthly Medal Final) |

**Round ID:** `bb87c43e-14a1-4fcf-8a70-afc6d4236f00`

### 3. Alan Thomas Handicap Updated

**Score Differential Calculation:**
```
Differential = (113 / Slope) × (Gross - Course Rating)
Differential = (113 / 124) × (74 - 70.5)
Differential = 0.911 × 3.5
Differential = 3.2
```

**Best 5 Differentials (WHS-5 Method):**
1. 3.2 (Jan 7 - Bangpakong 74)
2. 8.7 (Dec 24 - Bangpakong 80)
3. 9.6 (Dec 19 - Bangpakong 81)
4. 9.6 (Dec 26 - Bangpakong 81)
5. 11.4 (Dec 15 - Bangpakong 83)

**New Handicap Index:** (3.2 + 8.7 + 9.6 + 9.6 + 11.4) / 5 = **8.5**

**Handicap Changes:**
| Type | Before | After | Change |
|------|--------|-------|--------|
| Society (TRGG) | 10.4 | 8.5 | -1.9 |
| Universal | 10.9 | 9.0 | -1.9 |

---

## DATABASE OPERATIONS

### Rounds Table Insert
```sql
INSERT INTO rounds (
    golfer_id, course_name, played_at, total_gross,
    total_stableford, handicap_used, type, status, player_name
) VALUES (
    'U214f2fe47e1681fbb26f0aba95930d64',
    'Bangpakong Riverside Country Club',
    '2026-01-07T06:00:00+07:00',
    74, 44, 10.4, 'society', 'completed', 'Alan Thomas'
);
```

**Note:** Some fields couldn't be updated due to RLS policy UUID casting error:
```
"operator does not exist: uuid = text"
```
This appears to be a trigger/policy issue on UPDATE operations.

### Society Handicaps Update
```sql
UPDATE society_handicaps
SET handicap_index = 8.5,
    rounds_count = 1,
    calculation_method = 'WHS-5',
    last_calculated_at = NOW()
WHERE golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
  AND society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346';

UPDATE society_handicaps
SET handicap_index = 9.0,
    rounds_count = 1,
    calculation_method = 'WHS-5',
    last_calculated_at = NOW()
WHERE golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
  AND society_id IS NULL;
```

### User Profiles Update
```sql
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,handicap}',
    '"9.0"'
)
WHERE line_user_id = 'U214f2fe47e1681fbb26f0aba95930d64';
```

---

## KEY LEARNINGS

### 1. Browser Caching is the Silent Killer
- Vercel serves JS files with 30-day cache
- Users don't see code changes until cache expires
- **Solution:** Always add cache-busting version parameter when deploying critical fixes

### 2. Plus Handicap Storage Convention
```
Internal Storage: NEGATIVE number (-1.9)
Display Format: POSITIVE with + sign (+1.9)
parseFloat("-1.9") = -1.9 (number)
if (num < 0) → display with + prefix
```

### 3. WHS Handicap Calculation
```
Differential = (113 / Slope) × (Adjusted Gross - Course Rating)
Handicap Index = Average of best differentials (varies by round count)
- 5-6 rounds: best 1
- 7-8 rounds: best 2
- 9-10 rounds: best 3
- 11-12 rounds: best 4
- 13-14 rounds: best 5
- etc.
```

### 4. Supabase RLS UUID Issues
Some UPDATE operations fail with UUID casting errors when triggers or RLS policies compare UUID columns to text values. Workaround: update fields individually or skip problematic columns.

---

## FILES MODIFIED THIS SESSION

| File | Changes |
|------|---------|
| `public/index.html` | Added cache-bust `?v=20260107` to golf-buddies-system.js |

## DATABASE RECORDS MODIFIED

| Table | Record ID | Changes |
|-------|-----------|---------|
| rounds | bb87c43e-14a1-4fcf-8a70-afc6d4236f00 | New round for Alan Thomas |
| society_handicaps | cecea758-bf31-47e4-909b-c9f242658fb2 | TRGG handicap 10.4 → 8.5 |
| society_handicaps | fc2a831b-2e1d-4973-a5d2-8f6aa4bdafe9 | Universal handicap 10.9 → 9.0 |
| user_profiles | U214f2fe47e1681fbb26f0aba95930d64 | profile_data.golfInfo.handicap → "9.0" |

---

## COMMITS THIS SESSION

1. `ec93eb7f` - Add cache-bust to golf-buddies-system.js to fix stale handicap display

## DEPLOYMENT

- **URL:** https://mycaddipro.com
- **Vercel Deploy:** Production deployed at 11:43 UTC

---

## USER IDS REFERENCE

| Name | LINE User ID |
|------|--------------|
| Alan Thomas | U214f2fe47e1681fbb26f0aba95930d64 |
| Rocky Jones | U044fd835263fc6c0c596cf1d6c2414af |
| Pete Park | U2b6d976f19bca4b2f4374ae0e10ed873 |
| Gilbert Tristan | U533f2301ff76d319e0086e8340e4051c |

## SOCIETY REFERENCE

| Society | ID |
|---------|-----|
| Travellers Rest Golf Group (TRGG) | 7c0e4b72-d925-44bc-afda-38259a7ba346 |

## EVENT REFERENCE

| Event | ID |
|-------|-----|
| TRGG - Bangpakong (Monthly Medal Final) | 7e29a4ee-9e01-4247-a9ac-cdc7a4d64b24 |
