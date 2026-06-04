# Task: Insert Siam Rolling Hills into MyCaddiPro Supabase

## Objective
Insert Siam Rolling Hills (Siam Country Club) as a brand new 18-hole course into the MyCaddiPro Supabase database. Par 72, five tees, official R&A course/slope ratings. Designed by Brian Curley. Each hole has a unique name — store these if the schema supports it.

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
  designer,
  status,
  created_at
) VALUES (
  'Siam Rolling Hills',
  'สยาม โรลลิ่งฮิลส์',
  'Pattaya',
  'Chonburi',
  'Thailand',
  18,
  'Brian Curley',
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
| Black  | 74.4         | 135   |
| Blue   | 71.9         | 129   |
| White  | 69.2         | 123   |
| Yellow | 68.0         | 120   |
| Red    | 71.2         | 126   |

---

## Step 4 — Insert All 18 Holes

Each hole has a name — store in `hole_name` column if it exists on the holes table.

### Front Nine (Holes 1–9)

| Hole | Name          | Par | HCP | Black | Blue  | White | Yellow | Red |
|------|---------------|-----|-----|-------|-------|-------|--------|-----|
| 1    | Get Away      | 4   | 12  | 370   | 341   | 325   | 314    | 303 |
| 2    | Sidekick      | 3   | 10  | 234   | 207   | 180   | 165    | 151 |
| 3    | Punch Drunk   | 4   | 8   | 430   | 402   | 374   | 360    | 342 |
| 4    | China's Tale  | 5   | 2   | 570   | 529   | 474   | 460    | 407 |
| 5    | Two-Faced     | 4   | 18  | 328   | 308   | 285   | 271    | 265 |
| 6    | Hidden Valley | 5   | 6   | 544   | 512   | 482   | 475    | 457 |
| 7    | Top Shelf     | 3   | 16  | 182   | 154   | 125   | 118    | 99  |
| 8    | Table Top     | 4   | 4   | 433   | 397   | 365   | 358    | 319 |
| 9    | Blind Faith   | 4   | 14  | 378   | 359   | 334   | 317    | 310 |

**Front nine totals:** Par 36 | Black 3,469 | Blue 3,209 | White 2,944 | Yellow 2,838 | Red 2,653

---

### Back Nine (Holes 10–18)

| Hole | Name           | Par | HCP | Black | Blue  | White | Yellow | Red |
|------|----------------|-----|-----|-------|-------|-------|--------|-----|
| 10   | Left is Right  | 4   | 11  | 392   | 364   | 315   | 296    | 278 |
| 11   | Valley of Sin  | 5   | 5   | 596   | 537   | 502   | 484    | 468 |
| 12   | Long Haul      | 4   | 3   | 505   | 448   | 388   | 368    | 364 |
| 13   | Drop Off       | 3   | 9   | 236   | 199   | 166   | 154    | 142 |
| 14   | Pattaya Punch  | 4   | 7   | 491   | 450   | 421   | 399    | 372 |
| 15   | Wall of Death  | 5   | 1   | 619   | 555   | 507   | 475    | 445 |
| 16   | Postage Stamp  | 3   | 15  | 172   | 159   | 132   | 123    | 102 |
| 17   | Trident        | 4   | 17  | 352   | 323   | 293   | 280    | 267 |
| 18   | Home           | 4   | 13  | 435   | 407   | 364   | 340    | 325 |

**Back nine totals:** Par 36 | Black 3,798 | Blue 3,442 | White 3,088 | Yellow 2,919 | Red 2,763

---

## Step 5 — Verify the Insert

```sql
SELECT id, name, total_holes FROM courses WHERE name ILIKE '%rolling hills%';

SELECT COUNT(*) as hole_count, SUM(par) as total_par
FROM course_holes
WHERE course_id = <your_course_id>;
-- Expected: 18 holes, par 72

SELECT hole_number, hole_name, par, hcp
FROM course_holes
WHERE course_id = <your_course_id>
ORDER BY hole_number;
```

**Expected totals:**
- Holes: 18 | Par: 72
- Black: 7,267 | Blue: 6,651 | White: 6,032 | Yellow: 5,757 | Red: 5,416

---

## Notes for Hal
- **Surgical only** — no changes to any other course records
- Source JSON: `siam_rollinghills_scorecard.json`
- Store hole names if `hole_name` column exists — don't create the column if it doesn't
- If any ambiguity on schema, stop and ask before inserting
