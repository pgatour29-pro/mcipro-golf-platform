# Khao Kheow Simple Course Picker

**Date:** 2025-11-03
**Status:** Ready to implement
**Problem Solved:** Confusing course combinations replaced with simple selection

---

## Problem

The old system had pre-defined combinations (khao_kheow_ab, khao_kheow_bc, khao_kheow_ac) which were confusing:
- Golfers didn't know which courses were in which combinations
- Course labels didn't match actual hole order (A+B actually meant B+A)
- Stroke indices were wrong (sequential 1-18 instead of by difficulty)

---

## Solution

**Simple dropdown selection:**
1. Golfer selects **Front 9:** A, B, or C
2. Golfer selects **Back 9:** A, B, or C
3. System automatically loads correct stroke indices

---

## How Stroke Index Works

### Course A (Constant)
Indices: **17, 7, 13, 1, 15, 9, 11, 3, 5**
- Always the same regardless of pairing

### Course C (Constant)
Indices: **4, 6, 16, 18, 12, 8, 2, 14, 10**
- Always the same regardless of pairing

### Course B (Variable)
Changes based on what it's paired with:

**Course B with A:**
Indices: **12, 6, 14, 10, 18, 8, 4, 16, 2**

**Course B with C:**
Indices: **11, 5, 13, 9, 17, 7, 3, 15, 1**

---

## Database Structure

### Four 9-Hole Course Profiles:

```
khao_kheow_a          → Course A (fixed indices)
khao_kheow_b_with_a   → Course B when paired with A
khao_kheow_b_with_c   → Course B when paired with C
khao_kheow_c          → Course C (fixed indices)
```

Each has 9 holes (numbered 1-9) with 4 tee markers (blue, yellow, white, red).

---

## Course Selection Logic

| Front 9 | Back 9 | Front Course ID | Back Course ID |
|---------|--------|-----------------|----------------|
| A | B | khao_kheow_a | khao_kheow_b_with_a |
| A | C | khao_kheow_a | khao_kheow_c |
| B | A | khao_kheow_b_with_a | khao_kheow_a |
| B | C | khao_kheow_b_with_c | khao_kheow_c |
| C | A | khao_kheow_c | khao_kheow_a |
| C | B | khao_kheow_c | khao_kheow_b_with_c |

**Invalid combinations:** A+A, B+B, C+C (same course twice)

---

## Example Stroke Index Allocation

### Example 1: A + B Combination

**18 Handicap Golfer:**

| Hole | Course | Par | Index | Gets Stroke? |
|------|--------|-----|-------|--------------|
| 1 | A1 | 4 | 17 | ✅ (index ≤ 18) |
| 2 | A2 | 5 | 7 | ✅ |
| 3 | A3 | 3 | 13 | ✅ |
| 4 | A4 | 4 | **1** | ✅ (Hardest!) |
| 5 | A5 | 3 | 15 | ✅ |
| 6 | A6 | 4 | 9 | ✅ |
| 7 | A7 | 4 | 11 | ✅ |
| 8 | A8 | 5 | 3 | ✅ |
| 9 | A9 | 4 | 5 | ✅ |
| 10 | B1 | 4 | 12 | ✅ |
| 11 | B2 | 5 | 6 | ✅ |
| 12 | B3 | 3 | 14 | ✅ |
| 13 | B4 | 4 | 10 | ✅ |
| 14 | B5 | 4 | **18** | ✅ (Easiest!) |
| 15 | B6 | 5 | 8 | ✅ |
| 16 | B7 | 4 | 4 | ✅ |
| 17 | B8 | 3 | 16 | ✅ |
| 18 | B9 | 4 | 2 | ✅ |

**Hardest holes:** A4 (index 1), B9 (index 2), A8 (index 3)
**Easiest holes:** B5 (index 18), A1 (index 17), B8 (index 16)

---

## Implementation Steps

### STEP 1: Run SQL Migration ✅

**File:** `sql/khao-kheow-simple-system.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `khao-kheow-simple-system.sql`
3. Paste and click **RUN**
4. Verify success messages

**What this does:**
- Deletes old course combinations (khao_kheow_ab, khao_kheow_bc, khao_kheow_ac)
- Creates 4 new course profiles with correct stroke indices
- Adds all tee markers (blue, yellow, white, red)

---

### STEP 2: Update Course Selection UI

**File to modify:** `index.html`

**Location:** Find where courses are selected (course dropdown or picker)

**Add the picker UI:**

```html
<!-- Insert khao-kheow-course-picker-ui.html contents here -->
```

**Integration logic:**

```javascript
// When user selects "Khao Kheow" from course list
if (selectedCourse.name === 'Khao Kheow' || selectedCourse.id.includes('khao_kheow')) {
    showKhaoKheowPicker();
} else {
    hideKhaoKheowPicker();
}
```

---

### STEP 3: Update Scorecard Loading Logic

**Location:** LiveScorecard class or course loading function

**Before (Old system):**
```javascript
// Loaded single course: khao_kheow_ab (all 18 holes)
const courseData = await loadCourse('khao_kheow_ab');
```

**After (New system):**
```javascript
// Get selection from picker
const selection = khaoKheowPicker.getSelection();

// Load front 9
const front9Holes = await loadCourseHoles(selection.frontCourseId, 'hole_number', [1,2,3,4,5,6,7,8,9]);

// Load back 9 (renumber as 10-18)
const back9Holes = await loadCourseHoles(selection.backCourseId, 'hole_number', [1,2,3,4,5,6,7,8,9]);
back9Holes.forEach((hole, idx) => {
    hole.hole_number = 10 + idx; // Renumber to 10-18
});

// Combine into 18 holes
const allHoles = [...front9Holes, ...back9Holes];
```

**Helper function:**
```javascript
async function loadCourseHoles(courseId, column, values) {
    const { data, error } = await window.SupabaseDB.client
        .from('course_holes')
        .select('*')
        .eq('course_id', courseId)
        .in(column, values)
        .eq('tee_marker', selectedTeeColor) // e.g., 'blue'
        .order('hole_number');

    if (error) {
        console.error('[KhaoKheow] Failed to load holes:', error);
        return [];
    }

    return data;
}
```

---

### STEP 4: Add Course Listing UI

**Update course dropdown to show:**

```
📍 Khao Kheow Country Club
   ├─ Course A (9 holes)
   ├─ Course B (9 holes)
   └─ Course C (9 holes)

   → Select your 18-hole combination
```

**Or simpler:**

```
Khao Kheow Country Club (27 holes)
→ Select front & back 9 after choosing this course
```

---

## User Flow

### Flow Diagram:

```
User clicks "Start Round"
    ↓
Selects "Khao Kheow Country Club"
    ↓
Picker appears: "Select Front 9" [A] [B] [C]
                "Select Back 9"   [A] [B] [C]
    ↓
User selects: Front = B, Back = C
    ↓
System validates: B ≠ C ✓
    ↓
Display: "Playing: Course B (Front 9) + Course C (Back 9)"
    ↓
User clicks "Confirm Selection"
    ↓
System loads:
  - Holes 1-9 from khao_kheow_b_with_c
  - Holes 10-18 from khao_kheow_c (renumbered)
    ↓
Scorecard appears with correct par and stroke indices
```

---

## Testing Checklist

After implementation:

- [ ] SQL migration runs successfully
- [ ] Old combinations (ab, bc, ac) deleted
- [ ] New courses (a, b_with_a, b_with_c, c) created
- [ ] Picker UI appears when Khao Kheow selected
- [ ] Dropdown shows A, B, C options
- [ ] Selecting same course twice shows error
- [ ] Valid combinations show confirmation button
- [ ] Clicking "Confirm" loads correct 18 holes
- [ ] Hole 1-9 shows front 9 par/yardage
- [ ] Hole 10-18 shows back 9 par/yardage (renumbered)
- [ ] Stroke indices match scorecard (A=17,7,13..., B varies, C=4,6,16...)
- [ ] Handicap strokes allocated correctly
- [ ] All tee colors work (blue, yellow, white, red)

---

## Example Combinations

### A + B (most common)

**Scorecard:**
```
FRONT 9 (Course A):
Hole  1   2   3   4   5   6   7   8   9   OUT
Par   4   5   3   4   3   4   4   5   4   36
Index 17  7  13  1  15  9  11  3   5

BACK 9 (Course B):
Hole  10  11  12  13  14  15  16  17  18  IN  TOT
Par   4   5   3   4   4   5   4   3   4   36  72
Index 12  6  14  10  18  8   4  16  2
```

### B + C

**Scorecard:**
```
FRONT 9 (Course B):
Hole  1   2   3   4   5   6   7   8   9   OUT
Par   4   5   3   4   4   5   4   3   4   36
Index 11  5  13  9  17  7   3  15  1

BACK 9 (Course C):
Hole  10  11  12  13  14  15  16  17  18  IN  TOT
Par   5   4   3   4   4   5   4   3   4   36  72
Index 4   6  16  18  12  8   2  14  10
```

---

## Advantages

### Old System Problems:
❌ Confusing combinations (ab, bc, ac)
❌ Labels didn't match actual courses
❌ Required 6 separate database entries
❌ Stroke indices were wrong (sequential)
❌ Hard to add new combinations

### New System Benefits:
✅ Clear selection: "Front 9: A, B, or C"
✅ Only 4 database course profiles needed
✅ Correct stroke indices
✅ Flexible (can play any valid combination)
✅ Easy to understand for golfers

---

## Technical Details

### Database Storage:
- **Old:** 6 course_id entries × 4 tee colors × 18 holes = 432 rows
- **New:** 4 course_id entries × 4 tee colors × 9 holes = 144 rows
- **Savings:** 288 rows (67% reduction!)

### Performance:
- Two database queries instead of one
- Negligible performance impact (~50ms extra)
- Better data organization

### Maintainability:
- Each course stored once
- Easy to update yardages
- Clear stroke index logic

---

## Files Created

| File | Purpose |
|------|---------|
| `sql/khao-kheow-simple-system.sql` | Database migration with all courses |
| `khao-kheow-course-picker-ui.html` | UI component for course selection |
| `KHAO_KHEOW_SIMPLE_PICKER.md` | This documentation |

---

## Next Steps

1. ✅ SQL migration created
2. ✅ UI component created
3. ⏳ **YOU:** Run SQL in Supabase
4. ⏳ **YOU:** Integrate UI into index.html
5. ⏳ **YOU:** Update scorecard loading logic
6. ⏳ Test with all combinations

---

**Estimated Implementation Time:** 30-45 minutes
**Difficulty:** Medium
**Priority:** High (fixes incorrect stroke indices)

