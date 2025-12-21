# Treasure Hill Golf & Country Club - Course Setup

**Date:** December 21, 2025
**Task:** Add Treasure Hill course to Live Scorecard with hole layouts

---

## Course Details

| Property | Value |
|----------|-------|
| Course ID | `treasure_hill` |
| Name | Treasure Hill Golf & Country Club |
| Location | Chonburi, Thailand |
| Total Holes | 18 |
| Par | 72 (Out 36, In 36) |

### Tees Available

| Tee | Color | Par | Rating | Slope | Yardage |
|-----|-------|-----|--------|-------|---------|
| Black | Black | 72 | 73.5 | 135 | 7241 |
| White | White | 72 | 72.0 | 130 | 6726 |
| Yellow | Yellow | 72 | 70.0 | 125 | 6377 |
| Red | Red | 72 | 68.0 | 120 | 5592 |

---

## Hole Data Source

**File:** `scorecard_profiles/treasure_hill_scorecard.json`

The hole data (par, stroke index, yardages) was extracted from the existing scorecard JSON file.

---

## Hole Layout Images

**Storage Location:** Supabase bucket `hole-layouts/treasure_hill/`

**Image Format:** `H1.png` through `H18.png`

### Code Support Added

Updated `loadHoleLayoutImage()` in `public/index.html` to support the `H{number}` naming convention:

```javascript
const imageVariants = [
    `H${hole}`,              // H1, H2... (Treasure Hill format)
    `hole${hole}`,           // hole1
    `hole_${hole}`,          // hole_1
    `hole-${hole}`,          // hole-1
    `Hole${hole}`,           // Hole1
    `Hole_${hole}`,          // Hole_1
    `Hole-${hole}`,          // Hole-1
    `${hole}`,               // Just number
    `hole-${hole}-1086x1536` // With dimensions
];

// Also supports uppercase extensions
const extensions = ['png', 'jpg', 'jpeg', 'PNG', 'JPG', 'JPEG'];
```

---

## SQL Migration

**File:** `sql/ADD_TREASURE_HILL_COURSE.sql`

### What It Does

1. Inserts course record into `courses` table
2. Deletes any existing hole data (for re-running)
3. Inserts 72 hole records (18 holes x 4 tees)

### Sample Hole Data (White Tees)

| Hole | Par | SI | Yards |
|------|-----|-----|-------|
| 1 | 5 | 12 | 576 |
| 2 | 3 | 2 | 213 |
| 3 | 4 | 17 | 376 |
| 4 | 4 | 3 | 388 |
| 5 | 4 | 5 | 376 |
| 6 | 3 | 18 | 114 |
| 7 | 5 | 13 | 514 |
| 8 | 4 | 8 | 363 |
| 9 | 4 | 4 | 415 |
| 10 | 4 | 10 | 382 |
| 11 | 4 | 1 | 442 |
| 12 | 5 | 11 | 574 |
| 13 | 3 | 7 | 200 |
| 14 | 4 | 9 | 383 |
| 15 | 4 | 16 | 338 |
| 16 | 5 | 15 | 532 |
| 17 | 3 | 14 | 153 |
| 18 | 4 | 6 | 387 |

---

## Setup Instructions

### Step 1: Run SQL Migration

Execute in Supabase SQL Editor:
```sql
-- Run the full file
sql/ADD_TREASURE_HILL_COURSE.sql
```

### Step 2: Verify Images in Storage

Confirm images exist in Supabase Storage:
```
hole-layouts/treasure_hill/H1.png
hole-layouts/treasure_hill/H2.png
...
hole-layouts/treasure_hill/H18.png
```

### Step 3: Test in App

1. Create an event at Treasure Hill
2. Start Live Scorecard
3. Navigate to any hole
4. Tap "Hole Layout" button
5. Verify image loads correctly

---

## Git Commits

```
8fbab20f fix: Correct Treasure Hill hole data from scorecard JSON
2e06a27e fix: Add H1-H18 naming format for Treasure Hill hole images
xxxxxxxx feat: Add Treasure Hill Golf & Country Club course support
```

---

## Troubleshooting

### Hole Layout Not Loading

1. Check browser console for 404 errors
2. Verify image exists in Supabase storage
3. Check image filename matches expected format (H1.png, not h1.png)
4. Ensure storage bucket has public read access

### Wrong Par/Yardage Displayed

1. Verify SQL was run successfully
2. Check `course_holes` table has correct data
3. Query: `SELECT * FROM course_holes WHERE course_id = 'treasure_hill' AND tee_marker = 'white'`
