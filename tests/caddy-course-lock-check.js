// Guard for v1435 "a caddy's dashboard belongs to ONE course" (Pete, 2026-10-02):
// "the caddy golf course and live tracking on course set to that golf course once they register and
//  select the golf course they work at and can't change the course anymore until they leave and go to a
//  new course and like any job that data stays with that golf course and the caddy will have to register
//  a new dashboard with a new golf course".
// 1. Tracking course = her registered course. No CHANGE pill, no temp day away, no picker for an account.
// 2. The dashboard never links or invents a course on its own (no auto-claim by number, no "Unassigned"
//    placeholder) — registration is the only door, and the sheet refuses an already-registered caddy.
// 3. Leaving goes through caddy_leave_course; the server owns the lock (caddy_profile_write) and keeps the
//    record with the course (left_at / former_user_id), never handing it to someone else.
// 4. Every new string exists in all four dictionaries.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('public/index.html'), ui = read('public/caddy-work.js'), sql = read('sql/caddy_course_lock_v1435.sql');
const fail = [];
const cut = (from, to) => { const a = html.indexOf(from), b = html.indexOf(to, a + 1); return (a < 0 || b < 0) ? '' : html.slice(a, b); };

// 1. tracking course is locked
if (/caddySetTempCourse|_caddyTempCourse|caddyBackHomeBtn/.test(html)) fail.push('index.html: the temp-course switch (CHANGE / Back to my course) is back — the course is locked to her registration');
const card = cut('id="trackingNotStarted"', 'id="trackingActive"');
if (!card) fail.push('index.html: #trackingNotStarted block not found');
else {
    if (/<button[^>]*caddie\.dash\.changecourse/.test(card)) fail.push('index.html: a CHANGE button is back on the caddie course pin');
    if (!/id="caddyNoCourse"[\s\S]{0,700}onclick="CaddySetup\.open\(\)"/.test(card)) fail.push('index.html: a caddie with no course must be sent to register one (#caddyNoCourse → CaddySetup)');
}
const paint = cut('function caddyPaintCourseRow() {', 'window.caddyPaintCourseRow = caddyPaintCourseRow;');
if (!/const picker = !home && demo;/.test(paint)) fail.push('index.html: the course picker may only show for the PIN demo session (no account)');
if (!/if \(sel && home\) sel\.value = home\.value;/.test(paint)) fail.push('index.html: the hidden tracking select must always carry her registered course');

// 2. the dashboard never picks a course for her
const res = cut('async resolveProfile() {', 'paintHeader() {');
if (!res) fail.push('index.html: CaddyDashboardData.resolveProfile not found');
else {
    if (/caddyProfileWrite\(/.test(res)) fail.push('index.html: resolveProfile must not write caddy_profiles (no auto-claim by number, no self-provisioned "Unassigned" row)');
}
if (!/open\(opts = \{\}\) \{\s*if \(window\._caddyHasCourse\(window\.CaddyDashboardData && CaddyDashboardData\.profile\)\) \{ this\._refuse\(\); return; \}/.test(html)) fail.push('index.html: CaddySetup.open must refuse a caddy who is already registered at a course');
if (!/_strict: true/.test(html) || !/if \(e && e\.caddyReg\) throw e;/.test(html)) fail.push('index.html: CaddySetup must surface a refused registration (claimCaddyProfileOnRegistration _strict)');
if ((html.match(/\.is\('user_id', null\)\.is\('left_at', null\)/g) || []).length < 2) fail.push('index.html: registration number lookups must skip a departed caddy\'s record (.is(\'left_at\', null))');

// 3. leaving = the RPC; the server owns the lock
if (!/sb\.rpc\('caddy_leave_course', \{ p_actor: uid \}\)/.test(html)) fail.push('index.html: Leave this course must call the caddy_leave_course RPC');
if (!/id="cadProfLeave" onclick="CaddyProfileEditor\.leaveCourse\(\)"/.test(html)) fail.push('index.html: the Profile tab lost its "Leave this course" button');
const selfCols = (sql.match(/v_self_cols text\[\] := array\[([\s\S]*?)\];/) || [])[1] || '';
if (!selfCols || /course_id|course_name|caddy_number/.test(selfCols)) fail.push('sql: a caddy must never be able to edit course / number on her own row (v_self_cols)');
if (!/already registered at a golf course - leave that course first/.test(sql)) fail.push('sql: caddy_profile_write must refuse a second course');
if (!/v_row\.left_at is not null and v_row\.former_user_id is distinct from v_actor/.test(sql)) fail.push('sql: a departed caddy\'s record may only be re-claimed by her');
if (!/former_user_id = v_actor, user_id = null, is_active = false/.test(sql)) fail.push('sql: caddy_leave_course must keep the row with the course (unlink + inactive), never delete it');
if (/delete\s+from\s+(public\.)?caddy_profiles/i.test(sql)) fail.push('sql: leaving a course must never delete a caddy_profiles row');
if (!/'reason', 'bookings'/.test(sql) || !/'reason', 'on_course'/.test(sql)) fail.push('sql: caddy_leave_course must refuse while she is on the course or still holds bookings');
if (!/r\.left_at \? D\._t\('cm\.grp\.left', 'Left'\)/.test(ui)) fail.push('caddy-work.js: the Caddy Master board must mark a caddy who left');

// 4. i18n parity
const keys = ['caddie.dash.locked', 'caddie.dash.nocourse', 'caddie.dash.nocourse.sub', 'caddie.dash.register', 'caddie.prof.course',
    'caddie.prof.courselocked', 'caddie.leave.btn', 'caddie.leave.q', 'caddie.leave.msg', 'caddie.leave.yes', 'caddie.leave.oncourse',
    'caddie.leave.bookings', 'caddie.leave.none', 'caddie.leave.done', 'caddie.leave.fail', 'careg.lockednote', 'careg.lock.already',
    'careg.lock.leftrow', 'cm.rt.left', 'cm.grp.left'];
const missing = keys.filter(k => html.split("'" + k + "': ").length - 1 !== 4);
if (missing.length) fail.push('i18n parity (each key must sit in EN/TH/KO/JA): ' + missing.join(', '));

if (fail.length) { console.error('✗ caddy course lock guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ caddy course lock: one course per registration, tracking pinned to it, leave = RPC, record stays with the course, ' + keys.length + ' strings in 4 languages');
