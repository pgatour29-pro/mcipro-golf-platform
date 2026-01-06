# Session Commits - January 6, 2026

## Tee Sheet Society Integration Session

### Commits (newest first)

1. **10e15bd8** - Simplify: match caddy booking exact time to slot time
   - Final fix for Pete Park duplication
   - Golfers only appear in slot matching their exact tee_time

2. **0a4ac2df** - Fix slot assignment: first-come-first-served caddy bookings, skip event registrations
   - Removed event_registrations enrichment (caused duplicates)
   - Attempted first-come-first-served slot assignment

3. **9e88347c** - Fix Pete Park 12x: only show registered members on first slot (groupIndex=0)
   - Limited event registration enrichment to first slot only

4. **57ab7a9b** - Fix tee sheet issues: golfer slot matching, load delay, calendar preview
   - Added retry mechanism for initial load (2s + 3s retries)
   - Added fetchMonthSocietyEvents for calendar navigator
   - Fixed exact slot time matching for caddy bookings

5. **0589ae8c** - Fix: Fetch society events before rendering on date change and page load
   - Created fetchAndRender() async function
   - Ensures data fetched before render() called

6. **5db52ce4** - Add debugging logs for society events fetch
   - Added console logging for troubleshooting

7. **f79ac238** - Add more Treasure Hill course name variations to mapping
   - Added 't.hill', 't hill' to courseNameToId mapping

8. **31e15fd8** - Filter society events by selected course on tee sheet
   - Events only show for the selected course
   - Uses matchCourseToId() helper function

9. **02f6ecda** - Fix tee sheet course mapping - add Treasure Hill and many more courses
   - Comprehensive courseNameToId mapping
   - Covers all Thailand golf courses in database

10. **e7907be8** - Include draft/pending status in society events query
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
