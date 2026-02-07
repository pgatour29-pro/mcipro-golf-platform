# MciPro Handicap System - Complete Catalog
**Date: February 7, 2026**
**Supabase Project: `pyeeplwsnupmhgbguwqs`**

---

## 1. ARCHITECTURE OVERVIEW

```
Round Completed
      |
      v
[DB Trigger: trigger_auto_update_society_handicaps]
      |
      +---> calculate_society_hcp(golfer, society)  --> society_handicaps (per society)
      |         Best 3-of-5 society rounds
      |         NO 0.96 multiplier
      |
      +---> calculate_universal_hcp(golfer)         --> society_handicaps (universal, society_id=NULL)
                Best 8-of-20 all rounds
                WITH 0.96 multiplier
      |
      v
[Frontend: adjustHandicapAfterRound()]
      |
      +---> Reads trigger results from society_handicaps (500ms delay)
      +---> Syncs to user_profiles.handicap_index
      +---> Syncs to localStorage + UI
```

---

## 2. SOCIETIES

| ID | Name |
|----|------|
| `7c0e4b72-d925-44bc-afda-38259a7ba346` | Travellers Rest Golf Group |
| `72d8444a-56bf-4441-86f2-22087f0e6b27` | JOA Golf Pattaya |

---

## 3. PLAYER HANDICAPS (Manually Set - Feb 7, 2026)

| Player | Golfer ID | Travellers Rest | Universal | TR Method | Uni Method |
|--------|-----------|----------------|-----------|-----------|------------|
| Pete Park | `U2b6d976f19bca4b2f4374ae0e10ed873` | 1.4 | 2.5 | WHS-8of20 | WHS-5 |
| Rocky Jones | `U044fd835263fc6c0c596cf1d6c2414af` | -2.0 (+2.0) | -1.6 (+1.6) | WHS-3of5 | WHS-8of20 |
| Tristan Gilbert | `U533f2301ff76d319e0086e8340e4051c` | 12.4 | 13.4 | WHS-8of20 | WHS-5 |
| Alan Thomas | `U214f2fe47e1681fbb26f0aba95930d64` | 8.5 | 8.6 | WHS-8of20 | WHS-5 |

**Note:** These are manually set values. The trigger will overwrite them on the next completed round.

**Note:** Plus handicaps are stored as negative numbers (e.g., +2.0 = -2.0 in DB).

---

## 4. ACTIVE DATABASE FUNCTIONS

### 4.1 calculate_society_hcp(TEXT, UUID)
- **Purpose:** Calculate a golfer's handicap for a specific society
- **Formula:** Best 3-of-5 society-only rounds, NO 0.96 multiplier
- **Round selection:** `5+ rounds = best 3, 4 = best 2, 3 = best 2, 1-2 = best 1`
- **Filters:**
  - `status = 'completed'`
  - `total_gross IS NOT NULL`
  - `total_gross >= 40` (filters test rounds)
  - `completed_at IS NOT NULL` (filters incomplete rounds)
  - Round must be linked to society via `round_societies` or `primary_society_id`
- **Course rating lookup:** `get_tee_rating_from_course()` with fallback chain
- **Returns:** `(new_handicap_index, rounds_used, all_differentials, best_differentials)`

### 4.2 calculate_universal_hcp(TEXT)
- **Purpose:** Calculate a golfer's universal handicap across all rounds
- **Formula:** Best 8-of-20 all rounds, WITH 0.96 multiplier
- **Round selection:** Best `min(8, available)` of last 20 qualifying rounds
- **Filters:** Same as society_hcp but without society filter
- **Returns:** `(new_handicap_index, rounds_used, all_differentials, best_differentials)`

### 4.3 auto_update_society_handicaps_on_round() [TRIGGER]
- **Fires:** AFTER INSERT OR UPDATE OF `status, total_gross, tee_marker, primary_society_id` ON `rounds`
- **Condition:** `NEW.status = 'completed' AND NEW.total_gross IS NOT NULL`
- **Actions:**
  1. For each society (via `primary_society_id`, `round_societies`, `society_members`): calls `calculate_society_hcp`, writes to `society_handicaps` with method `'WHS-3of5'`
  2. For universal: calls `calculate_universal_hcp`, writes to `society_handicaps` (society_id=NULL) with method `'WHS-8of20'`
- **Error handling:** Triple-nested EXCEPTION blocks - handicap errors never prevent round saves
- **Write pattern:** DELETE-then-INSERT (handles NULL society_id correctly)

### 4.4 get_tee_rating_from_course(TEXT, TEXT, DECIMAL?, DECIMAL?)
- **Purpose:** Look up course rating and slope for a given tee
- **Two overloads:**
  1. `(course_id, tee_marker)` - Basic: courses.tees JSON lookup, fallback 72/113
  2. `(course_id, tee_marker, round_cr, round_sr)` - Extended: courses.tees -> round stored values -> 72/113
- **Used by:** `calculate_society_hcp` and `calculate_universal_hcp` (extended version)

### 4.5 update_society_handicap(TEXT, UUID, DECIMAL, INTEGER, JSONB, JSONB)
- **Purpose:** Write a handicap value to society_handicaps
- **Pattern:** DELETE existing + INSERT new (handles NULL society_id)
- **Status:** LEGACY - no longer called by trigger (trigger does its own DELETE+INSERT)

---

## 5. LEGACY/UNUSED FUNCTIONS (Candidates for cleanup)

| Function | Args | Status |
|----------|------|--------|
| `calculate_handicap_index` | (golfer_id TEXT) | OLD - original simple handicap calc |
| `calculate_society_handicap_index` | (golfer_id TEXT, society_id UUID) | OLD - best 3-of-5, different CR lookup |
| `calculate_whs_handicap_index` | (golfer_id TEXT) | OLD - WHS 8-of-20, no society filter |
| `calculate_whs_handicap_index` | (golfer_id TEXT, society_id UUID) | OLD - overloaded version |
| `update_society_handicap_whs` | (golfer_id TEXT, society_id UUID) | OLD - called old calc functions |
| `update_player_handicap` | (golfer_id, handicap, round_id, diffs, rounds_used, best_diffs) | OLD - wrote to user_profiles directly |
| `get_course_rating_for_tee` | (course_id TEXT, tee_marker TEXT) | OLD - basic version without fallbacks |
| `update_society_handicap` | (golfer_id, society_id, handicap, rounds, all_diffs, best_diffs) | SEMI-LEGACY - still exists, not called by current trigger |

---

## 6. TRIGGERS ON public.rounds

| Trigger | Status | Fires On | Function |
|---------|--------|----------|----------|
| `trigger_auto_update_society_handicaps` | ENABLED | AFTER INSERT OR UPDATE OF status, total_gross, tee_marker, primary_society_id | `auto_update_society_handicaps_on_round()` |
| `trigger_update_buddy_stats` | ENABLED | AFTER INSERT OR UPDATE OF status | `update_buddy_play_stats()` |

---

## 7. SUPABASE MIGRATIONS (Handicap-Related)

| Version | Name | Description |
|---------|------|-------------|
| 20251225083000 | `handicap_sync_trigger` | Original trigger setup |
| 20260207020142 | `fix_handicap_calculations` | Created `calculate_society_hcp` (3-of-5, society-filtered) and `calculate_universal_hcp` (8-of-20, all rounds). Fixed trigger to use new functions. |
| 20260207020306 | `fix_handicap_formulas_v2` | Fixed type mismatch (UUID vs TEXT for course_id in helper function) |
| 20260207021331 | `fix_null_tee_marker_rounds` | Removed `tee_marker IS NOT NULL` filter. Created extended `get_tee_rating_from_course` with round CR/SR fallback. |
| 20260207021744 | `fix_round_data_quality_filters` | Added `completed_at IS NOT NULL` and `total_gross >= 40` filters to both calc functions |
| 20260207021822 | `fix_column_names_in_hcp_functions` | Fixed column references (`course_rating`/`slope_rating` not `cr`/`sr`) |
| 20260207022024 | `add_missing_course_tee_data` | Added estimated tee data for burapha and green_valley_rayong |
| 20260207022116 | `revert_course_tee_data` | Reverted: estimated data broke confirmed handicap values |

---

## 8. FRONTEND CHANGE (Deployed to Vercel)

**Commit:** `dcf69a9d` - "Fix: Remove frontend handicap overwrite - let DB trigger be single source of truth"

**What was removed (~267 lines):**
- `adjustHandicapAfterRound()` method that calculated its own handicap using:
  - Incremental formula: `(differential - currentHcp) * 0.2` capped at +/-1.0
  - General Play Reduction (GPR): -1.0 for tier1, -2.0 for tier2
  - DELETE+INSERT into `society_handicaps` with method 'WHS-5-GPR'
- `saveSocietyHandicapFallback()` helper method

**What replaced it:**
- Read-only sync function that:
  1. Waits 500ms for DB trigger to complete
  2. Reads `society_handicaps` for the golfer
  3. Syncs universal handicap to `user_profiles.handicap_index`
  4. Syncs to localStorage and UI display
  5. Does NOT calculate or write any handicap values

---

## 9. ROUND DATA QUALITY

| Metric | Count |
|--------|-------|
| Total rounds | 128 |
| Completed | 128 |
| With gross score | 128 |
| Valid score (>= 40) | 122 |
| **Fully qualifying** (valid + has completed_at) | **55** |
| Filtered: test rounds (< 40) | 6 |
| Missing completed_at | 67 |
| Missing tee_marker | 67 |
| Missing course_id | 73 |

**Key insight:** Only 55 of 128 rounds (43%) are fully qualifying for handicap calculation. The majority (67) have no `completed_at` timestamp and no `tee_marker`.

---

## 10. COURSE DATA GAPS

Courses with empty tees `[]` that are used in completed rounds:

| Course ID | Name | Rounds Using It |
|-----------|------|----------------|
| `burapha` | Burapha Golf Club | 4 |
| `green_valley_rayong` | Green Valley Rayong Country Club | 5 |

**Impact:** These 9 rounds use fallback CR=72.0/SR=113.0 instead of actual course ratings. The sub-courses `burapha_east` and `burapha_west` have full tee data but rounds reference the generic `burapha` ID.

---

## 11. SCORE DIFFERENTIAL FORMULA

```
Differential = (Gross Score - Course Rating) x 113 / Slope Rating
```

**Course Rating Lookup Priority:**
1. `courses.tees` JSON (matched by tee_marker name, case-insensitive)
2. Round's stored `course_rating` / `slope_rating`
3. Fallback: 72.0 / 113.0

---

## 12. SQL FILES IN PROJECT (Handicap-Related)

| File | Purpose |
|------|---------|
| `create_automatic_handicap_system.sql` | Original WHS 3-of-5 system (SUPERSEDED) |
| `multi-society-handicap-system.sql` | Multi-society handicap with junction tables (SUPERSEDED) |
| `whs_8of20_handicap_function.sql` | WHS 8-of-20 calculation (SUPERSEDED) |
| `FIX_TRIGGER_FEB4_2026.sql` | Fixed NULL society_id unique constraint |
| `fix_handicap_trigger_scorecards.sql` | Trigger fixes for scorecards |
| `fix_rounds_for_handicap_trigger.sql` | Round table fixes for trigger |
| `fix_rocky_jones_handicap.sql` | Manual Rocky Jones HCP fix |
| `fix_all_corrupted_handicaps.sql` | Bulk handicap corruption fix |
| `backup_handicaps.sql` | Handicap backup script |
| `fix_pete_handicap_complete.sql` | Pete Park HCP fix |
| `fix_alan_ryan_pluto_handicaps.sql` | Alan/Ryan/Pluto HCP fixes |
| `fix_universal_handicap_every_3_rounds.sql` | Universal HCP recalc frequency fix |
| `check_handicaps.sql` | Diagnostic: check handicap values |
| `check_handicaps_simple.sql` | Diagnostic: simple handicap check |

---

## 13. KNOWN ISSUES / FUTURE WORK

1. **Course data gaps:** `burapha` and `green_valley_rayong` have empty tees. Need authoritative course ratings to populate.

2. **67 rounds with no completed_at:** These rounds are filtered out of handicap calculations. They appear to be older/legacy rounds that were marked completed without full metadata.

3. **Calculated vs manual values diverge:** The functions produce reasonable but slightly different values than user-set handicaps due to default CR/SR on rounds. On next round completion, trigger will overwrite manual values with calculated ones.

4. **Legacy function cleanup:** 7+ unused functions remain in the database. Can be dropped to reduce confusion.

5. **`burapha` course ID ambiguity:** Rounds reference generic `burapha` but the actual courses are `burapha_east` and `burapha_west`. App should select the specific sub-course.

6. **Round `course_rating` defaults:** Many rounds store 72.00/113.00 as defaults even when the actual course has different ratings. The app should store the real CR/SR from the courses table when saving a round.
