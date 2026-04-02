# Task: Build "Post Score" & "Add Course via Scorecard OCR" Features

## Context
MyCaddiPro is a golf platform. The main app is in `public/index.html` (~105K lines).
The golfer dashboard already has a "Scorecard" tab (`golfer-scorecard`, line ~34817) which is for LIVE scoring during a round.

We need TWO new features that work ALONGSIDE the existing live scorecard:

## Feature 1: Quick Score Posting (Post Score)

### What
A way to submit a completed scorecard AFTER a round (without live hole-by-hole scoring).
Think of it as "I just played, let me log my scores."

### UI Location
Add a **"Post Score"** button/section at the TOP of the existing `golfer-scorecard` tab content (before the "Start New Round" section). Or create a prominent card on the golfer overview tab. Best approach: add it as a new mode toggle at the top of the scorecard tab: "Live Round" | "Post Score"

### Flow
1. User taps "Post Score" 
2. Selects course (same course dropdown as live scorecard, id=`scorecardCourseSelect`)
3. Optionally selects event (if it was a society event)
4. Enters scoring format (Stableford/Stroke/Match)
5. Enters date played (defaults to today)
6. Enters hole-by-hole scores in a simple grid:
   - Shows holes 1-9 (front) and 10-18 (back) in a compact table
   - Par for each hole auto-fills from course data
   - SI/stroke index auto-fills from course data
   - User enters gross score per hole
   - Net and stableford auto-calculate based on handicap
7. Shows totals: Front 9 / Back 9 / Total (gross, net, stableford)
8. Submit → saves to `scorecards` table (status='completed') and `scores` table
9. Success toast + optional: "Share to society leaderboard?"

### Data
- Uses existing `scorecards` and `scores` tables
- Status = 'completed' (not 'in_progress' like live rounds)
- Set `started_at` and `completed_at` to the selected date
- Player info from `AppState.currentUser`

### Course Data Loading
The app already loads course data when starting a live round. Reuse that:
- `golf_courses_data` table in Supabase has hole data (par, SI, yardage)  
- The existing `LiveScorecardManager` loads this. Extract/reuse that loading logic.

## Feature 2: Add-a-Course via Scorecard Photo (OCR)

### What
When a course isn't in the system, let users photograph a scorecard and auto-create the course.
Tesseract.js is ALREADY loaded (line 142 of index.html).

### UI Location  
Enhance the EXISTING "Can't find your course?" link (line ~34877) which currently opens `courseRequestModal`. 
Add an OCR option to this flow.

### Flow
1. User can't find course → taps "Can't find your course?"
2. Enhanced modal opens with two paths:
   - **Path A: Submit Request** (existing - sends to admin for manual add)
   - **Path B: Quick Add with Scorecard Photo** (NEW)
3. Path B:
   a. User enters course name and location
   b. User takes photo / uploads scorecard image
   c. Tesseract OCR runs on the image
   d. App extracts: hole numbers, par values, stroke indices, yardages
   e. Shows extracted data in an editable table for user to review/correct
   f. User confirms → course is created in `golf_courses_data` table
   g. Course immediately appears in the dropdown
   h. User can now use it for scoring

### OCR Strategy
- Use Tesseract.js (already loaded globally)
- Scorecard photos typically have a grid layout
- Extract numbers row by row
- Parse columns: Hole#, Par, SI, Yards (Men/Women if possible)
- For 27-hole courses (like Khao Kheow), detect 3x9 format
- Fallback: manual entry form if OCR fails (MUST have this)

### Database
The course needs to go into `golf_courses_data` table. Check its schema:
```sql
-- Query the schema from Supabase to understand the structure
-- The select dropdown hardcodes courses, but golf_courses_data table has the actual hole data
```

The course dropdown in the scorecard tab is currently HARDCODED HTML options.  
New courses added via OCR should:
1. Insert into `golf_courses_data` table in Supabase
2. Dynamically add an `<option>` to the `scorecardCourseSelect` dropdown
3. Ideally, on page load, merge hardcoded courses with any user-added courses from DB

## Implementation Notes

### Files to modify
- `public/index.html` - the monolith (add HTML sections and JS logic)
  - Add Post Score UI section around line 34817 (golfer-scorecard tab)
  - Add/enhance OCR course creation modal
  - Add JavaScript functions for both features

### Existing code to reuse
- `LiveScorecardManager` - course data loading, event selection
- `openCourseRequestModal()` (line 12339) - existing course request flow
- `Tesseract` global (line 142) - OCR engine
- `SupabaseDB.client` - database operations
- `NotificationManager.show()` - toast notifications
- `LoadingManager.show()/hide()` - loading overlay
- `AppState.currentUser` - current user info
- Course data from `golf_courses_data` table

### Supabase config
- Project: pyeeplwsnupmhgbguwqs
- The app uses `window.SupabaseDB.client` for all DB operations

### Styling
- Match existing Tailwind CSS classes used throughout
- Use `premium-card` class for card containers
- Use `material-symbols-outlined` for icons
- Mobile-first, responsive
- Match the green gradient headers used in the scorecard section

### DO NOT
- Break existing live scorecard functionality
- Modify the core TabManager or showGolferTab logic
- Remove any existing courses from the dropdown
- Change authentication flow

## Testing
After building, verify:
1. Post Score form renders in the scorecard tab
2. Course selection populates pars/SI when course is selected
3. Score entry calculates net/stableford correctly
4. Submitting saves to Supabase (scorecards + scores tables)
5. OCR modal opens and can process an image
6. Manual fallback works when OCR fails
7. New course appears in dropdown after creation
8. Existing live scorecard still works
