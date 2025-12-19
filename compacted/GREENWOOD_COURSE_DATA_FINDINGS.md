# Greenwood Golf & Resort - Course Data Investigation Report

**Date:** 2025-11-10
**Project:** MciPro Golf Platform
**Database:** Supabase (https://pyeeplwsnupmhgbguwqs.supabase.co)

---

## Executive Summary

After comprehensive search of the MciPro codebase and SQL files, **Greenwood Golf & Resort course data is NOT found in any SQL files in the repository**. However, references to Greenwood exist in:
1. Society event schedules (TRGG golf society)
2. Scorecard OCR profile configuration
3. Caddy management system

---

## Findings

### 1. Database Tables for Golf Courses

Based on the codebase analysis, the database should contain these tables:

**Table: `courses`**
- Primary key: `id` (TEXT)
- Columns likely include:
  - `id` - Course identifier (e.g., 'bangpakong', 'burapha_east')
  - `name` - Full course name
  - `scorecard_url` - Path to scorecard image
  - `location` - Course location
  - `country` - Country (e.g., 'Thailand')
  - `created_at` - Timestamp
  - `updated_at` - Timestamp

**Table: `course_holes`**
- Contains hole-by-hole data for each course
- Columns likely include:
  - `course_id` - Foreign key to courses.id
  - `hole_number` - 1-18
  - `par` - Par for the hole (3, 4, or 5)
  - `stroke_index` - Handicap stroke index (1-18)
  - `yardage` - Distance in yards
  - `tee_marker` - Tee color (e.g., 'white', 'blue', 'red')

### 2. Where Greenwood References Were Found

#### A. Society Events (TRGG Golf Society Schedule)
**Files:**
- `C:\Users\pete\Documents\MciPro\sql\import-trgg-october-schedule.sql`
- `C:\Users\pete\Documents\MciPro\sql\import-trgg-november-schedule.sql`
- `C:\Users\pete\Documents\MciPro\sql\RESTORE_EVENTS_FINAL.sql`
- `C:\Users\pete\Documents\MciPro\sql\RESTORE_ALL_SOCIETY_EVENTS_FIXED.sql`
- `C:\Users\pete\Documents\MciPro\trgg_schedule.json`

**Greenwood Events:**
- October 25, 2025 - "TRGG - Greenwood"
- November 1, 2025 - "TRGG - GREENWOOD"
- November 10, 2025 - "TRGG - GREENWOOD (2 WAY)"
- November 25, 2025 - "TRGG - GREENWOOD (2 WAY)"

**Usage:** These files insert society events that reference "GREENWOOD" as the course name, but do NOT insert course or hole data.

#### B. Scorecard OCR Profile
**File:** `C:\Users\pete\Documents\MciPro\public\scorecard_profiles\greenwood.yaml`

**Purpose:** OCR template configuration for scanning Greenwood scorecards
**Contains:**
- Course name: "Greenwood Golf & Resort"
- Course ID: "greenwood"
- Tee information (Championship, Men, Regular, Senior, Ladies)
- OCR region definitions for extracting hole data from scorecard images
- Does NOT contain actual par/yardage data - this is an OCR template

#### C. Course Admin Accounts
**File:** `C:\Users\pete\Documents\MciPro\sql\create-course-admin-accounts.sql`

**Reference:** Creates admin account for "GreenWood Golf Club"
- Username: 'greenwood-golf'
- Display Name: 'GreenWood Admin'
- Password: '111111'
- PIN: '1111'

#### D. Caddy Management
**Files:**
- `C:\Users\pete\Documents\MciPro\sql\insert-sample-caddies.sql`
- `C:\Users\pete\Documents\MciPro\sql\create-caddy-management-system.sql`

**References:** Sample caddy data for Greenwood Golf Club
- 5 sample caddies assigned to course_id: 'greenwood-golf'

### 3. What is NOT in the Codebase

**CRITICAL FINDING:** There are NO SQL files that contain:
```sql
INSERT INTO courses (...) VALUES (...greenwood...);
INSERT INTO course_holes (course_id, hole_number, par, ...) VALUES ('greenwood', ...);
```

### 4. Courses That DO Have Complete Data

The following courses have full course + hole data in SQL files:
- Bangpakong Riverside Country Club
- Burapha Golf Club (East & West courses)
- Khao Kheow Country Club (A+B, A+C, B+C combinations)
- Pattaya Country Club
- Royal Lakeside Golf Club
- Siam Country Club
- Siam Plantation Golf Club
- Crystal Bay Golf Club
- Pattana Golf Resort
- Pattavia Golf Club
- Pleasant Valley Golf Club
- Plutaluang Royal Thai Navy Golf Course
- Grand Prix Golf Club
- Mountain Shadow Golf Club
- Eastern Star Golf Club
- Laem Chabang International Country Club

### 5. Expected Greenwood Data (if it exists in database)

If Greenwood Golf & Resort data exists in the Supabase database, it would likely have:

**Course ID possibilities:**
- `greenwood`
- `greenwood_golf`
- `greenwood-golf`

**Expected structure:**
```sql
-- In courses table
id: 'greenwood' or 'greenwood_golf'
name: 'Greenwood Golf & Resort' or 'GreenWood Golf Club'

-- In course_holes table
18 hole records with:
- hole_number: 1-18
- par values (Front 9 + Back 9 should total 72, typically)
- stroke_index: 1-18 (handicap index)
- yardage: per hole
- tee_marker: 'white', 'blue', 'red', etc.
```

---

## How to Verify Database Contents

### Option 1: Run the Verification SQL Script

I've created a comprehensive SQL script to search for Greenwood data:

**File:** `C:\Users\pete\Documents\MciPro\sql\FIND_GREENWOOD_DATA.sql`

**Instructions:**
1. Go to Supabase Dashboard: https://pyeeplwsnupmhgbguwqs.supabase.co
2. Navigate to SQL Editor
3. Copy and paste the contents of `FIND_GREENWOOD_DATA.sql`
4. Run the script
5. Review the results to see if Greenwood exists in the database

### Option 2: Direct Database Queries

Use these queries in Supabase SQL Editor:

```sql
-- Search for Greenwood in courses table
SELECT * FROM courses
WHERE LOWER(name) LIKE '%greenwood%'
   OR LOWER(id) LIKE '%greenwood%';

-- Search for Greenwood hole data
SELECT ch.*, c.name as course_name
FROM course_holes ch
LEFT JOIN courses c ON ch.course_id = c.id
WHERE LOWER(ch.course_id) LIKE '%greenwood%'
   OR LOWER(c.name) LIKE '%greenwood%';

-- List all available courses
SELECT id, name FROM courses ORDER BY name;
```

### Option 3: Using Supabase Client (JavaScript)

```javascript
// In browser console or Node.js with Supabase client
const { createClient } = supabase;
const supabaseUrl = 'https://pyeeplwsnupmhgbguwqs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk';
const db = createClient(supabaseUrl, supabaseKey);

// Search for Greenwood
const { data: courses, error } = await db
  .from('courses')
  .select('*')
  .ilike('name', '%greenwood%');

console.log('Greenwood courses:', courses);

// Get hole data if course found
if (courses && courses.length > 0) {
  const courseId = courses[0].id;
  const { data: holes } = await db
    .from('course_holes')
    .select('*')
    .eq('course_id', courseId)
    .order('hole_number');
  console.log('Greenwood holes:', holes);
}
```

---

## Conclusions

1. **Greenwood Golf & Resort course data is NOT in the SQL files** - no INSERT statements exist in the repository

2. **Greenwood is referenced in:**
   - Society event schedules (as a venue name)
   - Admin account creation
   - Caddy assignments
   - OCR scorecard template

3. **To find if the data exists in the database:**
   - Run the verification SQL script: `sql/FIND_GREENWOOD_DATA.sql`
   - Or use the direct queries above in Supabase SQL Editor

4. **If Greenwood data exists in the database:**
   - It was likely inserted manually via Supabase SQL Editor
   - Or through the application's course management UI
   - It was NOT checked into the repository

5. **If Greenwood data does NOT exist in the database:**
   - The course may only exist as a venue name in events
   - It may need to be added using the same pattern as other courses

---

## Next Steps

### To Add Greenwood Golf & Resort Data

If the course data doesn't exist in the database, you can create an INSERT script following this template:

```sql
-- Insert Greenwood Golf & Resort
INSERT INTO courses (id, name, scorecard_url, location, country, created_at)
VALUES (
  'greenwood',
  'Greenwood Golf & Resort',
  '/public/assets/scorecards/greenwood.jpg',
  'Pattaya, Chonburi',
  'Thailand',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    updated_at = NOW();

-- Insert hole data (example - replace with actual scorecard data)
DELETE FROM course_holes WHERE course_id = 'greenwood';

INSERT INTO course_holes (course_id, hole_number, par, stroke_index, yardage, tee_marker)
VALUES
-- Front 9 (replace with actual data from scorecard)
('greenwood', 1, 4, 11, 380, 'white'),
('greenwood', 2, 5, 3, 520, 'white'),
('greenwood', 3, 3, 17, 165, 'white'),
-- ... continue for all 18 holes
('greenwood', 18, 4, 14, 370, 'white');
```

### To Verify Existing Data

1. Run `sql/FIND_GREENWOOD_DATA.sql` in Supabase SQL Editor
2. Check the results to confirm if Greenwood exists
3. If it exists, the query will return:
   - Course ID
   - Course name
   - 18 hole records with par, stroke index, yardage

---

## Files Created During Investigation

1. `C:\Users\pete\Documents\MciPro\sql\FIND_GREENWOOD_DATA.sql` - Comprehensive verification script
2. `C:\Users\pete\Documents\MciPro\GREENWOOD_COURSE_DATA_FINDINGS.md` - This report

---

## Contact Information

**Supabase Database:**
- URL: https://pyeeplwsnupmhgbguwqs.supabase.co
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk

**Project Directory:**
- C:\Users\pete\Documents\MciPro
