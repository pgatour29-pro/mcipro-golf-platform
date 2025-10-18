# Golf Course Scorecard Verification Status
**Date:** 2025-10-18
**Task:** Verify ALL scorecard data for accuracy (yardages, stroke indexes, pars)

## Summary

- **Total Courses:** 19 SQL files
- **Verified Correct:** 5 ✅
- **Fixed:** 1 🔧
- **Needs Review:** 1 ⚠️
- **Not Yet Verified:** 12 ❓

## Verification Results

| Course | SQL File | Status | Notes |
|--------|----------|--------|-------|
| **Pattavia** | fix-pattavia-all-tees.sql | ✅ VERIFIED | Manually verified hole-by-hole (Blue 7111, White 6639, Red 5580) |
| **Bangpakong** | fix-bangpakong-all-tees.sql | ✅ VERIFIED | Manually verified all 5 tees (Black 7140, Blue 6700, White 6393, Yellow 5851, Red 5458) |
| **Bangpra International** | fix-bangpra-international-all-tees.sql | ✅ VERIFIED | All 5 tees match scorecard (Black 7405, Blue 6964, White 6496, Silver 5519, Red 5483) |
| **Burapha West** | fix-burapha-west-all-tees.sql | ✅ VERIFIED | 4 tees match scorecard (Black 7333, Blue 6641, White 6209, Red 5491) |
| **Grand Prix** | fix-grand-prix-all-tees.sql | ✅ VERIFIED | All 5 tees correct (Red 5534, Yellow 5841, White 6258, Blue 6627, Black 7111) |
| **Crystal Bay** | fix-crystal-bay-all-tees.sql | 🔧 FIXED | **CRITICAL:** Restructured from holes 19-27 to 3 course combinations (AB, AC, BC) |
| **Burapha East** | fix-burapha-east-all-tees.sql | ⚠️ NEEDS REVIEW | **ISSUE:** Multiple conflicting scorecards with different yardages |
| **Khao Kheow** | fix-khao-kheow-all-tees.sql | ❓ NOT VERIFIED | 27-hole course (AB, AC, BC combinations) |
| **Laem Chabang** | fix-laem-chabang-all-tees.sql | ❓ NOT VERIFIED | 27-hole course (Mountain+Lake, Mountain+Valley, Lake+Valley) |
| **Mountain Shadow** | fix-mountain-shadow-all-tees.sql | ❓ NOT VERIFIED | 18-hole course |
| **Pattana Golf** | fix-pattana-golf-all-tees.sql | ❓ NOT VERIFIED | 27-hole course (ANDREAS+BROOKEL, ANDREAS+CALYPSO, BROOKEL+CALYPSO) |
| **Pattaya Country Club** | fix-pattaya-country-club-all-tees.sql | ❓ NOT VERIFIED | 18-hole course |
| **Pleasant Valley** | fix-pleasant-valley-all-tees.sql | ❓ NOT VERIFIED | 18-hole course |
| **Plutaluang** | fix-plutaluang-all-tees.sql | ❓ NOT VERIFIED | 18-hole course |
| **Royal Lakeside** | fix-royal-lakeside-all-tees.sql | ❓ NOT VERIFIED | 18-hole course |
| **Siam CC Old** | fix-siam-cc-old-all-tees.sql | ❓ NOT VERIFIED | 18-hole course |
| **Siam Plantation** | fix-siam-plantation-all-tees.sql | ❓ NOT VERIFIED | 18-hole course |

## Issues Found

### 1. Crystal Bay - CRITICAL Database Constraint Violation ✅ FIXED
**Problem:** SQL file contained holes 19-27 which violate the database CHECK constraint (hole_number must be 1-18)

**Error:**
```
ERROR: 23514: new row violates check constraint "course_holes_hole_number_check"
DETAIL: Failing row contains (crystal_bay, 19, ...)
```

**Solution:** Restructured into 3 separate course_id combinations:
- `crystal_bay_ab` - Courses A+B (holes 1-18, Par 72)
- `crystal_bay_ac` - Courses A+C (holes 1-18, Par 70)
- `crystal_bay_bc` - Courses B+C (holes 1-18, Par 70)

**Commit:** `54f96ee2`

### 2. Burapha East - Conflicting Scorecard Data
**Problem:** Multiple scorecard images with different yardages:
1. `burapha.jpg` - Shows Championship/British/Men/Women tees
2. `BuraphaAC.jpg` - Shows Tournament/Championship/Men/Women tees
3. `Burapha-scorecard.jpg` - 27-hole layout with completely different data

**Status:** NEEDS CLARIFICATION from user on which scorecard is correct

**Current SQL uses:** championship, ladies, men, women tee markers
**Scorecard shows:** Tournament/Championship OR Championship/British (no "ladies")

## Next Steps

1. **User Decision Needed:** Clarify which Burapha East scorecard is correct
2. **Remaining Verifications:** Verify 12 unverified courses systematically
3. **Testing:** Run all SQL files against database to ensure no errors
4. **Documentation:** Update main documentation with verification results

## Git History

- `9143c68f` - Add yardage display to live round hole information
- `54f96ee2` - Fix Crystal Bay SQL - restructure 27-hole course into 3 combinations

## Database Schema Reference

```sql
course_holes (
    course_id VARCHAR,          -- foreign key to courses table
    hole_number INTEGER,        -- CHECK constraint: 1-18 only
    par INTEGER,
    stroke_index INTEGER,
    yardage INTEGER,
    tee_marker VARCHAR          -- lowercase: 'blue', 'white', 'red', etc.
)
```

**Critical Constraints:**
- `hole_number` MUST be 1-18 (enforced by CHECK constraint)
- `course_id` must exist in `courses` table (foreign key constraint)
- `tee_marker` values must be lowercase

## Verification Methodology

For each course:
1. Read scorecard image
2. Read SQL file
3. Verify totals match (OUT + IN = TOTAL)
4. Spot-check individual hole yardages
5. Verify stroke indexes match
6. Verify par values match
7. Check for database constraint violations

---
**Last Updated:** 2025-10-18
**Status:** In Progress (5/19 verified, 1 fixed, 1 needs review, 12 pending)
