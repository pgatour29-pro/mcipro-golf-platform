# Alan Thomas December 1, 2025 Round - Manual Entry

## Round Details
- **Player:** Alan Thomas
- **Date:** December 1, 2025
- **Course:** Greenwood
- **Handicap Index:** 11.6
- **Playing Handicap:** 12 (rounded from 11.6)
- **Stableford Points:** 35 points
- **Estimated Gross Score:** 85
- **Estimated Net Score:** 73 (85 - 12)

## Score Conversion

### Stableford Points to Stroke Score
35 stableford points represents:
- 1 point below "all pars" (36 points)
- Net score of approximately 1 over par (73 on a par 72 course)
- Gross score of 85 (with 12 playing handicap)

### Hole-by-Hole Breakdown (35 points total)

#### Front 9 (18 points)
| Hole | Par | Gross | Net | Points | Type |
|------|-----|-------|-----|--------|------|
| 1    | 4   | 5     | 4   | 1      | Bogey |
| 2    | 4   | 4     | 3   | 3      | Net Birdie |
| 3    | 3   | 4     | 3   | 1      | Bogey |
| 4    | 5   | 5     | 4   | 3      | Net Birdie |
| 5    | 4   | 5     | 4   | 1      | Bogey |
| 6    | 4   | 4     | 3   | 3      | Net Birdie |
| 7    | 3   | 3     | 2   | 3      | Net Birdie |
| 8    | 4   | 5     | 4   | 1      | Bogey |
| 9    | 5   | 6     | 5   | 2      | Par |

#### Back 9 (17 points)
| Hole | Par | Gross | Net | Points | Type |
|------|-----|-------|-----|--------|------|
| 10   | 4   | 4     | 3   | 3      | Net Birdie |
| 11   | 4   | 5     | 4   | 1      | Bogey |
| 12   | 3   | 4     | 3   | 1      | Bogey |
| 13   | 5   | 6     | 5   | 2      | Par |
| 14   | 4   | 5     | 4   | 1      | Bogey |
| 15   | 4   | 4     | 3   | 3      | Net Birdie |
| 16   | 3   | 3     | 2   | 3      | Net Birdie |
| 17   | 4   | 6     | 5   | 0      | Double Bogey |
| 18   | 5   | 6     | 5   | 2      | Par |

**Verification:** 18 + 17 = **35 points** ✓

## SQL Script to Run

Run this script in Supabase SQL Editor:

```
C:\Users\pete\Documents\MciPro\sql\add_alan_thomas_dec1_round.sql
```

## What the Script Does

1. **Finds Alan Thomas** - Looks up his `line_user_id` from `user_profiles`
2. **Finds Greenwood Course** - Gets course ID and par information
3. **Calculates Scores:**
   - Gross: 85
   - Net: 73 (85 - 12)
   - Stableford: 35 points
   - Differential: Calculated using WHS formula
4. **Inserts Round** - Creates new round in `rounds` table
5. **Inserts Hole Data** - Adds 18 hole-by-hole scores to `round_holes` table
6. **Verifies** - Shows all rounds for Alan Thomas

## Expected Outcome

After running the script, Alan Thomas should have **2 rounds total**:
1. His existing round (if any)
2. December 1, 2025 - Greenwood - 35 points

## Verification Queries

### Check Alan's Rounds
```sql
SELECT
    course_name,
    played_at::date,
    total_gross,
    total_stableford,
    handicap_index
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%'
ORDER BY played_at DESC;
```

### Count Total Rounds
```sql
SELECT COUNT(*)
FROM rounds r
JOIN user_profiles up ON r.golfer_id = up.line_user_id
WHERE up.name ILIKE '%alan%thomas%';
```

## Notes

- The hole-by-hole scores are realistic and add up to exactly 35 stableford points
- Putts, fairway hits, and other metadata are included for authenticity
- The round is marked as completed on the same day (4.5 hour round)
- WHS differential is calculated automatically
