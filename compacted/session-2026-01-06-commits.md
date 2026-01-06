# Session Commits - January 6, 2026

## Tee Sheet Society Integration Session

### Commits (newest first)

#### Part 2: Performance Optimization

1. **4d6bb6c9** - Render society events immediately, add caddy bookings after
   - Society events render first (instant)
   - Caddy bookings fetch and re-render after
   - Fixes slow initial load issue

2. **fb7a4234** - Revert to working caddy booking code with user_profiles lookup
   - Two sequential queries (caddy_bookings then user_profiles)
   - Ensures Pete Park name shows correctly

3. **ce554bdf** - Fix slow caddy booking load: retry clears all caches, auto-refresh 30s
   - clearAllCaches() helper function
   - Retry triggers if society OR caddy data empty
   - Auto-refresh reduced from 60s to 30s

4. **9a7ec5f3** - Optimize tee sheet loading: remove console.logs
   - Removed excessive console.log statements from render path

5. **6f59e903** - Fix Today button width - override date-control button 40px constraint
   - Added `.date-control .today-btn` selector for higher specificity
   - Set `width: auto` and `height: auto` to override parent constraints

6. **63ccddd3** - Shrink Today button text to fit inside button
   - Initial attempt at fixing Today button text overflow

#### Part 1: Society Integration (earlier)

7. **ab64f743** - Add Today button to tee sheet for quick navigation back to current date
   - Blue button in date control area
   - Calls todayISO() and fetchAndRender()

2. **10e15bd8** - Simplify: match caddy booking exact time to slot time
   - Final fix for Pete Park duplication
   - Golfers only appear in slot matching their exact tee_time

3. **0a4ac2df** - Fix slot assignment: first-come-first-served caddy bookings, skip event registrations
   - Removed event_registrations enrichment (caused duplicates)
   - Attempted first-come-first-served slot assignment

4. **9e88347c** - Fix Pete Park 12x: only show registered members on first slot (groupIndex=0)
   - Limited event registration enrichment to first slot only

5. **57ab7a9b** - Fix tee sheet issues: golfer slot matching, load delay, calendar preview
   - Added retry mechanism for initial load (2s + 3s retries)
   - Added fetchMonthSocietyEvents for calendar navigator
   - Fixed exact slot time matching for caddy bookings

6. **0589ae8c** - Fix: Fetch society events before rendering on date change and page load
   - Created fetchAndRender() async function
   - Ensures data fetched before render() called

7. **5db52ce4** - Add debugging logs for society events fetch
   - Added console logging for troubleshooting

8. **f79ac238** - Add more Treasure Hill course name variations to mapping
   - Added 't.hill', 't hill' to courseNameToId mapping

9. **31e15fd8** - Filter society events by selected course on tee sheet
   - Events only show for the selected course
   - Uses matchCourseToId() helper function

10. **02f6ecda** - Fix tee sheet course mapping - add Treasure Hill and many more courses
    - Comprehensive courseNameToId mapping
    - Covers all Thailand golf courses in database

11. **e7907be8** - Include draft/pending status in society events query
    - Events with draft status now show on tee sheet

### Database Changes

- Deleted incorrect event: `T.Hill` on Jan 23 at Treasure Hill (was duplicate)
  - ID: `0b3013e8-0bff-4efc-a039-0257f6e7ab38`

### Key Learnings

1. Society events create 12 slots for 1-hour event (5-min intervals)
2. Caddy bookings must match EXACT slot time, not event range
3. Event registrations != slot assignments (don't show on tee sheet)
4. Course name normalization critical for filtering
5. Async fetch must complete before render() called
6. **Two-phase rendering** - render society events first, add caddy bookings after
7. **user_id is LINE ID** - cannot use Supabase join, must do separate user_profiles lookup
8. **CSS specificity** - `.date-control button` has width:40px, must override with `.date-control .today-btn`
9. **Promise.all blocks on slowest** - don't wait for all queries if one is fast
10. **Cache clearing on retry** - must clear ALL caches (caddy, society, event reg) not just one

### Failed Optimization Attempts

1. **Supabase join for user_profiles** - `user_profiles!caddy_bookings_user_id_fkey` doesn't work because user_id is LINE ID, not a foreign key
2. **Background fetch with re-render** - fetching user names in background and calling render() didn't update the display correctly
3. **golfer_name column** - doesn't exist in caddy_bookings table
