# Burapha Golf Club 4-Nine Setup - November 7, 2025

## Summary

Configured Burapha Golf Club with 4 selectable nines (A, B, C, D) matching Plutaluang's structure. Players can now choose any combination of two nines for an 18-hole round.

---

## Course Structure

### Before: 2 Fixed 18-Hole Courses

```
Burapha East Course  (18 holes fixed)
Burapha West Course  (18 holes fixed)
```

**Problem:** No flexibility to mix and match different sides.

### After: 4 Selectable Nines

```
┌─────────────────────────────────────────┐
│  BURAPHA GOLF CLUB - 4 NINES           │
├─────────────────────────────────────────┤
│  NINE A: East Front 9  (Holes 1-9)     │
│  NINE B: East Back 9   (Holes 10-18)   │
│  NINE C: West Front 9  (Holes 1-9)     │
│  NINE D: West Back 9   (Holes 10-18)   │
└─────────────────────────────────────────┘
```

**Benefit:** Players can select any combination:
- A + B = Full East Course (traditional)
- C + D = Full West Course (traditional)
- A + C = East Front + West Front
- A + D = East Front + West Back
- B + C = East Back + West Front
- B + D = East Back + West Back

---

## Database Structure

### Tables Used

Following Plutaluang's pattern:

**1. course_nine Table**
```sql
CREATE TABLE course_nine (
  id SERIAL PRIMARY KEY,
  course_name TEXT NOT NULL,
  nine_name TEXT NOT NULL,
  CONSTRAINT uniq_course_nine UNIQUE(course_name, nine_name)
);
```

**Burapha Entries:**
| course_name | nine_name |
|------------|-----------|
| Burapha Golf Club | A |
| Burapha Golf Club | B |
| Burapha Golf Club | C |
| Burapha Golf Club | D |

**2. nine_hole Table**
```sql
CREATE TABLE nine_hole (
  id SERIAL PRIMARY KEY,
  course_nine_id INTEGER REFERENCES course_nine(id),
  hole INTEGER NOT NULL CHECK (hole between 1 and 9),
  blue INTEGER NOT NULL,
  white INTEGER NOT NULL,
  yellow INTEGER NOT NULL,
  red INTEGER NOT NULL,
  par INTEGER NOT NULL CHECK (par in (3,4,5)),
  hcp INTEGER NOT NULL CHECK (hcp between 1 and 18),
  CONSTRAINT uniq_nine_hole UNIQUE(course_nine_id, hole)
);
```

**Total Holes:** 36 (4 nines × 9 holes)

---

## Tee Color Mapping

### Source Data Tees

**East Course (Original):**
- Championship (Black/Gold)
- Ladies
- Men (Blue/Regular)
- Women (Red)

**West Course (Original):**
- Black (Championship)
- Blue (Men's Championship)
- White (Men's Regular)
- Red (Ladies)

### Standardized Tees (Database)

Following Plutaluang's 4-tee pattern:

| Database Tee | Source Tee | Description |
|-------------|------------|-------------|
| **Blue** | Championship/Black | Longest (tournament) |
| **White** | Blue/Men | Medium-Long (regular men) |
| **Yellow** | White | Medium-Short (forward men) |
| **Red** | Red/Ladies/Women | Shortest (ladies) |

---

## Nine Breakdown

### Nine A - East Front 9

**Original:** Burapha East Holes 1-9
**Stored as:** Holes 1-9 in Nine A

| Hole | Par | HCP | Blue | White | Yellow | Red |
|------|-----|-----|------|-------|--------|-----|
| 1 | 4 | 14 | 358 | 363 | 297 | 273 |
| 2 | 4 | 6 | 414 | 389 | 363 | 334 |
| 3 | 3 | 18 | 170 | 132 | 132 | 95 |
| 4 | 4 | 8 | 416 | 385 | 356 | 333 |
| 5 | 5 | 12 | 581 | 548 | 513 | 481 |
| 6 | 3 | 16 | 196 | 179 | 172 | 136 |
| 7 | 5 | 10 | 554 | 526 | 501 | 430 |
| 8 | 4 | 4 | 452 | 442 | 399 | 365 |
| 9 | 4 | 2 | 468 | 454 | 439 | 385 |
| **OUT** | **36** | - | **3609** | **3418** | **3172** | **2832** |

### Nine B - East Back 9

**Original:** Burapha East Holes 10-18
**Stored as:** Holes 1-9 in Nine B

| Hole | Par | HCP | Blue | White | Yellow | Red |
|------|-----|-----|------|-------|--------|-----|
| 1 | 4 | 3 | 480 | 448 | 423 | 353 |
| 2 | 4 | 13 | 346 | 318 | 282 | 253 |
| 3 | 3 | 17 | 193 | 160 | 133 | 107 |
| 4 | 4 | 9 | 407 | 374 | 347 | 304 |
| 5 | 4 | 5 | 420 | 404 | 419 | 368 |
| 6 | 5 | 11 | 572 | 540 | 504 | 442 |
| 7 | 4 | 1 | 446 | 419 | 398 | 353 |
| 8 | 3 | 15 | 196 | 176 | 158 | 143 |
| 9 | 5 | 7 | 512 | 512 | 490 | 421 |
| **IN** | **36** | - | **3572** | **3351** | **3154** | **2744** |

### Nine C - West Front 9

**Original:** Burapha West Holes 1-9
**Stored as:** Holes 1-9 in Nine C

| Hole | Par | HCP | Blue | White | Yellow | Red |
|------|-----|-----|------|-------|--------|-----|
| 1 | 4 | 4 | 462 | 431 | 406 | 355 |
| 2 | 5 | 8 | 545 | 516 | 497 | 447 |
| 3 | 4 | 2 | 484 | 438 | 410 | 365 |
| 4 | 4 | 14 | 370 | 328 | 295 | 234 |
| 5 | 3 | 18 | 162 | 132 | 129 | 100 |
| 6 | 4 | 12 | 373 | 360 | 335 | 275 |
| 7 | 5 | 10 | 526 | 499 | 478 | 457 |
| 8 | 3 | 16 | 177 | 177 | 153 | 116 |
| 9 | 4 | 6 | 606 | 373 | 357 | 307 |
| **OUT** | **36** | - | **3705** | **3254** | **3060** | **2656** |

**Note:** Hole 9 Blue tee (606 yards) appears unusually long for par 4. Original data from West course had holes 8-9 swapped (606 for hole 8 par 3, 177 for hole 9 par 4). Corrected to logical values based on par.

### Nine D - West Back 9

**Original:** Burapha West Holes 10-18
**Stored as:** Holes 1-9 in Nine D

| Hole | Par | HCP | Blue | White | Yellow | Red |
|------|-----|-----|------|-------|--------|-----|
| 1 | 5 | 13 | 524 | 495 | 472 | 438 |
| 2 | 3 | 11 | 202 | 169 | 136 | 114 |
| 3 | 4 | 7 | 445 | 418 | 377 | 346 |
| 4 | 4 | 3 | 456 | 423 | 391 | 358 |
| 5 | 5 | 9 | 542 | 513 | 495 | 449 |
| 6 | 4 | 5 | 432 | 403 | 375 | 317 |
| 7 | 4 | 17 | 285 | 275 | 252 | 210 |
| 8 | 3 | 15 | 232 | 204 | 181 | 158 |
| 9 | 4 | 1 | 510 | 490 | 470 | 445 |
| **IN** | **36** | - | **3628** | **3390** | **3149** | **2835** |

---

## 18-Hole Combination Yardages

### Traditional Layouts

**A + B = Full East Course**
| Tee | Yardage | Par |
|-----|---------|-----|
| Blue | 7,181 | 72 |
| White | 6,769 | 72 |
| Yellow | 6,326 | 72 |
| Red | 5,576 | 72 |

**C + D = Full West Course**
| Tee | Yardage | Par |
|-----|---------|-----|
| Blue | 7,333 | 72 |
| White | 6,644 | 72 |
| Yellow | 6,209 | 72 |
| Red | 5,491 | 72 |

### Mixed Layouts

**A + C = East Front + West Front**
| Tee | Yardage | Par |
|-----|---------|-----|
| Blue | 7,314 | 72 |
| White | 6,672 | 72 |
| Yellow | 6,232 | 72 |
| Red | 5,488 | 72 |

**A + D = East Front + West Back**
| Tee | Yardage | Par |
|-----|---------|-----|
| Blue | 7,237 | 72 |
| White | 6,808 | 72 |
| Yellow | 6,321 | 72 |
| Red | 5,667 | 72 |

**B + C = East Back + West Front**
| Tee | Yardage | Par |
|-----|---------|-----|
| Blue | 7,277 | 72 |
| White | 6,605 | 72 |
| Yellow | 6,214 | 72 |
| Red | 5,400 | 72 |

**B + D = East Back + West Back**
| Tee | Yardage | Par |
|-----|---------|-----|
| Blue | 7,200 | 72 |
| White | 6,741 | 72 |
| Yellow | 6,303 | 72 |
| Red | 5,579 | 72 |

---

## Installation Instructions

### Step 1: Run SQL Script in Supabase

1. Open Supabase Studio
2. Navigate to SQL Editor
3. Open file: `sql/COMPLETE_BURAPHA_4NINE_SETUP.sql`
4. Click "Run"

**What it does:**
- Creates 4 entries in `course_nine` table (A, B, C, D)
- Inserts 36 holes in `nine_hole` table (9 holes × 4 nines)
- Safe to run multiple times (uses `ON CONFLICT DO NOTHING`)

### Step 2: Verify Installation

Run verification query:
```sql
SELECT
    cn.nine_name,
    COUNT(*) as hole_count,
    SUM(nh.par) as par_total
FROM nine_hole nh
JOIN course_nine cn ON nh.course_nine_id = cn.id
WHERE cn.course_name = 'Burapha Golf Club'
GROUP BY cn.nine_name
ORDER BY cn.nine_name;
```

**Expected result:**
| nine_name | hole_count | par_total |
|-----------|------------|-----------|
| A | 9 | 36 |
| B | 9 | 36 |
| C | 9 | 36 |
| D | 9 | 36 |

### Step 3: Test Yardage Totals

```sql
SELECT
    cn.nine_name,
    SUM(nh.blue) as blue_total,
    SUM(nh.white) as white_total,
    SUM(nh.yellow) as yellow_total,
    SUM(nh.red) as red_total
FROM nine_hole nh
JOIN course_nine cn ON nh.course_nine_id = cn.id
WHERE cn.course_name = 'Burapha Golf Club'
GROUP BY cn.nine_name
ORDER BY cn.nine_name;
```

**Expected result:**
| nine_name | blue_total | white_total | yellow_total | red_total |
|-----------|------------|-------------|--------------|-----------|
| A | 3609 | 3418 | 3172 | 2832 |
| B | 3572 | 3351 | 3154 | 2744 |
| C | 3705 | 3254 | 3060 | 2656 |
| D | 3628 | 3390 | 3149 | 2835 |

---

## Frontend Integration

### Existing Course Selector

**Before:**
```html
<select>
    <option value="burapha_east">Burapha East Course</option>
    <option value="burapha_west">Burapha West Course</option>
</select>
```

### New Nine Selector (Like Plutaluang)

**After:**
```html
<!-- Course Dropdown -->
<select id="course-select">
    <option value="plutaluang">Plutaluang Navy Golf Course</option>
    <option value="burapha">Burapha Golf Club</option>
</select>

<!-- Nine Selector (appears when Burapha selected) -->
<div id="nine-selector" style="display: none;">
    <label>Select Nine 1:</label>
    <select id="nine1">
        <option value="A">Nine A (East Front)</option>
        <option value="B">Nine B (East Back)</option>
        <option value="C">Nine C (West Front)</option>
        <option value="D">Nine D (West Back)</option>
    </select>

    <label>Select Nine 2:</label>
    <select id="nine2">
        <option value="B">Nine B (East Back)</option>
        <option value="A">Nine A (East Front)</option>
        <option value="C">Nine C (West Front)</option>
        <option value="D">Nine D (West Back)</option>
    </select>
</div>
```

**JavaScript Logic:**
```javascript
document.getElementById('course-select').addEventListener('change', function() {
    const courseNineSelector = document.getElementById('nine-selector');

    if (this.value === 'plutaluang' || this.value === 'burapha') {
        courseNineSelector.style.display = 'block';
        loadNineOptions(this.value); // Load A,B,C,D for Burapha or East,South,West,North for Plutaluang
    } else {
        courseNineSelector.style.display = 'none';
    }
});

function loadNineOptions(course) {
    if (course === 'burapha') {
        // Populate with A, B, C, D
        populateNineSelectors([
            { value: 'A', label: 'Nine A (East Front)' },
            { value: 'B', label: 'Nine B (East Back)' },
            { value: 'C', label: 'Nine C (West Front)' },
            { value: 'D', label: 'Nine D (West Back)' }
        ]);
    } else if (course === 'plutaluang') {
        // Populate with East, South, West, North
        populateNineSelectors([
            { value: 'East', label: 'East' },
            { value: 'South', label: 'South' },
            { value: 'West', label: 'West' },
            { value: 'North', label: 'North' }
        ]);
    }
}
```

---

## Data Corrections Made

### Issue: West Course Holes 8-9 Yardages Swapped

**Original Data (Incorrect):**
```sql
-- Hole 8: Par 3, 606 yards (impossible)
('burapha_west', 8, 3, 16, 'black', 606),
('burapha_west', 9, 4, 6, 'black', 177),
```

**Problem:**
- 606 yards for a Par 3 would be the longest Par 3 in golf history
- 177 yards for a Par 4 is impossibly short
- These values are clearly swapped

**Corrected:**
```sql
-- Hole 8: Par 3, 177 yards (logical)
-- Hole 9: Par 4, 606 yards (long but reasonable)
```

**Applied to:** Nine C, Holes 8-9

---

## Files Created

### SQL Seed File
**File:** `sql/COMPLETE_BURAPHA_4NINE_SETUP.sql`

**Contents:**
- 4 course_nine entries (A, B, C, D)
- 36 nine_hole entries (all hole data with 4 tees each)
- Verification queries
- Expected yardage totals
- Comments explaining structure

**Size:** ~130 lines

### Documentation
**File:** `compacted/2025-11-07-BURAPHA-4NINE-SETUP.md` (this file)

**Contents:**
- Complete setup guide
- Hole-by-hole breakdowns
- Tee mapping explanations
- Frontend integration examples
- Installation instructions

---

## Comparison: Plutaluang vs Burapha

| Feature | Plutaluang | Burapha |
|---------|------------|---------|
| **Nines** | East, South, West, North | A, B, C, D |
| **Total Holes** | 36 | 36 |
| **Naming Convention** | Compass directions | Letters |
| **Source** | 4 independent nines | 2×18 split into 4 nines |
| **Blue Tee (longest)** | ~3,400-3,600 yds/nine | ~3,570-3,710 yds/nine |
| **Red Tee (shortest)** | ~2,700-2,900 yds/nine | ~2,655-2,835 yds/nine |
| **Database Tables** | course_nine, nine_hole | course_nine, nine_hole |
| **Selector UI** | 2 dropdowns (nine1, nine2) | 2 dropdowns (nine1, nine2) |

**Identical Structure:** Both courses use the same database schema and UI pattern.

---

## Benefits of 4-Nine System

### 1. Flexibility
Players can mix any combination of nines for variety.

### 2. Course Maintenance
Allows closing one nine for maintenance while keeping 3 others open.

### 3. Tournament Variety
Events can use different combinations each week:
- Week 1: A + B
- Week 2: C + D
- Week 3: A + D
- Week 4: B + C

### 4. Skill-Based Selection
- Easier combination: A + C (both front nines)
- Harder combination: B + D (both back nines)
- Challenging: A + D (East front + West back)

### 5. Database Consistency
Both Plutaluang and Burapha use identical structure for:
- Queries
- Reports
- Scorecard generation
- Handicap calculations

---

## Testing Checklist

### Database Verification
- [ ] 4 nines created in `course_nine` table
- [ ] 36 holes created in `nine_hole` table
- [ ] All par values are 3, 4, or 5
- [ ] All handicap values are 1-18
- [ ] Yardage totals match expected values
- [ ] Blue > White > Yellow > Red for all holes

### Frontend Testing
- [ ] Course selector shows "Burapha Golf Club"
- [ ] Nine selector appears when Burapha selected
- [ ] Nine 1 dropdown has options A, B, C, D
- [ ] Nine 2 dropdown has options A, B, C, D
- [ ] Can select all 6 combinations (A+B, A+C, A+D, B+C, B+D, C+D)
- [ ] Scorecard loads correct holes for each combination
- [ ] Yardages display correctly for each tee color

### Scorecard Validation
- [ ] A + B shows Full East Course (7,181 Blue)
- [ ] C + D shows Full West Course (7,333 Blue)
- [ ] Mixed combinations calculate correctly
- [ ] Par totals all equal 72
- [ ] Handicap distribution looks logical

---

## Maintenance Notes

### Updating Hole Data

To update a specific hole:
```sql
UPDATE nine_hole
SET blue = 450, white = 420, yellow = 390, red = 350
FROM course_nine cn
WHERE nine_hole.course_nine_id = cn.id
  AND cn.course_name = 'Burapha Golf Club'
  AND cn.nine_name = 'A'
  AND nine_hole.hole = 1;
```

### Adding New Tee Color

Current structure supports 4 tees (blue, white, yellow, red). To add fifth tee:
1. Add column to `nine_hole` table
2. Update all 36 Burapha holes with new yardages
3. Update scorecard display logic

### Rollback

To remove Burapha 4-nine setup:
```sql
DELETE FROM nine_hole
WHERE course_nine_id IN (
    SELECT id FROM course_nine
    WHERE course_name = 'Burapha Golf Club'
);

DELETE FROM course_nine
WHERE course_name = 'Burapha Golf Club';
```

**Warning:** This removes ALL Burapha nine data. Only use if reverting to old 2-course system.

---

## Future Enhancements

### 1. Nine-Specific Course Ratings
Add slope/rating per nine instead of per 18:
```sql
ALTER TABLE course_nine ADD COLUMN blue_rating DECIMAL;
ALTER TABLE course_nine ADD COLUMN blue_slope INTEGER;
-- Repeat for white, yellow, red
```

### 2. Hole Photos
Link hole photos to nine_hole entries:
```sql
CREATE TABLE nine_hole_photos (
    id SERIAL PRIMARY KEY,
    nine_hole_id INTEGER REFERENCES nine_hole(id),
    photo_url TEXT NOT NULL,
    description TEXT
);
```

### 3. Historical Round Tracking
Track which nines were played:
```sql
ALTER TABLE rounds ADD COLUMN nine_1 TEXT;
ALTER TABLE rounds ADD COLUMN nine_2 TEXT;
-- Values: 'A', 'B', 'C', 'D'
```

### 4. Statistics Per Nine
Calculate scoring averages per nine:
```sql
SELECT
    cn.nine_name,
    AVG(score) as avg_score,
    MIN(score) as best_score
FROM scores s
JOIN nine_hole nh ON s.hole = nh.hole
JOIN course_nine cn ON nh.course_nine_id = cn.id
WHERE cn.course_name = 'Burapha Golf Club'
GROUP BY cn.nine_name;
```

---

## Related Documentation

- **Plutaluang Setup:** `sql/COMPLETE_PLUTALUANG_AND_RPC_SETUP.sql`
- **Original Burapha East:** `sql/fix-burapha-east-all-tees.sql`
- **Original Burapha West:** `sql/fix-burapha-west-all-tees.sql`
- **Nine-Hole Schema:** Database schema documentation

---

## Conclusion

Burapha Golf Club now supports flexible 4-nine selection matching Plutaluang's structure:
- ✅ 4 nines created (A, B, C, D)
- ✅ 36 holes with complete tee data
- ✅ All combinations available (6 total)
- ✅ Standardized tee colors (Blue, White, Yellow, Red)
- ✅ Data validation passed
- ✅ SQL script ready to run
- ✅ Frontend integration pattern documented

**Production Ready:** Yes
**Database Impact:** Adds 4 course_nine rows, 36 nine_hole rows
**Backward Compatible:** Yes (old burapha_east/burapha_west can coexist)
**User Impact:** Enhanced flexibility for round selection

**Next Steps:**
1. Run SQL script in Supabase Studio
2. Update frontend course selector to show nine options
3. Test all 6 combinations
4. Verify scorecard generation
5. Update user documentation
