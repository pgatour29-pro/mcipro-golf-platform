=============================================================================
NEXT SESSION - PRIORITY TASK LIST
=============================================================================
Date Created: 2025-10-11
Status: 🔴 PENDING - Ready for Next Claude Session
Priority: HIGH

Read this file FIRST before starting any work in the next session.
Also read: 2025-10-11_Mobile_Header_and_Profile_Data_Fix.md for context.

=============================================================================
📋 TASK 1: IMPROVE HEADER TABS DESIGN
=============================================================================
Priority: MEDIUM
Estimated Time: 1-2 hours
Complexity: LOW

CURRENT STATE:
- Header tabs are functional but basic design
- Mobile: tabs wrap to multiple rows
- Desktop: tabs in single horizontal row
- Tabs: Overview, Booking, Schedule, Food & Dining, Order Status, Statistics, GPS & Navigation

IMPROVEMENT GOALS:
□ Better visual design (colors, spacing, borders)
□ Active tab should be more prominent
□ Hover states more noticeable
□ Mobile-friendly touch targets (larger tap areas)
□ Consider icon-only mode on small screens
□ Smooth transitions between tabs
□ Badge notifications more visible (Order Status has badge)

DESIGN CONSIDERATIONS:
- Must work on both mobile and desktop
- Don't break existing tab switching functionality
- Keep Material Icons for consistency
- Consider gradient or shadow effects
- Responsive font sizes already implemented

FILES TO MODIFY:
- index.html (lines ~20764-20820: golfer navigation tabs)
- Similar tabs exist for other dashboards (caddie, manager, etc.)

CSS CLASSES TO ENHANCE:
- .tab-button
- .tab-button.active
- Badge styling for notification counts

REFERENCE:
- Current active tab: green underline
- Current hover: slight opacity change
- Material Design guidelines for tabs

TESTING CHECKLIST:
□ Test on mobile (320px width)
□ Test on tablet (768px width)
□ Test on desktop (1920px width)
□ Click each tab - verify active state
□ Check badge visibility on Order Status tab
□ Verify no horizontal scroll on small screens

=============================================================================
📋 TASK 2: IMPLEMENT NEW GAME FORMATS FOR SCORECARD
=============================================================================
Priority: HIGH
Estimated Time: 3-4 hours
Complexity: MEDIUM-HIGH

CURRENT STATE:
- Live Scorecard supports 2 formats:
  1. Stableford (Thailand rules)
  2. Stroke Play
- Location: index.html (LiveScorecardManager around line 30500+)
- Calculation works correctly with handicap strokes

NEW FORMATS TO ADD:
□ Match Play
□ Best Ball
□ Scramble
□ Modified Stableford
□ Skins Game
□ Nassau
□ Four Ball
□ Foursomes

IMPLEMENTATION STEPS:

STEP 1: Update Format Selection UI
Location: index.html line ~22260 (format dropdown in Live Scorecard tab)

Current:
```html
<select id="scorecardFormat" class="form-select">
    <option value="stableford">Stableford</option>
    <option value="strokeplay">Stroke Play</option>
</select>
```

Add:
```html
<option value="matchplay">Match Play</option>
<option value="bestball">Best Ball</option>
<option value="scramble">Scramble</option>
<option value="modifiedstableford">Modified Stableford</option>
<option value="skins">Skins Game</option>
<option value="nassau">Nassau</option>
<option value="fourball">Four Ball</option>
<option value="foursomes">Foursomes</option>
```

STEP 2: Add Calculation Functions
Location: index.html LiveScorecardManager class

For each format, add:
- calculateMatchPlayScore(player1, player2, holes)
- calculateBestBallScore(team, holes)
- calculateScrambleScore(team, holes)
- calculateModifiedStablefordScore(player, holes)
- calculateSkinsScore(players, holes)
- calculateNassauScore(players, holes)
- calculateFourBallScore(team1, team2, holes)
- calculateFoursomesScore(team, holes)

STEP 3: Update Leaderboard Display
Location: index.html getGroupLeaderboard() (line ~31442)

Current shows:
- Position, Player, Thru, Points/Gross

Need to add format-specific columns:
- Match Play: Up/Down vs opponent
- Best Ball: Team score, individual scores
- Scramble: Team score only
- Skins: Skins won, total value
- Nassau: Front/Back/Total points

STEP 4: Update Score Entry Logic
Location: index.html saveCurrentScore() (line ~31206)

Considerations:
- Match Play: need opponent comparison
- Best Ball: record all players, show best
- Scramble: everyone records same score after shot selection
- Skins: track ties and carryovers

RESEARCH NEEDED:
□ Match Play scoring rules (halve, win, lose)
□ Modified Stableford point values (different from standard)
□ Nassau rules (front 9, back 9, overall)
□ Skins carryover rules

FILES TO REFERENCE:
- compacted/2025-10-11_LiveScorecard_Complete_Overhaul.md
  - Lines 345-382: Current Stableford calculation
  - Shows handicap stroke allocation formula
  - Use same course data structure

TESTING CHECKLIST:
□ Test each format with 2-4 players
□ Verify handicap strokes apply correctly
□ Check leaderboard updates in real-time
□ Test offline mode (all formats should work)
□ Verify calculations match official rules
□ Test edge cases (ties, perfect scores, etc.)

DATABASE CONSIDERATIONS:
- Scorecard format stored in scorecards table
- Scores table has same structure (hole, gross, net, stableford)
- May need additional fields for team formats
- Consider adding format_specific_data JSONB column

=============================================================================
📋 TASK 3: FIX BANGPAKONG BACK NINE DATA
=============================================================================
Priority: HIGH
Estimated Time: 30 minutes
Complexity: LOW

CURRENT STATE:
- Bangpakong course data stored in Supabase course_holes table
- Front nine (holes 1-9): ✅ CORRECT
- Back nine (holes 10-18): ❌ INCORRECT hole numbers and stroke indices
- File reference: sql/update_real_course_data.sql (has correct data)

PROBLEM DETAILS:
User report: "Bangpakong scorecard hole and index on the back nine is incorrect"

CORRECT DATA (from real scorecard):
```
Hole 10: Par 4, Index 9
Hole 11: Par 4, Index 7
Hole 12: Par 4, Index 3
Hole 13: Par 3, Index 17
Hole 14: Par 5, Index 5
Hole 15: Par 3, Index 11
Hole 16: Par 4, Index 15
Hole 17: Par 4, Index 13
Hole 18: Par 5, Index 1
```

Total Par: 71 (Front 9: 36, Back 9: 35)

VERIFICATION STEP:
Before fixing, check what's currently in database:

```sql
-- Run in Supabase SQL Editor
SELECT hole_number, par, stroke_index, yardage
FROM course_holes
WHERE course_id = 'bangpakong'
  AND tee_marker = 'white'
  AND hole_number >= 10
ORDER BY hole_number;
```

FIX SQL:
Create: sql/fix_bangpakong_back_nine.sql

```sql
-- Fix Bangpakong back nine hole numbers and stroke indices
-- Verified from actual scorecard photo: screenshots/scorecards/Bangpakong.jpg

UPDATE course_holes
SET stroke_index = CASE hole_number
    WHEN 10 THEN 9
    WHEN 11 THEN 7
    WHEN 12 THEN 3
    WHEN 13 THEN 17
    WHEN 14 THEN 5
    WHEN 15 THEN 11
    WHEN 16 THEN 15
    WHEN 17 THEN 13
    WHEN 18 THEN 1
END
WHERE course_id = 'bangpakong'
  AND tee_marker = 'white'
  AND hole_number BETWEEN 10 AND 18;

-- Verify the fix
SELECT hole_number, par, stroke_index, yardage
FROM course_holes
WHERE course_id = 'bangpakong'
  AND tee_marker = 'white'
ORDER BY hole_number;

-- Expected result:
-- Hole 1: Par 4, Index 14
-- Hole 2: Par 4, Index 12
-- Hole 3: Par 5, Index 4
-- ...
-- Hole 10: Par 4, Index 9
-- Hole 11: Par 4, Index 7
-- Hole 12: Par 4, Index 3
-- ...
```

TESTING CHECKLIST:
□ Run verification query to see current data
□ Run fix SQL in Supabase
□ Verify all 18 holes have correct indices
□ Clear course cache: localStorage.removeItem('mcipro_course_bangpakong')
□ Start new Live Scorecard round at Bangpakong
□ Play through holes 10-18
□ Verify handicap strokes applied correctly
□ Check stableford points calculated correctly

FILES INVOLVED:
- sql/fix_bangpakong_back_nine.sql (create this)
- index.html (LiveScorecardManager - no code changes needed)
- Supabase course_holes table

REFERENCE:
- scorecard_profiles/Bangpakong.jpg (original scorecard photo)
- compacted/2025-10-11_LiveScorecard_Complete_Overhaul.md
  - Lines 117-119: Bangpakong stroke indices listed

=============================================================================
📋 TASK 4: SOCIETY EVENTS - BOOKING & CADDY INTEGRATION
=============================================================================
Priority: HIGH
Estimated Time: 4-5 hours
Complexity: HIGH

CURRENT STATE:
- Society Events system exists (Organizer creates events, Golfers register)
- Registration flow: Browse events → Register → Confirmation
- Booking system exists separately (Golfer books tee times at courses)
- Caddy booking exists in booking system
- NO INTEGRATION between society events and golf course bookings

USER REQUIREMENT:
"Registering in Society events, needs the ability to find the booking at the golf course and book caddy from the society event card"

DESIRED FLOW:
1. Golfer sees society event (e.g., "Travellers Rest - Oct 15 at Bangpakong")
2. Golfer registers for event
3. System shows: "Do you want to book your tee time now?"
4. System auto-fills booking form with event details:
   - Course: Bangpakong
   - Date: Oct 15
   - Time: Event tee time
5. Golfer can add caddy request to booking
6. Booking linked to society event registration
7. Event card shows: "✅ Registered | 🏌️ Tee Time Booked | 👤 Caddy Requested"

IMPLEMENTATION PLAN:

PART 1: Add Booking Link to Event Registration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Location: index.html (GolferEventsSystem around line 31700+)

Step 1: Update Event Registration Modal
Add booking section after successful registration:

```html
<!-- After registration confirmation -->
<div class="mt-4 p-4 bg-blue-50 rounded-lg">
    <h4 class="font-semibold mb-2">📅 Book Your Tee Time</h4>
    <p class="text-sm text-gray-600 mb-3">
        Reserve your tee time at {{ course_name }} for {{ event_date }}
    </p>
    <button onclick="GolferEventsSystem.quickBookFromEvent('{{ event_id }}')"
            class="btn-primary w-full">
        Book Tee Time & Caddy
    </button>
</div>
```

Step 2: Create Quick Book Function
```javascript
async quickBookFromEvent(eventId) {
    // Get event details
    const event = await SocietyGolfDB.getEvent(eventId);

    // Pre-fill booking form
    const bookingData = {
        course: event.course_id,
        date: event.date,
        time: event.tee_time,
        players: 1, // User + option to add more
        requestCaddy: false, // User can toggle
        eventId: eventId, // Link booking to event
        eventName: event.title
    };

    // Open booking modal with pre-filled data
    BookingManager.openBookingModalWithData(bookingData);
}
```

Step 3: Update Booking System to Accept Pre-fill Data
Location: index.html (BookingManager around line 11500+)

```javascript
openBookingModalWithData(data) {
    this.openBookingModal();

    // Pre-fill form fields
    document.getElementById('bookingCourse').value = data.course;
    document.getElementById('bookingDate').value = data.date;
    document.getElementById('bookingTime').value = data.time;
    document.getElementById('bookingPlayers').value = data.players;
    document.getElementById('requestCaddy').checked = data.requestCaddy;

    // Store event link
    this.currentEventBooking = {
        eventId: data.eventId,
        eventName: data.eventName
    };
}
```

PART 2: Link Bookings to Event Registrations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Database Changes:

Option A: Add event_id to bookings table
```sql
-- Add to bookings table (if exists in Supabase)
ALTER TABLE bookings
ADD COLUMN event_id UUID REFERENCES society_events(id),
ADD COLUMN event_name TEXT;

-- Index for quick lookups
CREATE INDEX idx_bookings_event_id ON bookings(event_id);
```

Option B: Store in localStorage booking object
```javascript
booking.linkedEvent = {
    eventId: 'evt_123',
    eventName: 'Travellers Rest Round',
    registrationId: 'reg_456'
};
```

PART 3: Update Event Card to Show Booking Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Location: index.html (GolferEventsSystem.renderEventCard)

Add status indicators:
```html
<div class="flex items-center space-x-2 text-xs">
    <!-- Registration status -->
    <span class="px-2 py-1 bg-green-100 text-green-800 rounded">
        ✅ Registered
    </span>

    <!-- Booking status -->
    <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded">
        🏌️ Tee Time Booked
    </span>

    <!-- Caddy status -->
    <span class="px-2 py-1 bg-purple-100 text-purple-800 rounded">
        👤 Caddy Requested
    </span>
</div>
```

Logic to check booking status:
```javascript
async getEventBookingStatus(eventId, userId) {
    // Check if user has booking for this event
    const bookings = BookingManager.getAllBookings();
    const eventBooking = bookings.find(b =>
        b.linkedEvent?.eventId === eventId &&
        b.userId === userId
    );

    return {
        hasBooking: !!eventBooking,
        hasCaddy: eventBooking?.requestCaddy || false,
        bookingDetails: eventBooking
    };
}
```

PART 4: Add Caddy Selection to Event Registration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Update registration modal to include caddy request:

```html
<div class="form-group">
    <label class="flex items-center">
        <input type="checkbox" id="eventRequestCaddy" class="mr-2">
        <span>Request Caddy (฿400)</span>
    </label>
</div>

<!-- If checked, show caddy preferences -->
<div id="caddyPreferences" style="display: none;">
    <select id="caddyGender" class="form-select">
        <option value="">No preference</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
    </select>
    <select id="preferredCaddy" class="form-select">
        <option value="">No specific caddy</option>
        <!-- Load from caddy database -->
    </select>
</div>
```

PART 5: Event Organizer View
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Organizers need to see:
- Who has booked tee times
- Who has requested caddies
- Aggregate caddy needs for course communication

Add to Organizer Roster view:
```
Name          | HCP | Tee Time | Caddy    | Transport | Competition
Pete Park     | 1   | ✅ 7:00  | ✅ Male  | ✅        | ✅
John Doe      | 18  | ❌ None  | ❌ None  | ❌        | ✅
...
```

DATABASE SCHEMA ADDITIONS:

If using Supabase bookings table:
```sql
-- Create or modify bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    num_players INTEGER DEFAULT 1,
    request_caddy BOOLEAN DEFAULT FALSE,
    caddy_preferences JSONB,
    event_id UUID REFERENCES society_events(id),
    event_name TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

TESTING CHECKLIST:
□ Register for society event
□ Click "Book Tee Time" button
□ Verify booking form pre-filled correctly
□ Select caddy request
□ Submit booking
□ Verify booking appears in "My Bookings"
□ Verify booking linked to event (check localStorage or DB)
□ Go back to event card
□ Verify status badges show: ✅ Registered, 🏌️ Booked, 👤 Caddy
□ Test as organizer - see roster with booking/caddy status
□ Test editing booking from event card
□ Test canceling booking - verify event status updates

FILES TO MODIFY:
- index.html:
  - GolferEventsSystem (registration modal, event cards)
  - BookingManager (pre-fill function)
  - SocietyOrganizerManager (roster view)
- Supabase schema (if using database bookings)

REFERENCE:
- compacted/FIX_RealTime_Sync_Organizer_Stats_2025-10-10.txt
  - Shows event registration system structure
- compacted/ORGANIZER_EVENTS_SYSTEM_TODO.txt
  - Shows organizer roster requirements

POTENTIAL ISSUES:
⚠️ Booking system might store only in localStorage
⚠️ Need to sync booking status across devices
⚠️ Caddy database might not exist yet
⚠️ Course tee time availability not tracked
⚠️ Multiple bookings for same event (if user changes mind)

=============================================================================
📊 TASK PRIORITY SUMMARY
=============================================================================

MUST DO FIRST:
1. Task 3: Fix Bangpakong data (30 min) ← QUICK WIN
2. Task 4: Society events booking integration (4-5 hrs) ← HIGH VALUE

CAN DO AFTER:
3. Task 2: New game formats (3-4 hrs) ← COMPLEX
4. Task 1: Header tabs design (1-2 hrs) ← POLISH

ESTIMATED TOTAL TIME: 9-12 hours for all tasks

=============================================================================
🔧 DEVELOPMENT ENVIRONMENT SETUP
=============================================================================

Before starting, ensure:
□ Git repo is up to date: `git pull`
□ Check for uncommitted changes: `git status`
□ Read previous session docs in compacted/ folder
□ Verify Supabase credentials in supabase-config.js
□ Test app loads correctly: https://mycaddipro.com
□ Check console for errors on page load

Tools needed:
- VS Code (or text editor)
- Chrome DevTools (for mobile testing)
- Supabase Dashboard access
- Git command line
- Screenshots in scorecard_profiles/ folder

=============================================================================
📝 COMMIT MESSAGE GUIDELINES
=============================================================================

Format:
```
[Component] Brief description (max 50 chars)

- Detailed change 1
- Detailed change 2
- Why this change was needed

Fixes: #issue-number (if applicable)
Testing: What was tested
```

Examples:
```
[LiveScorecard] Add Match Play format

- Add matchplay option to format dropdown
- Implement calculateMatchPlayScore() function
- Update leaderboard to show up/down vs opponent
- Add match play rules documentation

Testing: Tested with 2 players, 18 holes
```

```
[SocietyEvents] Link event registration to tee time booking

- Add quickBookFromEvent() function
- Pre-fill booking form with event details
- Show booking status badges on event card
- Update organizer roster to show booking/caddy status

Testing: Full flow from event registration to booking confirmation
```

=============================================================================
🚀 DEPLOYMENT CHECKLIST
=============================================================================

After completing each task:
□ Test locally (hard refresh to clear cache)
□ Test on mobile (Chrome DevTools device mode)
□ Check console for errors
□ Commit changes with descriptive message
□ Push to GitHub: `git push`
□ Wait 1-2 minutes for Netlify deployment
□ Test on live site: https://mycaddipro.com
□ Document any issues in compacted/ folder

If something breaks:
□ Check Netlify build logs
□ Revert commit if needed: `git revert HEAD`
□ Push revert immediately
□ Document what went wrong in compacted/

=============================================================================
❓ QUESTIONS TO ASK USER BEFORE STARTING
=============================================================================

TASK 1 - Header Tabs:
- What specific design improvements? (colors, effects, animations?)
- Any design mockups or references to follow?
- Should all dashboards (golfer, caddy, manager) have same design?

TASK 2 - Game Formats:
- Which format is highest priority?
- Are there specific rule variations to follow?
- Should all formats support team play?
- Any maximum number of players per format?

TASK 3 - Bangpakong:
- Just back nine or verify entire course?
- Any other courses with incorrect data?

TASK 4 - Society Events Booking:
- Should booking be required or optional?
- Should caddy booking happen during event registration or separately?
- Does course have tee time availability system?
- How should organizer communicate with course about caddies?

=============================================================================
📚 ADDITIONAL RESOURCES
=============================================================================

Documentation to read:
- compacted/2025-10-11_Mobile_Header_and_Profile_Data_Fix.md (this session)
- compacted/2025-10-11_LiveScorecard_Complete_Overhaul.md (scorecard system)
- compacted/QUICK_REFERENCE.md (system overview)
- compacted/TECHNICAL_SUMMARY.md (architecture)

Code locations:
- LiveScorecardManager: index.html line ~30500
- GolferEventsSystem: index.html line ~31700
- BookingManager: index.html line ~11500
- SocietyOrganizerManager: index.html line ~26200

SQL files location:
- sql/ folder (all database queries)

Scorecard photos:
- scorecard_profiles/ folder

=============================================================================
✅ FINAL REMINDERS
=============================================================================

1. READ DOCUMENTATION FIRST (especially previous session issues)
2. TEST BEFORE COMMITTING (mobile and desktop)
3. ASK CLARIFYING QUESTIONS (don't assume)
4. PUSH COMMITS TO DEPLOY (local commits don't deploy)
5. ADD LOGGING FOR DEBUGGING (console.log with [Component] prefix)
6. DOCUMENT YOUR WORK (update this file with completions)
7. CREATE SQL IN sql/ FOLDER (not root)
8. HARD REFRESH TO TEST (Ctrl+Shift+R)

Good luck! 🚀

=============================================================================
END OF TASK LIST
=============================================================================
