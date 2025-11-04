# Khao Kheow Stroke Index Correction

**Date:** 2025-11-03
**Issue:** Stroke index ratings were sequential (1-18) instead of reflecting actual hole difficulty
**Status:** ✅ SQL fix ready to deploy

---

## Problem

All three Khao Kheow course combinations had **incorrect stroke index values**:
- Previously: Sequential 1, 2, 3, 4... 18 (incorrect)
- Should be: Based on actual scorecard handicap ratings

---

## Corrected Stroke Index Values

### A+B Combination (khao_kheow_ab)

**Front 9 (Course A):**
| Hole | Par | Stroke Index | Difficulty |
|------|-----|--------------|------------|
| 1 | 4 | 12 | Medium |
| 2 | 5 | 6 | Hard |
| 3 | 3 | 14 | Medium-Easy |
| 4 | 4 | 10 | Medium |
| 5 | 3 | 18 | Easiest |
| 6 | 4 | 8 | Hard |
| 7 | 4 | 4 | Very Hard |
| 8 | 5 | 16 | Easy |
| 9 | 4 | 2 | Very Hard |

**Back 9 (Course B):**
| Hole | Par | Stroke Index | Difficulty |
|------|-----|--------------|------------|
| 10 | 4 | 11 | Medium |
| 11 | 5 | 5 | Very Hard |
| 12 | 3 | 13 | Medium |
| 13 | 4 | 9 | Hard |
| 14 | 4 | 17 | Easy |
| 15 | 5 | 7 | Hard |
| 16 | 4 | 3 | Very Hard |
| 17 | 3 | 15 | Easy |
| 18 | 4 | 1 | **Hardest Hole** |

---

### B+C Combination (khao_kheow_bc)

**Front 9 (Course B):**
| Hole | Par | Stroke Index | Difficulty |
|------|-----|--------------|------------|
| 1 | 4 | 11 | Medium |
| 2 | 5 | 5 | Very Hard |
| 3 | 3 | 13 | Medium |
| 4 | 4 | 9 | Hard |
| 5 | 4 | 17 | Easy |
| 6 | 5 | 7 | Hard |
| 7 | 4 | 3 | Very Hard |
| 8 | 3 | 15 | Easy |
| 9 | 4 | 1 | **Hardest Hole** |

**Back 9 (Course C):**
| Hole | Par | Stroke Index | Difficulty |
|------|-----|--------------|------------|
| 10 | 5 | 4 | Very Hard |
| 11 | 4 | 6 | Hard |
| 12 | 3 | 16 | Easy |
| 13 | 4 | 18 | Easiest |
| 14 | 4 | 12 | Medium |
| 15 | 5 | 8 | Hard |
| 16 | 4 | 2 | Very Hard |
| 17 | 3 | 14 | Medium-Easy |
| 18 | 4 | 10 | Medium |

---

### A+C Combination (khao_kheow_ac)

**Front 9 (Course A):**
| Hole | Par | Stroke Index | Difficulty |
|------|-----|--------------|------------|
| 1 | 4 | 17 | Easy |
| 2 | 5 | 7 | Hard |
| 3 | 3 | 13 | Medium |
| 4 | 4 | 1 | **Hardest Hole** |
| 5 | 3 | 15 | Easy |
| 6 | 4 | 9 | Hard |
| 7 | 4 | 11 | Medium |
| 8 | 5 | 3 | Very Hard |
| 9 | 4 | 5 | Very Hard |

**Back 9 (Course C):**
| Hole | Par | Stroke Index | Difficulty |
|------|-----|--------------|------------|
| 10 | 5 | 4 | Very Hard |
| 11 | 4 | 6 | Hard |
| 12 | 3 | 16 | Easy |
| 13 | 4 | 18 | Easiest |
| 14 | 4 | 12 | Medium |
| 15 | 5 | 8 | Hard |
| 16 | 4 | 2 | Very Hard |
| 17 | 3 | 14 | Medium-Easy |
| 18 | 4 | 10 | Medium |

---

## Key Changes

### Hardest Holes (Stroke Index 1-3):
- **A+B:** Holes 18, 9, 16 (B9, A9, B7)
- **B+C:** Holes 9, 16, 7 (B9, C7, B7)
- **A+C:** Holes 4, 16, 8 (A4, C7, A8)

### Easiest Holes (Stroke Index 16-18):
- **A+B:** Holes 8, 14, 5 (A8, B5, A5)
- **B+C:** Holes 12, 8, 13 (C3, B8, C4)
- **A+C:** Holes 12, 1, 13 (C3, A1, C4)

---

## Impact on Gameplay

### Before Fix (Wrong):
- All golfers received strokes in sequential order
- Hole 1 = index 1 (easiest hole got stroke)
- Hole 18 = index 18 (hardest hole got no stroke)
- **Handicap system was completely backwards!**

### After Fix (Correct):
- Strokes allocated based on actual difficulty
- Hard holes (low index) get strokes first
- Easy holes (high index) get strokes last
- **Handicap system now works properly**

---

## How to Deploy

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: **pyeeplwsnupmhgbguwqs**
3. Navigate to: **SQL Editor**

### Step 2: Run SQL Script
1. Open file: `sql/fix-khao-kheow-stroke-index.sql`
2. Copy entire contents
3. Paste into SQL Editor
4. Click **RUN**

### Step 3: Verify Changes
The script will automatically show verification queries:
- Shows all 18 holes for each combination
- Displays par, stroke index, yardage per tee marker
- Success message confirms update

---

## Testing Checklist

After running the SQL:

- [ ] Open golfer dashboard
- [ ] Start new live scorecard
- [ ] Select "Khao Kheow A+B"
- [ ] Check stroke index shows: 12, 6, 14, 10, 18, 8, 4, 16, 2, 11, 5, 13, 9, 17, 7, 3, 15, 1
- [ ] Enter handicap (e.g., 18) and verify strokes allocated correctly
- [ ] Hole 18 (index 1) should get stroke for handicap 1+
- [ ] Hole 9 (index 2) should get stroke for handicap 2+
- [ ] Hole 5 (index 18) should get stroke for handicap 18+

---

## Files Modified

| File | Purpose |
|------|---------|
| `sql/fix-khao-kheow-stroke-index.sql` | SQL script to update all stroke indices |
| `KHAO_KHEOW_STROKE_INDEX_FIX.md` | This documentation |

---

## Notes

- All tee markers (blue, yellow, white, red) updated
- Stroke index is same across all tee colors (only yardages differ)
- Par and yardages remain unchanged
- Only stroke index values corrected

---

**Status:** ✅ Ready to deploy
**Estimated time:** 2 minutes
**Risk level:** Low (only updates stroke_index values)
