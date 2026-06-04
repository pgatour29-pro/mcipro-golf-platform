# Task: Insert Siam Plantation Golf Club into MyCaddiPro Supabase

## Objective
Insert Siam Plantation Golf Club as a brand new course record into the MyCaddiPro Supabase database. This is a 27-hole facility with three 9-hole nines: Sugar Cane, Tapioca, and Pineapple.

## Step 1 — Schema Check (DO THIS FIRST)
Before writing any insert, inspect the existing schema:

```sql
-- Check courses table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'courses'
ORDER BY ordinal_position;

-- Check holes/scorecard table structure (may be called course_holes, holes, scorecards, etc.)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('holes', 'course_holes', 'scorecards', 'tee_sets', 'course_tees')
ORDER BY table_name, ordinal_position;
```

Match column names exactly to what exists. Do not assume column names — check first.

---

## Step 2 — Insert the Course Record

Insert into the `courses` table. Adjust field names to match schema:

```sql
INSERT INTO courses (
  name,
  name_th,
  location,
  city,
  country,
  total_holes,
  num_nines,
  status,
  created_at
) VALUES (
  'Siam Plantation Golf Club',
  'สยามพลานเทชั่น กอล์ฟ คลับ',
  'Pattaya',
  'Chonburi',
  'Thailand',
  27,
  3,
  'active',
  NOW()
)
RETURNING id;
```

**Capture the returned `id`** — you need it for all hole inserts below.

---

## Step 3 — Insert All 27 Holes

Use the `course_id` from Step 2. Insert holes for each nine separately.

### Nine Identification
Each nine needs a `nine_name` or `course_nine` identifier (check schema). The three nines are:
- `sugar_cane`
- `tapioca`  
- `pineapple`

Holes are numbered 1–9 within each nine.

---

### SUGAR CANE — 9 Holes

| Hole | Par | HCP | Combo HCP (SC+T) | Combo HCP (P+SC) | Black | Blue | White | Yellow | Red |
|------|-----|-----|------------------|------------------|-------|------|-------|--------|-----|
| 1 | 4 | 8 | 15 | 16 | 382 | 352 | 283 | 277 | 238 |
| 2 | 4 | 7 | 13 | 14 | 404 | 375 | 349 | 302 | 293 |
| 3 | 3 | 5 | 9  | 10 | 195 | 165 | 132 | 125 | 117 |
| 4 | 4 | 2 | 3  | 4  | 456 | 423 | 396 | 345 | 306 |
| 5 | 5 | 6 | 11 | 12 | 568 | 522 | 480 | 445 | 418 |
| 6 | 3 | 4 | 7  | 8  | 242 | 199 | 173 | 165 | 115 |
| 7 | 5 | 9 | 17 | 18 | 540 | 510 | 466 | 461 | 432 |
| 8 | 4 | 3 | 5  | 6  | 412 | 385 | 347 | 315 | 294 |
| 9 | 4 | 1 | 1  | 2  | 472 | 430 | 358 | 301 | 297 |

**Nine totals — Sugar Cane:**
- Par: 36
- Black: 3,671 | Blue: 3,361 | White: 2,984 | Yellow: 2,736 | Red: 2,510

---

### TAPIOCA — 9 Holes

| Hole | Par | HCP | Combo HCP (SC+T) | Combo HCP (T+P) | Black | Blue | White | Yellow | Red |
|------|-----|-----|------------------|-----------------|-------|------|-------|--------|-----|
| 1 | 4 | 7 | 14 | 13 | 424 | 387 | 352 | 344 | 262 |
| 2 | 5 | 8 | 16 | 15 | 612 | 577 | 507 | 455 | 430 |
| 3 | 3 | 5 | 10 | 9  | 235 | 206 | 171 | 140 | 122 |
| 4 | 5 | 3 | 6  | 5  | 582 | 558 | 521 | 489 | 437 |
| 5 | 4 | 6 | 12 | 11 | 396 | 365 | 342 | 306 | 300 |
| 6 | 4 | 1 | 2  | 1  | 443 | 424 | 356 | 333 | 315 |
| 7 | 3 | 9 | 18 | 17 | 172 | 145 | 127 | 118 | 101 |
| 8 | 4 | 4 | 8  | 7  | 467 | 425 | 384 | 369 | 335 |
| 9 | 4 | 2 | 4  | 3  | 435 | 397 | 360 | 319 | 314 |

**Nine totals — Tapioca:**
- Par: 36
- Black: 3,766 | Blue: 3,484 | White: 3,120 | Yellow: 2,873 | Red: 2,616

---

### PINEAPPLE — 9 Holes

| Hole | Par | HCP | Combo HCP (T+P) | Combo HCP (P+SC) | Black | Blue | White | Yellow | Red |
|------|-----|-----|-----------------|------------------|-------|------|-------|--------|-----|
| 1 | 4 | 5 | 10 | 9  | 407 | 378 | 291 | 284 | 252 |
| 2 | 5 | 8 | 16 | 15 | 567 | 539 | 475 | 432 | 429 |
| 3 | 3 | 3 | 6  | 5  | 235 | 197 | 175 | 148 | 114 |
| 4 | 4 | 4 | 8  | 7  | 407 | 375 | 339 | 315 | 270 |
| 5 | 4 | 9 | 18 | 17 | 372 | 349 | 320 | 290 | 286 |
| 6 | 5 | 2 | 4  | 3  | 580 | 551 | 514 | 473 | 439 |
| 7 | 4 | 1 | 2  | 1  | 463 | 423 | 384 | 358 | 325 |
| 8 | 3 | 7 | 14 | 13 | 184 | 165 | 151 | 143 | 118 |
| 9 | 4 | 6 | 12 | 11 | 437 | 404 | 366 | 351 | 303 |

**Nine totals — Pineapple:**
- Par: 36
- Black: 3,652 | Blue: 3,381 | White: 3,015 | Yellow: 2,794 | Red: 2,536

---

## Step 4 — Combination Handicap Pairings

The course uses combination stroke indexes for 18-hole rounds across nines. Store these in whatever `combination_handicaps` or `course_pairings` table exists (check schema). If no table exists, store as JSONB on the course record.

| 18-Hole Combination | Nine A | Nine B |
|---------------------|--------|--------|
| Sugar Cane + Tapioca | Sugar Cane HCPs: 15,13,9,3,11,7,17,5,1 | Tapioca HCPs: 14,16,10,6,12,2,18,8,4 |
| Tapioca + Pineapple | Tapioca HCPs: 13,15,9,5,11,1,17,7,3 | Pineapple HCPs: 10,16,6,8,18,4,2,14,12 |
| Pineapple + Sugar Cane | Pineapple HCPs: 9,15,5,7,17,3,1,13,11 | Sugar Cane HCPs: 16,14,10,4,12,8,18,6,2 |

---

## Step 5 — Verify the Insert

```sql
-- Confirm course exists
SELECT id, name, total_holes FROM courses WHERE name ILIKE '%siam plantation%';

-- Confirm hole counts per nine
SELECT nine_name, COUNT(*) as hole_count, SUM(par) as total_par
FROM course_holes  -- adjust table name
WHERE course_id = <your_course_id>
GROUP BY nine_name;

-- Expected: 3 rows, each showing 9 holes and par 36
```

---

## Notes for Hal
- **Surgical only** — no changes to any other course records
- If schema uses a different column name convention (snake_case vs camelCase), match it exactly
- If `tee_sets` is a separate table, insert tee records before hole yardages
- The JSON source file is at: `siam_plantation_scorecard.json` in the project root
- If any ambiguity on schema, stop and ask before inserting
