# MyCaddiPro Match Play & Handicap Fix Session
**Date**: January 11, 2026
**Issue**: 5-player team match play scoring incorrect, Pete Park handicap flip-flopping
**Status**: FIXED

---

## Problems Summary

### Problem 1: Match Play Using Wrong Scoring Method
Match play was comparing **Net Strokes** (lower wins) instead of **Stableford Points** (higher wins) even when Stableford was selected as the scoring format.

**Root Cause**: The "Match Play Scoring Method" radio button defaulted to "Net Strokes" (line 31239):
```html
<input type="radio" name="matchPlayMethod" value="stroke" checked class="mr-2">
```

The fallback logic only checked `scoringFormats` if NO radio was selected:
```javascript
// OLD (WRONG):
const anchorUseStableford = anchorMatchPlayMethodRadio
    ? anchorMatchPlayMethodRadio.value === 'stableford'  // Radio is 'stroke', so FALSE
    : (this.scoringFormats.includes('stableford'));      // Never reaches fallback
```

### Problem 2: Pete Park Handicap Flip-Flopping (0 ↔ 3.2)
Profile form was reading `golfInfo.handicap` (which was 0) instead of `handicap_index` (which was 3.2).

**Root Cause 1**: Profile form input used wrong priority (line 19550):
```javascript
// OLD:
value="${profile.golfInfo?.handicap || profile.roleSpecific?.handicap || ''}"
```

**Root Cause 2**: localStorage profile restore didn't include `handicap_index` (line 8986-8999).

---

## All Fixes Applied

### Fix 1: Match Play Now Uses Stableford When Stableford Scoring Selected
**Files**: `public/index.html` - 7 locations fixed

Changed logic to use Stableford if EITHER the radio is set to 'stableford' OR stableford is in scoringFormats:

```javascript
// NEW (CORRECT):
const stablefordIsScoring = this.scoringFormats.includes('stableford') || this.scoringFormats.includes('modifiedstableford');
const anchorUseStableford = anchorMatchPlayMethodRadio?.value === 'stableford' || stablefordIsScoring;
```

**Locations Fixed:**
| Line | Context |
|------|---------|
| 59880-59884 | Anchor team match play leaderboard |
| 59971-59974 | 4-player team match play leaderboard |
| 59811-59814 | Round robin match play |
| 60058-60061 | Individual match play vs field |
| 57447-57450 | Settlement calculation |
| 54959-54962 | Score save - team match play |
| 55025-55028 | Score save - individual match play |

### Fix 2: Profile Form Handicap Priority
**File**: `public/index.html` line 19550

```javascript
// OLD:
value="${profile.golfInfo?.handicap || profile.roleSpecific?.handicap || ''}"

// NEW:
value="${profile.handicap || profile.golfInfo?.handicap || profile.roleSpecific?.handicap || ''}"
```

### Fix 3: localStorage Profile Restore Includes handicap_index
**File**: `public/index.html` lines 8986-9003

```javascript
// NEW: Added to fullProfile object
const correctHandicap = userProfile.handicap_index ?? userProfile.profile_data?.handicap ?? userProfile.profile_data?.golfInfo?.handicap;
const fullProfile = {
    // ... existing fields ...
    handicap_index: userProfile.handicap_index,  // NEW
    handicap: correctHandicap,                    // NEW
    // ... rest of fields ...
};
```

### Fix 4: Pete Park golfInfo.handicap Database Fix
Direct database update to set `profile_data.golfInfo.handicap = "3.2"` (was 0).

---

## Debug Logging Added

### Team Match Play Debug (lines 51062-51071, 51122)
```javascript
console.log(`[TeamMatchPlay] Hole ${holeNum} (SI ${strokeIndex}, Par ${par}):`, {
    team1: { p1: {...}, p2: {...} },
    team2: { p1: {...}, p2: {...} }
});
console.log(`[TeamMatchPlay] Hole ${holeNum} RESULT: ${holeResult} | Team1 best=${...} | Running: ${...}`);
```

### Stableford Detection Debug (line 59884)
```javascript
console.log('[AnchorTeamMatchPlay] Using Stableford:', anchorUseStableford, '| Radio:', anchorMatchPlayMethodRadio?.value, '| Formats:', this.scoringFormats);
```

---

## 5-Player Anchor Team Match Play - How It Works

### Setup
- **Anchor Team**: 2 fixed players (e.g., Ryan + Pluto)
- **Rotating Pool**: Remaining 3 players (e.g., Pete, Alan, Tristan)
- **Matches Generated**: C(3,2) = 3 matches
  1. Anchor vs Pete+Alan
  2. Anchor vs Pete+Tristan
  3. Anchor vs Alan+Tristan

### Scoring (Best Ball + Tiebreaker with Stableford)
1. Each player's stableford points calculated per hole (with handicap strokes)
2. Best ball from each team compared (higher wins)
3. If tied, second ball compared (tiebreaker)
4. If still tied, hole is halved (AS)

### Example Calculation (Hole 1, Par 4, SI 2)
```
Anchor Team (Ryan + Pluto, both +1.6):
- Ryan: Gross 4, no strokes (plus hcp), Net 4, 2 pts
- Pluto: Gross 5, no strokes (plus hcp), Net 5, 1 pt
- Best: 2 pts, Second: 1 pt

Match 1 vs Pete+Alan:
- Pete: Gross 4, 1 stroke (3.2 hcp on SI 2), Net 3, 3 pts
- Alan: Gross 5, 1 stroke (9 hcp on SI 2), Net 4, 2 pts
- Best: 3 pts, Second: 2 pts
- Result: Anchor 2 < Opponent 3 → ANCHOR LOSES

Match 2 vs Pete+Tristan:
- Pete: 3 pts, Tristan: 1 pt → Best: 3 pts
- Result: Anchor 2 < Opponent 3 → ANCHOR LOSES

Match 3 vs Alan+Tristan:
- Alan: 2 pts, Tristan: 1 pt → Best: 2 pts
- Result: Anchor 2 = Opponent 2 → TIE
- Tiebreaker: Anchor 1 vs Opponent 1 → STILL TIE → AS

After Hole 1: Anchor is 0W-2L-1T
```

---

## Handicap Storage Locations (Reminder)

**ALL 4 must stay in sync:**
```
1. user_profiles.handicap_index        (numeric column - SOURCE OF TRUTH)
2. user_profiles.profile_data.handicap (string in JSON)
3. user_profiles.profile_data.golfInfo.handicap (string in JSON)
4. society_handicaps.handicap_index    (where society_id IS NULL for universal)
```

**Priority when reading:**
```
handicap_index → profile_data.handicap → golfInfo.handicap → fallback
```

---

## Plus Handicap Format (Reminder)

- **Display**: "+1.6" (string with plus sign)
- **Storage (numeric fields)**: -1.6 (negative number)
- **Storage (string fields)**: "+1.6" (string with plus sign)

---

## Commits Made

1. `Add debug logging to team match play stableford calculation`
2. `Fix handicap priority: profile form and localStorage restore now use handicap_index first`
3. `Fix: Match play now uses Stableford when Stableford scoring format is selected`

---

## Key Player Handicaps (Verified)

| Player | Handicap | Storage |
|--------|----------|---------|
| Pete Park | 3.2 | handicap_index: 3.2, golfInfo: 3.2 |
| Alan Thomas | 9 | handicap_index: 9 |
| Tristan Gilbert | 13.2 | handicap_index: 13.2 |
| Ryan Thomas | +1.6 | handicap_index: -1.6 |
| Pluto | +1.6 | handicap_index: -1.6 |

---

## Prevention Rules

### Rule 1: Match Play Scoring Method
When checking if Stableford should be used for match play, ALWAYS check BOTH:
- The matchPlayMethod radio selection
- Whether stableford is in scoringFormats

```javascript
const stablefordIsScoring = this.scoringFormats.includes('stableford');
const useStableford = radio?.value === 'stableford' || stablefordIsScoring;
```

### Rule 2: Profile Handicap Priority
Always read handicap in this order:
1. `profile.handicap_index` or `profile.handicap` (root level)
2. `profile.golfInfo?.handicap`
3. `profile.roleSpecific?.handicap`
4. Fallback (0 or empty)

### Rule 3: localStorage Profile Must Include handicap_index
When restoring profile to localStorage, always include:
```javascript
handicap_index: userProfile.handicap_index,
handicap: correctHandicap,  // Using priority chain
```

---

## Diagnostic Console Logs

After fix, you should see:
```
[AnchorTeamMatchPlay] Using Stableford: true | Radio: stroke | Formats: ["stableford","matchplay","nassau"]
[TeamMatchPlay] Hole 1 (SI 2, Par 4): { team1: {...}, team2: {...} }
[TeamMatchPlay] Hole 1 RESULT: L | Team1 best=2 2nd=1 | Team2 best=3 2nd=2 | Running: -1
```

---

**End of Session Catalog**
