# Task: Insert Siam Bangkok into MyCaddiPro Supabase

## Objective
Insert Siam Bangkok (Siam Country Club) as a brand new 18-hole course into the MyCaddiPro Supabase database. Par 72. **4 tees only — no black tee on this course.**

---

## Step 1 — Schema Check (DO THIS FIRST)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'courses'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('holes', 'course_holes', 'tee_sets', 'course_tees')
ORDER BY table_name, ordinal_position;
```

Match column names exactly. Do not assume — check first.

---

## Step 2 — Insert the Course Record

```sql
INSERT INTO courses (
  name,
  name_th,
  location,
  city,
  country,
  total_holes,
  status,
  created_at
) VALUES (
  'Siam Bangkok',
  'สยาม แบงค็อก',
  'Pattaya',
  'Chonburi',
  'Thailand',
  18,
  'active',
  NOW()
)
RETURNING id;
```

**Capture the returned `id`** — needed for all subsequent inserts.

---

## Step 3 — Insert Course/Slope Ratings

**Note: No black tee on this course.**

| Tee    | Course Rating | Slope |
|--------|--------------|-------|
| Blue   | 71.6         | 132   |
| White  | 69.6         | 127   |
| Yellow | 67.4         | 122   |
| Red    | 69.6         | 118   |

If the schema requires a black tee record, insert NULL for yardage/rating — do not fabricate values.

---

## Step 4 — Insert All 18 Holes

### Front Nine (Holes 1–9)

| Hole | Par | HCP | Blue  | White | Yellow | Red |
|------|-----|-----|-------|-------|--------|-----|
| 1    | 5   | 6   | 515   | 499   | 465    | 444 |
| 2    | 4   | 10  | 394   | 374   | 364    | 319 |
| 3    | 3   | 14  | 182   | 164   | 151    | 136 |
| 4    | 4   | 12  | 408   | 380   | 343    | 294 |
| 5    | 3   | 18  | 164   | 139   | 134    | 118 |
| 6    | 4   | 4   | 420   | 392   | 358    | 328 |
| 7    | 4   | 16  | 322   | 317   | 303    | 284 |
| 8    | 5   | 2   | 525   | 508   | 470    | 428 |
| 9    | 4   | 8   | 410   | 366   | 340    | 308 |

**Front nine totals:** Par 36 | Blue 3,340 | White 3,139 | Yellow 2,928 | Red 2,659

---

### Back Nine (Holes 10–18)

| Hole | Par | HCP | Blue  | White | Yellow | Red |
|------|-----|-----|-------|-------|--------|-----|
| 10   | 5   | 7   | 555   | 524   | 475    | 450 |
| 11   | 4   | 5   | 432   | 414   | 368    | 312 |
| 12   | 3   | 13  | 173   | 147   | 141    | 102 |
| 13   | 4   | 11  | 390   | 351   | 329    | 305 |
| 14   | 4   | 3   | 373   | 360   | 340    | 298 |
| 15   | 4   | 9   | 429   | 385   | 345    | 330 |
| 16   | 5   | 1   | 554   | 511   | 483    | 446 |
| 17   | 4   | 15  | 348   | 327   | 292    | 268 |
| 18   | 3   | 17  | 159   | 152   | 129    | 121 |

**Back nine totals:** Par 36 | Blue 3,413 | White 3,171 | Yellow 2,902 | Red 2,632

---

## Step 5 — Verify the Insert

```sql
SELECT id, name, total_holes FROM courses WHERE name ILIKE '%bangkok%';

SELECT COUNT(*) as hole_count, SUM(par) as total_par
FROM course_holes
WHERE course_id = <your_course_id>;
-- Expected: 18 holes, par 72

SELECT hole_number, par, hcp
FROM course_holes
WHERE course_id = <your_course_id>
ORDER BY hole_number;
```

**Expected totals:**
- Holes: 18 | Par: 72
- Blue: 6,753 | White: 6,310 | Yellow: 5,830 | Red: 5,291

---

## Notes for Hal
- **Surgical only** — no changes to any other course records
- Source JSON: `siam_bangkok_scorecard.json`
- No black tee — do not insert a black tee record or null placeholder unless schema requires it
- If any ambiguity on schema, stop and ask before inserting
