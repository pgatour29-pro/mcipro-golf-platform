# Multi-Society Handicap System Implementation

**Date:** December 21, 2025
**Session:** Society-specific handicap tracking for Thai golf societies

---

## Problem Statement

In Thailand, golfers belong to multiple societies (TRGG, JOA, etc.), each with their own handicap tracking. Requirements:

1. Select which society's handicap system applies before starting a round
2. Use the correct per-society handicap for each player
3. Society rounds update BOTH society AND universal handicaps (calculated independently)
4. Casual rounds only update universal handicap
5. Organizers can manually edit society-specific handicaps WITHOUT affecting universal

---

## Database Schema

### society_handicaps Table

| Column | Type | Description |
|--------|------|-------------|
| golfer_id | text | LINE user ID |
| society_id | uuid | NULL = universal, UUID = specific society |
| handicap_index | numeric | Current handicap value |
| calculation_method | text | 'AUTO' or 'MANUAL' |
| last_calculated_at | timestamp | Last update time |

### Key Society IDs

| Society | UUID |
|---------|------|
| TRGG (Travellers Rest) | `7c0e4b72-d925-44bc-afda-38259a7ba346` |
| JOA (Japan Open Amateur) | `72d8444a-56bf-4441-86f2-22087f0e6b27` |

---

## Implementation Details

### 1. Live Scorecard Society Dropdown

**Location:** `public/index.html` ~line 28546

Added dropdown before player selection:
```html
<div class="mb-4" id="societyHandicapSection">
    <label class="block text-sm font-medium text-gray-700 mb-2">
        <span class="material-symbols-outlined text-sm align-middle text-purple-600">groups</span>
        Round Society (for handicaps)
    </label>
    <select id="roundSocietySelect" class="w-full rounded-lg border-2 border-purple-300 px-3 py-2"
            onchange="LiveScorecardManager.onSocietyChanged()">
        <option value="">Universal Only (HCP: X.X) - Updates universal only</option>
        <option value="uuid">Society Name (HCP: X.X)</option>
    </select>
</div>
```

### 2. Society Handicap Loading Functions

**loadSocietyOptions()** - Line ~44143
- Loads all societies from `society_profiles` table
- Fetches current user's handicaps from `society_handicaps`
- Populates dropdown with handicap values shown

**getPlayerSocietyHandicaps(golferId)** - Line ~44200
- Queries `society_handicaps` for all records for a golfer
- Returns array with both universal (society_id = null) and society-specific records

**getHandicapForSociety(societyHandicaps, selectedSocietyId)** - Line ~44219
- If society selected: finds matching society_id record
- If casual (no selection): uses universal (society_id = null)
- Falls back gracefully if records missing

### 3. Player Selection with Society Handicap

**selectExistingPlayer(lineUserId)** - Line ~46072
- Gets selected society from dropdown
- Fetches player's society_handicaps
- Uses `getHandicapForSociety()` to pick correct handicap
- Stores `societyHandicaps` array on player for potential override

### 4. Organizer Handicap Scope Editing

**Location:** Edit Member Modal ~line 36241

Added "Handicap Scope" dropdown:
```html
<select id="editUserHandicapScope" onchange="SocietyOrganizerSystem.onHandicapScopeChanged()">
    <option value="">Universal Handicap</option>
    <option value="uuid">TRGG Handicap</option>
</select>
```

**saveUserEdits()** - Modified to:
- If scope = society UUID: saves ONLY to `society_handicaps` for that society
- If scope = empty: saves to both `user_profiles.profile_data.golfInfo.handicap` AND `society_handicaps` (universal)

### 5. Dual Handicap Adjustment After Round

**adjustHandicapAfterRound()** - Line ~48241

For society rounds, calculates TWO independent adjustments:

```javascript
// Same differential applies to both
const differential = (adjustedGross - courseRating) * (113 / slopeRating);

// Calculate adjustment against EACH baseline independently
const universalAdjustment = (differential - universalHcp) * 0.2;  // capped ±1.0
const societyAdjustment = (differential - societyHcp) * 0.2;      // capped ±1.0

// Save both to society_handicaps table
// Universal: society_id = null
// Society: society_id = selected society UUID
```

---

## Data Fixes Applied

### Duplicate Records Cleanup

The `society_handicaps` table had accumulated many duplicate records. Created cleanup SQL:

**File:** `sql/FIX_HANDICAPS_CLEANUP.sql`

```sql
-- Delete ALL existing records for affected users
DELETE FROM society_handicaps WHERE golfer_id IN (...);

-- Insert clean records - ONE universal and ONE TRGG per user
INSERT INTO society_handicaps (golfer_id, society_id, handicap_index, calculation_method, last_calculated_at)
VALUES
    ('golfer_id', NULL, universal_hcp, 'MANUAL', NOW()),        -- Universal
    ('golfer_id', 'trgg-uuid', society_hcp, 'MANUAL', NOW());   -- TRGG
```

### User Handicaps Set

| Player | Universal | TRGG |
|--------|-----------|------|
| Pete Park | 3.2 | 2.8 |
| Alan Thomas | 12.2 | 11.9 |
| Tristan Gilbert | 13.2 | 11.0 |

Also updated `user_profiles.profile_data.golfInfo.handicap` to match universal values.

---

## Debug Logging Added

To diagnose society matching issues, added detailed logging:

```javascript
console.log(`[LiveScorecard] Adding player: ${profile.name}`);
console.log(`[LiveScorecard] Selected society from dropdown: "${selectedSociety}"`);
console.log(`[LiveScorecard] Looking for society: "${selectedSocietyId}"`);
console.log(`[LiveScorecard] Player has ${n} handicap records:`, records);
console.log(`[LiveScorecard] ✅ MATCH FOUND - Using ${society} handicap: ${hcp}`);
// or
console.log(`[LiveScorecard] ⚠️ No handicap for selected society, checking universal...`);
```

---

## Page Version

Updated to: `PAGE VERSION: 2025-12-21-SOCIETY-HANDICAP-FIX`

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Society dropdown, handicap functions, dual adjustment, debug logging |
| `sql/FIX_HANDICAPS_CLEANUP.sql` | New file - cleanup duplicate records |

---

## Git Commits

```
835ab339 debug: Add logging to diagnose society handicap matching
a9e4fdf0 feat: Multi-society handicap system - Universal vs TRGG selection
(+ earlier commits for society dropdown, organizer editing, dual adjustment)
```

---

## Known Issues / Debugging

### Issue: Players Using Universal Instead of Society Handicap

**Symptom:** When TRGG is selected, players still show universal handicap

**Debug Steps:**
1. Check console for `PAGE VERSION: 2025-12-21-SOCIETY-HANDICAP-FIX`
2. Look for logs showing:
   - `Selected society from dropdown: "7c0e4b72-..."`
   - `Looking for society: "7c0e4b72-..."`
   - `Player has 2 handicap records: [{society_id: null, hcp: X}, {society_id: "7c0e4b72-...", hcp: Y}]`
3. If match found: `✅ MATCH FOUND`
4. If falling through: `⚠️ No handicap for selected society`

**Possible Causes:**
- Cached old code (check PAGE VERSION)
- Player doesn't have society-specific record in database
- Society ID mismatch between dropdown and database

---

## Testing Checklist

- [ ] Society dropdown appears in Live Scorecard setup
- [ ] Dropdown shows correct handicap values for current user
- [ ] Selecting TRGG and adding player uses TRGG handicap
- [ ] Selecting Universal uses universal handicap
- [ ] Changing society dropdown updates already-added players' handicaps
- [ ] Starting round shows correct playing handicap in summary
- [ ] After round completion, both handicaps adjusted (if society selected)
- [ ] Organizer can edit society-specific handicap without changing universal

---

## How Society Handicap Selection Works

```
User Flow:
1. Open Live Scorecard
2. loadSocietyOptions() → populates dropdown with societies + handicaps
3. User selects "Travellers Rest Golf Group (HCP: 2.8)"
4. User clicks "Add Player" → selectExistingPlayer()
5. getPlayerSocietyHandicaps() → fetches that player's records
6. getHandicapForSociety() → finds TRGG record, returns 2.8
7. Player added with handicap 2.8
8. Round completes → adjustHandicapAfterRound()
9. Calculates differential once, applies to BOTH handicaps independently
10. Saves updated values to society_handicaps table
```
