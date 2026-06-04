# Task: Insert Siam Waterside into MyCaddiPro Supabase

## Objective
Insert Siam Waterside (Siam Country Club) as a brand new 18-hole course into the MyCaddiPro Supabase database. This course has course/slope ratings for all 5 tees — store these wherever the schema supports it.

---

## Step 1 — Schema Check (DO THIS FIRST)
Before writing any insert, inspect the existing schema:

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
  'Siam Waterside',
  'สยาม วอเตอร์ไซด์',
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

This course has official R&A course and slope ratings. Store in `tee_sets`, `course_tees`, or equivalent — adjust table/column names to match schema:

| Tee    | Course Rating | Slope |
|--------|--------------|-------|
| Black  | 74.8         | 139   |
| Blue   | 70.8         | 129   |
| White  | 68.4         | 123   |
| Yellow | 66.7         | 119   |
| Red    | 69.6         | 118   |

If ratings are stored as columns on the holes or tee table, attach them to the tee records in Step 4.

---

## Step 4 — Insert All 18 Holes

Holes 1–9 = front nine, Holes 10–18 = back nine. Use global hole numbers (1–18).

### Front Nine (Holes 1–9)

| Hole | Par | HCP | Black | Blue  | White | Yellow | Red |
|------|-----|-----|-------|-------|-------|--------|-----|
| 1    | 4   | 10  | 437   | 369   | 349   | 322    | 314 |
| 2    | 3   | 14  | 208   | 163   | 138   | 134    | 129 |
| 3    | 4   | 4   | 475   | 427   | 384   | 374    | 349 |
| 4    | 4   | 12  | 360   | 325   | 302   | 278    | 271 |
| 5    | 4   | 18  | 437   | 396   | 366   | 358    | 322 |
| 6    | 5   | 6   | 603   | 517   | 480   | 463    | 419 |
| 7    | 3   | 16  | 220   | 173   | 152   | 119    | 108 |
| 8    | 5   | 8   | 618   | 562   | 530   | 500    | 480 |
| 9    | 4   | 2   | 423   | 374   | 369   | 340    | 310 |

**Front nine totals:** Par 36 | Black 3,781 | Blue 3,306 | White 3,070 | Yellow 2,888 | Red 2,702

---

### Back Nine (Holes 10–18)

| Hole | Par | HCP | Black | Blue  | White | Yellow | Red |
|------|-----|-----|-------|-------|-------|--------|-----|
| 10   | 5   | 9   | 580   | 526   | 503   | 470    | 432 |
| 11   | 4   | 13  | 406   | 358   | 328   | 323    | 290 |
| 12   | 3   | 17  | 206   | 161   | 138   | 118    | 115 |
| 13   | 4   | 3   | 481   | 411   | 374   | 338    | 335 |
| 14   | 4   | 11  | 416   | 372   | 339   | 333    | 321 |
| 15   | 4   | 7   | 358   | 322   | 289   | 263    | 258 |
| 16   | 3   | 15  | 185   | 164   | 139   | 134    | 86  |
| 17   | 4   | 1   | 445   | 402   | 345   | 320    | 316 |
| 18   | 5   | 5   | 581   | 547   | 524   | 477    | 446 |

**Back nine totals:** Par 36 | Black 3,658 | Blue 3,263 | White 2,979 | Yellow 2,776 | Red 2,599

---

## Step 5 — Verify the Insert

```sql
-- Confirm course exists
SELECT id, name, total_holes FROM courses WHERE name ILIKE '%waterside%';

-- Confirm 18 holes inserted
SELECT COUNT(*) as hole_count, SUM(par) as total_par
FROM course_holes  -- adjust table name
WHERE course_id = <your_course_id>;

-- Expected: 18 holes, par 72

-- Spot check a few yardages (blue tee)
SELECT hole_number, par, hcp, yardage_blue
FROM course_holes
WHERE course_id = <your_course_id>
ORDER BY hole_number;
```

**Expected totals:**
- Holes: 18 | Par: 72
- Black: 7,439 | Blue: 6,569 | White: 6,049 | Yellow: 5,664 | Red: 5,301

---

## Notes for Hal
- **Surgical only** — no changes to any other course records
- Source JSON: `siam_waterside_scorecard.json`
- This course has official course/slope ratings — make sure these are stored, not dropped
- If schema stores front/back nine separately (e.g. a `nine` column), use `front` for holes 1–9 and `back` for holes 10–18
- If any ambiguity on schema, stop and ask before inserting
