# Rounds Data Cleanup - December 14, 2025

## Summary
Fixed duplicate rounds and missing data across multiple players. Established verification process for future round data integrity.

## Problems Fixed

### 1. Pete Park (U2b6d976f19bca4b2f4374ae0e10ed873)
**Issue:** Had 88 garbage rounds including test data and duplicates
**Fix:** Deleted all and rebuilt from verified scorecards only

| Date | Course | Gross | Stableford |
|------|--------|-------|------------|
| Dec 13 | Greenwood C+B | 77 | 34 |
| Dec 12 | Mountain Shadow | 81 | 30 |
| Dec 09 | Bangpakong | 74 | 38 |
| Dec 08 | Eastern Star | 75 | 38 |
| Dec 06 | Plutaluang | 83 | 29 |
| Dec 05 | Treasure Hill | 73 | 33 |
| Nov 13 | Society Event | 75 | 36 |
| Nov 11 | Society Event | 80 | 30 |
| Nov 08 | Society Event | 77 | 33 |
| Nov 07 | Society Event | 71 | 39 |
| Nov 05 | Society Event | 84 | 27 |

**Stats:** 11 rounds, Avg Gross 77.3, Best Gross 71, Avg Stableford 33.4, Best Stableford 39

---

### 2. Alan Thomas (U214f2fe47e1681fbb26f0aba95930d64)
**Issue:** Had 9 rounds with duplicates, missing Dec 3 Bangpakong (44 pts)
**Fix:** Rebuilt to 6 verified rounds

| Date | Course | Gross | Stableford |
|------|--------|-------|------------|
| Dec 13 | Greenwood C+B | 86 | 33 |
| Dec 12 | Mountain Shadow | 87 | 32 |
| Dec 09 | Bangpakong | 79 | 41 |
| Dec 08 | Eastern Star | 86 | 34 |
| Dec 05 | Treasure Hill | 84 | 29 |
| Dec 03 | Bangpakong | 76 | 44 |

**Stats:** 6 rounds, Avg Gross 83, Best Gross 76, Avg Stableford 35.5, Best Stableford 44

---

### 3. Tristan Gilbert (U533f2301ff76d319e0086e8340e4051c)
**Issue:** Had 10 rounds, missing Dec 3 Bangpakong (41 pts)
**Fix:** Added missing round, now 11 rounds

| Date | Course | Gross | Stableford |
|------|--------|-------|------------|
| Dec 13 | Greenwood | 95 | 26 |
| Dec 12 | Mountain Shadow | 90 | 30 |
| Dec 09 | Bangpakong | 84 | 35 |
| Dec 05 | Treasure Hill | 94 | 23 |
| Dec 04 | Pattaya CC | 81 | 33 |
| Dec 03 | Bangpakong | 78 | 41 |
| Nov 13 | Society Event | 90 | 30 |
| Nov 11 | Society Event | 97 | 23 |
| Nov 08 | Society Event | 92 | 28 |
| Nov 07 | Society Event | 90 | 29 |
| Nov 04 | Society Event | 78 | 40 |

**Stats:** 11 rounds, Best Stableford 41

---

### 4. TRGG-GUEST-0474
**Issue:** Had 11 rounds with 8 duplicates on same dates
**Fix:** Reduced to 3 unique rounds (one per date)

| Date | Gross | Stableford |
|------|-------|------------|
| Nov 07 | 75 | 35 |
| Nov 05 | 71 | 39 |
| Nov 04 | 66 | 44 |

---

### 5. U044fd835263fc6c0c596cf1d6c2414af
**Issue:** 6 rounds with test data (Gross 8)
**Fix:** Reduced to 5 verified rounds

---

### 6. U9e64d5456b0582e81743c87fa48c21e2
**Issue:** 10 rounds with duplicates and invalid stableford (57 pts)
**Fix:** Reduced to 5 unique rounds, removed impossible scores

---

## Root Causes

1. **FIX_ALL_MISSING_ROUNDS.sql** - Bulk insert script created duplicates by not checking for existing rounds
2. **Test scorecards** - Many scorecards with gross=0 or partial scores were being included
3. **Dec 3 BRC event** - The Bangpakong event on Dec 3 (event_id: 1615e7f3-ef39-4788-9428-fbce5dd2de4a) had course_name="BRC" which wasn't being recognized

## Verification Process Established

### To verify a player's rounds:
```powershell
# 1. Get scorecards with valid society event UUIDs
$scUrl = "scorecards?player_id=eq.{ID}&total_gross=gte.60"

# 2. For each scorecard, verify:
#    - event_id is a valid UUID (real society event)
#    - Calculate stableford from scores table (sum of stableford_points)
#    - Stableford must be <= 54 (max possible)

# 3. Keep only ONE round per date (avoid duplicates)
```

### Valid round criteria:
- Gross score >= 60 and <= 120
- Stableford <= 54
- Linked to society event with UUID event_id
- One round per date per player

## Scripts Created

| Script | Purpose |
|--------|---------|
| verify_pete.ps1 | Verify Pete's stableford from scores table |
| get_pete_all_valid.ps1 | Get all valid scorecards |
| get_pete_society_rounds.ps1 | Get society event scorecards only |
| run_pete_fix.ps1 | Delete and rebuild Pete's rounds |
| check_duplicates.ps1 | Find duplicate rounds across all players |
| check_all_duplicates.ps1 | Comprehensive duplicate check |
| fix_alan.ps1 | Rebuild Alan's rounds |
| fix_guest_0474.ps1 | Fix guest duplicates |
| fix_remaining_duplicates.ps1 | Fix other players |
| find_tristan.ps1 | Find Tristan's data |
| fix_tristan.ps1 | Add Tristan's missing round |

## SQL Scripts

| Script | Purpose |
|--------|---------|
| FIX_PETE_PARK_ONLY.sql | SQL to rebuild Pete's rounds |
| MERGE_BILLY_SHEPLEY.sql | Merge guest profile to LINE user |
| FIX_COURSE_NAMES.sql | Fix abbreviated course names |

## Database State After Cleanup

**Final State (verified 2025-12-14 08:52):**
- Total rounds: 70
- Players with rounds: 33
- No duplicate dates per player
- All gross scores: 60-130 range
- All stableford scores: ≤54 (valid)

### Key Players Verified:

| Player | ID | Rounds | Avg Gross | Best Gross | Avg Pts | Best Pts |
|--------|-----|--------|-----------|------------|---------|----------|
| Pete Park | U2b6d976f19bca4b2f4374ae0e10ed873 | 11 | 77.3 | 71 | 33.4 | 39 |
| Tristan Gilbert | U533f2301ff76d319e0086e8340e4051c | 11 | 88.1 | 78 | 30.7 | 41 |
| Alan Thomas | U214f2fe47e1681fbb26f0aba95930d64 | 6 | 83.0 | 76 | 35.5 | 44 |
| (unnamed) | U044fd835263fc6c0c596cf1d6c2414af | 5 | 74.4 | 70 | 32.0 | 36 |
| (test account) | U9e64d5456b0582e81743c87fa48c21e2 | 5 | 77.6 | 71 | 39.2 | 47 |
| Billy Shepley | U8e1e7241961a2747032dece7929adbde | 3 | 84.3 | 83 | 32.3 | 33 |
| TRGG-GUEST-0474 | TRGG-GUEST-0474 | 3 | 70.7 | 66 | 39.3 | 44 |

### Invalid Rounds Removed (11 total):
- TRGG-GUEST-0897: Gross 8 (test data)
- TRGG-GUEST-0961: Gross 8 (test data)
- TRGG-GUEST-0153: Gross 9 (test data)
- player_1765162093692: Gross 162 (invalid)
- 7 players with stableford 56-58 (impossible scores)

## Lessons Learned

1. **NEVER run bulk updates** without verifying each player individually first
2. **Always check scores table** for stableford - don't trust scorecard.total_stableford
3. **One fix at a time** - verify after each change before moving to next
4. **Dec 3 BRC event** is Bangpakong - course_name="BRC" is abbreviation
5. **Scorecard total_gross=0** doesn't mean invalid - calculate from hole scores
6. **Validation rules for rounds:**
   - Gross must be 60-130
   - Stableford must be ≤54
   - One round per player per date
7. **When adding missing rounds**, check ALL players who participated in that event

## Moving Forward - Data Integrity Rules

### Before inserting any round:
1. Verify scorecard exists with valid society event UUID
2. Calculate stableford from scores table (SUM of stableford_points)
3. Validate gross is 60-130
4. Validate stableford is ≤54
5. Check no existing round for same player + date

### Verification script: `verify_all_players.ps1`
Run after ANY data changes to ensure integrity

### Invalid data cleanup script: `cleanup_invalid_rounds.ps1`
Removes rounds with:
- Gross < 60 or > 130
- Stableford > 54
