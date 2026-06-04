# Task: Insert Siam Old Course into MyCaddiPro Supabase

## Objective
Insert Siam Old Course (Siam Country Club) as a brand new 18-hole course into the MyCaddiPro Supabase database. Par 72, five tees, with official R&A course/slope ratings.

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
  'Siam Old Course',
  'สยาม โอลด์ คอร์ส',
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

| Tee    | Course Rating | Slope |
|--------|--------------|-------|
| Black  | 74.1         | 137   |
| Blue   | 71.5         | 131   |
| White  | 69.2         | 126   |
| Yellow | 67.9         | 123   |
| Red    | 70.3         | 124   |

---

## Step 4 — Insert All 18 Holes

> ⚠️ Note: Black tee hole 2 = **401** yards (not 371 — that's the blue tee). Verified against card totals.

### Front Nine (Holes 1–9)

| Hole | Par | HCP | Black | Blue  | White | Yellow | Red |
|------|-----|-----|-------|-------|-------|--------|-----|
| 1    | 5   | 14  | 522   | 502   | 481   | 473    | 445 |
| 2    | 4   | 18  | 401   | 329   | 274   | 261    | 233 |
| 3    | 4   | 2   | 448   | 410   | 381   | 359    | 333 |
| 4    | 3   | 16  | 187   | 170   | 157   | 147    | 112 |
| 5    | 4   | 10  | 394   | 374   | 364   | 355    | 327 |
| 6    | 4   | 6   | 419   | 381   | 350   | 343    | 299 |
| 7    | 5   | 8   | 541   | 512   | 458   | 446    | 432 |
| 8    | 3   | 12  | 220   | 191   | 168   | 152    | 146 |
| 9    | 4   | 4   | 419   | 392   | 330   | 323    | 299 |

**Front nine totals:** Par 36 | Black 3,551 | Blue 3,261 | White 2,963 | Yellow 2,859 | Red 2,626

---

### Back Nine (Holes 10–18)

| Hole | Par | HCP | Black | Blue  | White | Yellow | Red |
|------|-----|-----|-------|-------|-------|--------|-----|
| 10   | 5   | 13  | 567   | 529   | 501   | 492    | 433 |
| 11   | 4   | 1   | 452   | 427   | 386   | 371    | 276 |
| 12   | 3   | 15  | 188   | 161   | 154   | 144    | 133 |
| 13   | 4   | 17  | 346   | 316   | 293   | 286    | 264 |
| 14   | 4   | 11  | 412   | 382   | 377   | 370    | 329 |
| 15   | 4   | 7   | 421   | 389   | 374   | 314    | 269 |
| 16   | 3   | 3   | 231   | 212   | 186   | 133    | 129 |
| 17   | 4   | 5   | 389   | 370   | 341   | 334    | 315 |
| 18   | 5   | 9   | 511   | 455   | 426   | 414    | 396 |

**Back nine totals:** Par 36 | Black 3,517 | Blue 3,241 | White 3,038 | Yellow 2,858 | Red 2,544

---

## Step 5 — Verify the Insert

```sql
SELECT id, name, total_holes FROM courses WHERE name ILIKE '%old course%';

SELECT COUNT(*) as hole_count, SUM(par) as total_par
FROM course_holes
WHERE course_id = <your_course_id>;
-- Expected: 18 holes, par 72

SELECT hole_number, par, hcp, yardage_blue
FROM course_holes
WHERE course_id = <your_course_id>
ORDER BY hole_number;
```

**Expected totals:**
- Holes: 18 | Par: 72
- Black: 7,068 | Blue: 6,502 | White: 6,001 | Yellow: 5,717 | Red: 5,170

---

## Notes for Hal
- **Surgical only** — no changes to any other course records
- Source JSON: `siam_oldcourse_scorecard.json`
- Hole 2 black tee is 401 — do not use the image value of 371 (that's blue)
- If any ambiguity on schema, stop and ask before inserting
