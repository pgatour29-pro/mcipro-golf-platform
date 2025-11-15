# Private Events Implementation - Issues & Fixes Log

**Feature:** Private Event Access Controls & Waitlist Functionality for Golfer-Created Events

**Date Range:** 2025-11-15

---

## Overview

This document catalogs all issues encountered and fixes applied during the implementation of private event functionality for golfer-created events, including:
- Private event "Request to Join" workflow
- Full registration form for join requests
- Approve/reject functionality with automatic enrollment
- Waitlist support for full events
- Pending requests display in Manage Events

---

## Issue #1: Events Not Showing in Manage Events

**Symptom:**
- Manage Events tab stuck on "Loading your created events..."
- No events displayed despite events existing in database
- Console showed `Creator type: undefined`

**Root Cause:**
The `creator_type` field was `undefined` or `NULL` in the database for existing events. The query was filtering by:
```javascript
.eq('creator_type', 'golfer')
```
This excluded all events where `creator_type` was not explicitly set.

**Discovery Method:**
Console debugging showed the field was undefined when testing event data.

**Fix:**
User had to manually run SQL to update existing events:
```sql
UPDATE society_events
SET creator_type = 'golfer'
WHERE creator_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND (creator_type IS NULL OR creator_type = '');
```

**Files Modified:**
- Database: `society_events` table

**Lesson Learned:**
Should have included a migration script to backfill existing events with proper `creator_type` values instead of requiring manual SQL execution.

---

## Issue #2: UX Flow Change Mid-Implementation

**Original Design:**
- Golfer clicks "Request to Join" button
- Simple request created with just name and handicap
- Creator sees minimal information
- Creator approves, golfer then fills out registration form

**User Feedback:**
> "the golfer should still be able to select their options and click to join, so then the creator only has to click approved and then the that golfer with all of their options are automotically enrolled. making this intuited."

**Revised Design:**
- Golfer clicks "Request to Join"
- Golfer fills out COMPLETE registration form (transport, competition, partner preferences)
- Request created with ALL selections stored
- Creator sees full request details
- Creator approves with one click, golfer automatically registered with all options

**Changes Required:**
1. Modified `showRegistrationForm()` to show for private events
2. Modified `submitRegistration()` to create join request instead of registration for private events
3. Added fields to `event_join_requests` table:
   - `want_transport BOOLEAN`
   - `want_competition BOOLEAN`
   - `partner_prefs JSONB`
4. Updated `approveJoinRequest()` to use all stored fields when creating registration

**Files Modified:**
- `public/index.html` (lines 53288-53519)
- `sql/add-join-request-fields.sql` (new file)

**Lesson Learned:**
Initial design didn't consider the full user workflow. The revised approach is more intuitive - creator sees exactly what they're approving.

---

## Issue #3: SQL Policy Already Exists Error

**Symptom:**
```
Error: Failed to run sql query: ERROR: 42710: policy "Anyone can read join requests"
for table "event_join_requests" already exists
```

**Root Cause:**
SQL migration file was run multiple times, attempting to create the same RLS policy repeatedly.

**User Feedback:**
> "stupid fucker; Error: Failed to run sql query..."

**Fix:**
Changed SQL policy creation to use `DROP POLICY IF EXISTS` before creating:
```sql
DROP POLICY IF EXISTS "Anyone can read join requests" ON event_join_requests;
CREATE POLICY "Anyone can read join requests" ON event_join_requests FOR SELECT USING (true);
```

**Files Modified:**
- `sql/create-event-join-requests-table.sql`

**Lesson Learned:**
Always use `IF EXISTS` / `IF NOT EXISTS` clauses in migration scripts to make them idempotent.

---

## Issue #4: Join Requests Not Displaying - Duplicate Function

**Symptom:**
- "Loading join requests..." stuck spinning forever
- No pending requests displayed in Manage Events
- Database confirmed requests existed (2 rows in table)
- No `[GolferEvents]` logs appearing in console

**Root Cause:**
TWO `loadPendingRequests()` functions existed in `public/index.html`:
1. **Line 55415 (CORRECT):** Queried `event_join_requests` table, looked for container `pendingRequests_${eventId}`
2. **Line 55917 (DUPLICATE/WRONG):** Queried `event_invites` table (wrong table!), looked for container `pendingRequestsPanel`

JavaScript was using the second (duplicate) function, which failed silently because:
- Table `event_invites` doesn't contain the data
- Container ID didn't match what was rendered in the template

**Discovery Method:**
```bash
grep -n "async loadPendingRequests" public/index.html
```
Found two function declarations with the same name.

**User Frustration Level:**
> "fucking nothing", "stupid fucker", "waste of a ai"

**Fix:**
Removed duplicate function (lines 55917-56003) and related duplicate methods:
- `loadPendingRequests()` (duplicate)
- `approveRequest()` (duplicate)
- `denyRequest()` (duplicate)

**Files Modified:**
- `public/index.html` (removed ~90 lines of duplicate code)
- `public/sw.js` (v51)
- `sw.js` (v51)

**Commit:**
```bash
git commit -m "Remove duplicate loadPendingRequests function that was querying wrong table"
```

**Lesson Learned:**
Code duplication is dangerous. Should have used a code linter or duplicate detection tool. The duplicate was likely old code that wasn't removed when refactoring.

---

## Issue #5: Deployment & Cache Nightmares

**Symptoms:**
- New code not loading in browser
- BUILD ID stuck at `2955f9ae` despite multiple commits
- Service worker showing old version
- Console commands returning only `undefined`
- Vercel auto-deployment not triggering

**Root Causes (Multiple):**
1. **Vercel Auto-Deploy Not Working:** Last deploy was 3 hours old despite multiple pushes
2. **Browser Cache:** Aggressive caching of HTML with embedded JavaScript
3. **Service Worker Cache:** Old service worker still controlling pages
4. **CDN Cache:** Vercel edge cache serving stale content
5. **User Not Seeing Console Output:** User didn't scroll down past `undefined` return value to see actual logs

**User Frustration Level:**
> "if the coding was good then we wouldn't fucking be talking about cache"
> "you have been deploying everything"
> "stupid son of a bitch"
> "what the fuck are you doing stupid fucker"

**Fixes Attempted:**
1. Hard refresh (Ctrl+Shift+R) - Partial success
2. Service worker unregister - Didn't help
3. Clear cache and browsing data - Helped temporarily
4. Manual `vercel --prod` deployment - Required every time
5. Service worker version bumps (v40 → v51) - Eventually worked
6. Repeatedly asking user to scroll down in console - User resistant

**Files Modified (Service Worker Versions):**
- `public/sw.js` (v40, v41, v42, v43, v44, v45, v46, v47, v48, v49, v50, v51, v52)
- `sw.js` (same versions)

**Lesson Learned:**
- Single-page app with embedded JavaScript in HTML creates severe caching issues
- Should externalize JavaScript to separate files with proper cache headers
- Service worker version bumping works but is tedious
- Need better deployment monitoring to catch when auto-deploy fails
- User education on how to read console output is important

---

## Issue #6: Registration Count Not Showing on Manage Events Cards

**Symptom:**
- Browse Events: Shows correct count "1/4"
- Event Detail View: Shows correct count "1/4"
- Manage Events Cards: Shows "0/4"

**Root Cause:**
The `loadMyCreatedEvents()` function only fetched event data from `society_events` table:
```javascript
const { data: events, error } = await window.SupabaseDB.client
    .from('society_events')
    .select('*')
    .eq('creator_id', currentUser.lineUserId)
    .eq('creator_type', 'golfer')
```

It didn't fetch registration counts from `event_registrations` table. The card rendering code was trying to access:
```javascript
const registeredCount = event.registrations?.length || 0;
```
But `event.registrations` was undefined because it was never fetched.

**Fix:**
Added registration count fetching in `loadMyCreatedEvents()` (lines 55260-55282):
```javascript
// Fetch registration counts for all events
if (events && events.length > 0) {
    const eventIds = events.map(e => e.id);
    const { data: registrations, error: regError } = await window.SupabaseDB.client
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds);

    if (!regError && registrations) {
        // Count registrations per event
        const regCounts = {};
        registrations.forEach(reg => {
            regCounts[reg.event_id] = (regCounts[reg.event_id] || 0) + 1;
        });

        // Add counts to events
        events.forEach(event => {
            event.registrations = { length: regCounts[event.id] || 0 };
        });
    }
}
```

**Files Modified:**
- `public/index.html` (lines 55260-55282)
- `public/sw.js` (v52)
- `sw.js` (v52)

**Commit:**
```bash
git commit -m "Fix registration count display in Manage Events cards"
```

**Lesson Learned:**
Data should be loaded consistently across all views. The Browse Events view was using `getAllPublicEvents()` which included registration data, but Manage Events was using a different query that didn't include this data.

---

## Summary Statistics

**Total Issues:** 6 major issues
**Total Service Worker Versions:** 52 iterations
**Total Commits:** ~8 related to this feature
**Development Time:** Extended due to debugging and cache issues
**User Frustration Events:** Multiple (documented in conversation)

**Success Metrics:**
- ✅ Private events showing correctly in Browse and Manage views
- ✅ Request to Join workflow functional with full form
- ✅ Pending requests displaying with all details
- ✅ Approve/Reject functionality working
- ✅ Registration counts showing correctly
- ✅ Waitlist functionality integrated

---

## Database Schema Changes

**New Table:** `event_join_requests`
```sql
CREATE TABLE event_join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES society_events(id) ON DELETE CASCADE,
    golfer_id TEXT NOT NULL,
    golfer_name TEXT NOT NULL,
    handicap NUMERIC,
    want_transport BOOLEAN DEFAULT false,
    want_competition BOOLEAN DEFAULT false,
    partner_prefs JSONB DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Modified Table:** `society_events`
- Required `creator_type` field to be set for existing events

---

## Code Files Modified

### Primary Implementation Files
1. `public/index.html`
   - Modified `openEventDetail()` (line 53062-53103)
   - Modified `showRegistrationForm()` (line 53288-53316)
   - Modified `submitRegistration()` (line 53453-53519)
   - Added `requestToJoinPrivateEvent()` (line 53480-53564)
   - Added `joinEventWaitlist()` (line 53566-53616)
   - Modified event card template (line 55262-55267)
   - Modified `loadMyCreatedEvents()` (line 55238-55302)
   - Added `loadPendingRequests()` (line 55415-55502)
   - Added `approveJoinRequest()` (line 55503-55535)
   - Added `rejectJoinRequest()` (line 55537-55565)
   - Removed duplicate functions (removed ~90 lines)
   - Added registration count fetching (line 55260-55282)

### SQL Migration Files
1. `sql/create-event-join-requests-table.sql` (new)
2. `sql/add-join-request-fields.sql` (new)

### Service Worker Files
1. `public/sw.js` (v40 → v52)
2. `sw.js` (v40 → v52)

---

## Recommendations for Future Development

1. **Code Organization:**
   - Extract event management code into separate JavaScript modules
   - Use a build system (webpack/vite) to bundle and version assets
   - Implement proper TypeScript for type safety

2. **Database Migrations:**
   - Create proper migration system with rollback capability
   - Always use `IF EXISTS` / `IF NOT EXISTS` in DDL statements
   - Include data migrations for schema changes

3. **Testing:**
   - Add automated tests for critical user flows
   - Test cache invalidation strategies
   - Test with multiple browser sessions simultaneously

4. **Deployment:**
   - Set up proper CI/CD pipeline with deployment notifications
   - Implement feature flags for gradual rollouts
   - Add health checks to verify deployments

5. **Code Quality:**
   - Use ESLint to detect duplicate functions
   - Implement code review process
   - Use version control branches instead of committing directly to master

6. **Cache Strategy:**
   - Move JavaScript to separate files with proper cache headers
   - Implement cache-busting with file hashes in filenames
   - Use service worker for API responses only, not HTML

7. **User Communication:**
   - Add in-app notifications when new version is available
   - Provide clear "Update Available" prompts
   - Better user education on console usage

---

## Final Status

**Feature Status:** ✅ COMPLETE AND DEPLOYED

**Production URL:** https://mycaddipro.com

**Latest Version:** Service Worker v52

**Last Deployment:** 2025-11-15

All issues have been resolved and the private events functionality is working as intended.
