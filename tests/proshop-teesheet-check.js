// Guard for the v1508 pro shop tee sheet clean-up (Pete, 2026-10-11: "fix it all").
// 1. A society's event, registrations and pairings belong to the society: the sheet never deletes or edits
//    them. Its slots open the society panel; a drag moves the course's held block (course_event_slots).
// 2. The bookings table is the only truth: the local cache is never uploaded back ("migrate up" re-sent stale
//    and test data as real bookings, and looped a booking the DB refused as FULL).
// 3. Dates are LOCAL dates: toISOString() is UTC and lands a day early before 07:00 in Thailand.
// 4. One course list for the page (TS_COURSES), not hand-kept copies.
// 5. Only this site's pages can drive the sheet by postMessage.
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const ts = read('public/proshop-teesheet.html');
const idx = read('public/index.html');
const fail = [];

// 1. society data is the society's
if (/from\('society_events'\)\s*\.(delete|update)\(/.test(ts)) fail.push('proshop-teesheet.html: the sheet must never delete or edit society_events');
if (/from\('event_registrations'\)\s*\.delete\(/.test(ts)) fail.push('proshop-teesheet.html: the sheet must never delete event_registrations');
if (!/async function openDialog\(seed\) \{\s*if \(tsSocietyEventId\(seed\)\) \{ openSocietySlot\(/.test(ts)) fail.push('proshop-teesheet.html: a society slot must open the society panel, never the booking dialog');
if (!/if \(tsSocietyEventId\(booking\)\) \{ await moveSocietyBlock\(/.test(ts)) fail.push('proshop-teesheet.html: dragging a society slot must move the held block (moveSocietyBlock)');

// 2. the DB is the truth — nothing is uploaded from the local cache
if (/toMigrate|dbSeenHas|legacy local bookings/.test(ts)) fail.push('proshop-teesheet.html: the local-cache "migrate up" must not come back');
if (!/tsInFlightMark\(d, upsCopy, dels, 1\)/.test(ts)) fail.push('proshop-teesheet.html: queued saves must be marked in flight (shown until the DB answers)');
if (/teesheet\.bookings\.v2::\$\{date\}`;\s*const existingBookings/.test(idx)) fail.push('index.html: the golfer caddy booking must not write into the pro shop sheet cache');
if (/course_id\.is\.null/.test(ts)) fail.push('proshop-teesheet.html: a booking with no course must not show on every course');

// 3. local dates
if (/toISOString\(\)\.(split\('T'\)\[0\]|slice\(0, ?10\))/.test(ts)) fail.push('proshop-teesheet.html: use isoOf()/shiftISO() — toISOString() is a UTC date');
if (!/headerPrevDay\?\.addEventListener\('click', \(\) => el\.prevDay\.click\(\)\)/.test(ts)) fail.push('proshop-teesheet.html: the header day arrows must take the toolbar path (fetch + realtime)');

// 4. one course list
if (!/const TS_COURSES = \{/.test(ts)) fail.push('proshop-teesheet.html: TS_COURSES (the one course list) is missing');
if (/<option value="bangpakong">/.test(ts)) fail.push('proshop-teesheet.html: course <option>s are built from TS_COURSES, not typed into the HTML');
if ((ts.match(/const (courseDisplayNames|courseIdToDbName|courseFacilityPrefix|courseNameToId) = \{\s*\n/g) || []).length) fail.push('proshop-teesheet.html: course maps are derived from TS_COURSES — no second hand-kept copy');

// 5. messages from this site only; caddy LINE alerts come from the DB trigger
if (!/if \(event\.origin !== location\.origin\) return;/.test(ts)) fail.push('proshop-teesheet.html: the message listener must check the origin');
if (/functions\.invoke\('notify-caddy-booking'/.test(ts)) fail.push('proshop-teesheet.html: caddy alerts come from the DB trigger caddy_job_alert, not the page');

if (fail.length) { console.error('✗ pro shop tee sheet guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ pro shop tee sheet: society data untouched, DB is the truth, local dates, one course list, same-origin messages');
