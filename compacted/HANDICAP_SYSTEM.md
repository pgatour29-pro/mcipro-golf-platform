# Handicap System - Single Source of Truth

## Problem
Handicaps were stored in multiple locations that got out of sync:
1. `user_profiles.profile_data.golfInfo.handicap` - used by header
2. `user_profiles.profile_data.handicap` - legacy field
3. `society_handicaps` table - universal + society-specific

## Solution: HandicapManager Class

**Location:** `public/index.html` lines 10897-11046

```javascript
class HandicapManager {
    // Get handicap - ALWAYS from society_handicaps (source of truth)
    static async getHandicap(golferId, societyId = null)

    // Format for display (+1.0 for plus handicaps)
    static formatDisplay(handicap)

    // Parse string to number (handles "+1.0" format)
    static parseHandicap(handicapStr)

    // Set handicap - updates ALL locations atomically
    static async setHandicap(golferId, handicapValue, societyId = null, method = 'MANUAL')

    // Sync all locations for a player
    static async syncAll(golferId)
}
```

## Storage Locations

### 1. society_handicaps table (SOURCE OF TRUTH)
- `golfer_id` - player LINE ID
- `society_id` - null for universal, UUID for society-specific
- `handicap_index` - numeric value (negative for plus handicaps)
- `calculation_method` - 'MANUAL', 'WHS-5', 'WHS-5-GPR', 'SYNC'

### 2. user_profiles.profile_data
- `profile_data.handicap` - legacy string field
- `profile_data.golfInfo.handicap` - canonical string field
- `profile_data.golfInfo.lastHandicapUpdate` - ISO timestamp

### 3. AppState (runtime)
- `AppState.currentUser.handicap`
- `AppState.currentUser.profile_data.handicap`
- `AppState.currentUser.profile_data.golfInfo.handicap`

## Plus Handicap Handling
- Stored as NEGATIVE numbers in society_handicaps: +1.0 = -1.0
- Stored as STRING with "+" prefix in profiles: "+1.0"
- Display formatted with "+" prefix: +1.0

## Automatic Handicap Adjustment
**Location:** `adjustHandicapAfterRound()` lines 52729-52996

After each round:
1. Calculates differential: `(gross - courseRating) * (113 / slope)`
2. Applies 20% adjustment capped at ±1.0
3. Applies General Play Reduction if applicable:
   - Tier 1: 40 stableford or -4 under = -1.0
   - Tier 2: 41+ stableford or -5 under = -2.0
4. Updates society_handicaps table
5. Updates profile_data (both fields)
6. Updates AppState
7. Updates UI elements

## Validation
**Function:** `window.validateAutoHandicap(handicap, source)`
- Floors at 0 (auto-calc cannot create plus handicaps)
- Caps at 54 (WHS maximum)
- Rounds to 1 decimal place

## Live Scorecard Handicap Flow
**Updated: 2025-12-27**

When starting a round, handicaps must be correct for the selected society:

### Flow
1. User adds players → uses current society selection for handicap
2. User may change society dropdown → `onSocietyChanged()` updates player handicaps
3. User clicks "Start Round" → **NEW: Handicap refresh before scorecard creation**
4. Scorecards created with correct society handicap

### Key Functions
| Function | Line | Purpose |
|----------|------|---------|
| `selectExistingPlayer()` | 50421 | Adds player with handicap |
| `getHandicapForSociety()` | 48555 | Finds correct handicap for society |
| `onSocietyChanged()` | 48619 | Updates handicaps when dropdown changes |
| `startRound()` refresh | 51143 | **CRITICAL:** Re-verifies all handicaps before creating scorecards |

### Bug Fixed (2025-12-27)
Pete Park had:
- Universal: 3.6 → `Math.round(3.6) = 4` strokes
- Travellers Rest: 2.5 → `Math.round(2.5) = 3` strokes

System was using 3.6 instead of 2.5 when starting round, causing -4 strokes instead of -3.

## Files Modified
- `public/index.html` - HandicapManager class, all save functions, startRound() refresh
