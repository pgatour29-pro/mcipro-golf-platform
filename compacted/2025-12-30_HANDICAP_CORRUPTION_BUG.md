# HANDICAP CORRUPTION BUG - 2025-12-30

## INCIDENT SUMMARY
After a society event at Eastern Star on Dec 29, 2025, handicaps for Pete Park and Alan Thomas were corrupted to incorrect values.

## AFFECTED USERS
| User | Expected Universal | Actual Universal | Expected TRGG | Actual TRGG |
|------|-------------------|------------------|---------------|-------------|
| Pete Park | 3.6 | 5.0 | 2.5 | 9.9 |
| Alan Thomas | 11.1 | 11.0 | 10.9 | 10.9 |

Alan's dashboard also showed **4.0** in the morning (source unknown).

## ROOT CAUSE ANALYSIS

### The Bug
Pete's TRGG handicap jumped from **2.5 to 9.9** (+7.4) after a single round, despite the code having a **±1.0 adjustment cap per round**.

### Code Location
- `public/index.html` lines 53023-53234: `adjustHandicapAfterRound()` function
- `public/index.html` lines 53101-53125: `calculateAdjustment()` with ±1.0 cap

### The ±1.0 Cap Code (lines 53112-53123)
```javascript
// Cap adjustment to reasonable range
const maxAdjustmentPerRound = 1.0;
if (adjustment > maxAdjustmentPerRound) {
    adjustment = maxAdjustmentPerRound;
}
if (adjustment < -maxAdjustmentPerRound) {
    adjustment = -maxAdjustmentPerRound;
}
```

### Why This Shouldn't Have Happened
With a ±1.0 cap, Pete's TRGG handicap could NOT have jumped +7.4 in one round. Possible causes:
1. Multiple rounds being processed
2. The cap code not being executed
3. A different code path bypassing the adjustment logic
4. Race conditions or duplicate processing
5. Manual override somewhere

**EXACT BUG NOT IDENTIFIED** - needs further investigation.

## HANDICAP STORAGE LOCATIONS
Handicaps are stored in multiple places (potential sync issues):

1. **`society_handicaps` table** - Source of truth
   - `golfer_id` + `society_id=NULL` = Universal handicap
   - `golfer_id` + `society_id=<uuid>` = Society-specific handicap

2. **`user_profiles.profile_data.golfInfo.handicap`** - Profile display

3. **`user_profiles.profile_data.handicap`** - Legacy field

## FIX APPLIED
Created and ran `fix_handicaps_now.ps1`:

```powershell
# Pete Park - Universal 3.6
PATCH /society_handicaps?golfer_id=eq.U2b6d976f19bca4b2f4374ae0e10ed873&society_id=is.null
{ handicap_index: 3.6 }

# Pete Park - TRGG 2.5
PATCH /society_handicaps?golfer_id=eq.U2b6d976f19bca4b2f4374ae0e10ed873&society_id=eq.7c0e4b72-d925-44bc-afda-38259a7ba346
{ handicap_index: 2.5 }

# Alan Thomas - Universal 11.1
PATCH /society_handicaps?golfer_id=eq.U214f2fe47e1681fbb26f0aba95930d64&society_id=is.null
{ handicap_index: 11.1 }

# Alan Thomas - TRGG 10.9
PATCH /society_handicaps?golfer_id=eq.U214f2fe47e1681fbb26f0aba95930d64&society_id=eq.7c0e4b72-d925-44bc-afda-38259a7ba346
{ handicap_index: 10.9 }

# Also updated profile_data.golfInfo.handicap for both users
```

## VERIFICATION
After fix:
```
=== PETE PARK ===
Universal: 3.6 ✓
TRGG: 2.5 ✓

=== ALAN THOMAS ===
Universal: 11.1 ✓
TRGG: 10.9 ✓
profile_data.golfInfo.handicap: 11.1 ✓
```

## KEY IDS
- Pete LINE ID: `U2b6d976f19bca4b2f4374ae0e10ed873`
- Alan LINE ID: `U214f2fe47e1681fbb26f0aba95930d64`
- TRGG Society ID: `7c0e4b72-d925-44bc-afda-38259a7ba346`
- Event ID (Eastern Star Dec 29): `9216d987-7ccc-425b-bc86-85406bbe4b80`

## DIAGNOSTIC SCRIPTS CREATED
Located in `C:\Users\pete\Documents\MciPro\`:
- `fix_handicaps_now.ps1` - Manual fix script
- `check_alan_hcp.ps1` - Verify Alan's handicap
- `check_pete_hcp.ps1` - Verify Pete's handicap
- `check_event_players.ps1` - Check event player data
- `check_hcp_history.ps1` - Check handicap history
- `check_today_round.ps1` - Check today's round data
- `check_hcp_dupes.ps1` - Check for duplicate handicap records

## STILL NEEDS INVESTIGATION
1. **Find exact bug** - Why did +7.4 adjustment bypass ±1.0 cap?
2. **Add logging** - Log all handicap adjustments with before/after values
3. **Add alerts** - Flag any adjustment > ±1.0 as suspicious
4. **Sync check** - Ensure all handicap locations stay in sync

## RELATED DOCUMENTATION
- `compacted/03_DO_NOT_DO_THIS.md` - Contains "DO NOT TOUCH HANDICAP CODE" rule
- `compacted/HANDICAP_SYSTEM_RULES.md` - WHS-5 calculation rules
