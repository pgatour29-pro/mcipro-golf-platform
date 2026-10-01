// Guard for v1431 "a course PIN opens THAT course and nothing else" (Pete, 2026-10-01).
// A pro shop course gets its own PIN; the session it opens is pinned to that venue on the dashboard
// AND the tee sheet, and the shared PIN can no longer walk into a venue that has its own PIN.
// The PIN -> course map lives in the DB only: the repo is public, so a PIN in client code or a
// committed .sql file is a leak. Fails the build if any guard is removed or a course PIN is committed.
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const idx = read('public/index.html');
const ps = read('public/proshop-dashboard.js');
const ts = read('public/proshop-teesheet.html');
const sql = read('sql/proshop_course_pins_20261001.sql');
const fail = [];

// 1. the PIN is checked by the server and sets the lock
if (!/window\._staffPinGrant = async function \(role, pin\) \{/.test(idx)) fail.push('index.html: _staffPinGrant (THE staff PIN check) is missing');
if (!/sb\.rpc\('proshop_pin_login', \{ p_pin: pin \}\)/.test(idx)) fail.push('index.html: a pro shop course PIN must be checked by the proshop_pin_login RPC');
if (!/localStorage\.setItem\('ps_pin_lock_v1', pick\);\s*localStorage\.setItem\('ps_course_v1', pick\);/.test(idx)) fail.push('index.html: a course PIN must write ps_pin_lock_v1 + ps_course_v1');
if ((idx.match(/await window\._staffPinGrant\(role, pin(\.trim\(\))?\)/g) || []).length < 2) fail.push('index.html: BOTH PIN entrances (panel + prompt failsafe) must go through _staffPinGrant');
if (!/localStorage\.removeItem\('mcipro_staff_role'\); localStorage\.removeItem\('ps_pin_lock_v1'\);/.test(idx)) fail.push('index.html: logout() must end the course PIN lock');

// 2. the dashboard cannot leave the course
if (!/async resolveCourse\(\) \{\s*\/\/[^\n]*\n\s*const lock = pinLock\(\);\s*if \(lock\) \{/.test(ps)) fail.push('proshop-dashboard.js: resolveCourse must honour the PIN lock FIRST');
if (!/const canChangeCourse = \(\) => isAdmin\(\) && !pinLock\(\);/.test(ps)) fail.push('proshop-dashboard.js: canChangeCourse must refuse under a PIN lock');
if (!/changeCourse\(\) \{\s*if \(!canChangeCourse\(\)\) return;/.test(ps)) fail.push('proshop-dashboard.js: changeCourse must be gated by canChangeCourse');
if (!/PS\.needsOwnPin\(cached, await PS\.pinCourses\(\)\)/.test(ps)) fail.push('proshop-dashboard.js: a shared-PIN device must not keep a venue that has its own PIN');
if (!/rows\.filter\(r => !PS\.needsOwnPin\(r, pinned\)\)/.test(ps)) fail.push('proshop-dashboard.js: the course chooser must not list venues that have their own PIN');

// 3. the tee sheet cannot leave the course
if (!/const lock = pinLockCourse\(\);\s*if \(lock && !\(/.test(ts)) fail.push('proshop-teesheet.html: handleUrlParams must force the PIN course over the URL');
if (!/if \(pinLockCourse\(\)\) return true;/.test(ts)) fail.push('proshop-teesheet.html: courseLocked() must be true under a PIN lock');

// 4. no course PIN is ever committed (000000 is the public shared demo PIN and is fine)
const pinLit = /['"`]0{5}[1-9]['"`]|['"`]0{4}[1-9][0-9]['"`]/;
[['public/index.html', idx], ['public/proshop-dashboard.js', ps], ['public/proshop-teesheet.html', ts], ['sql/proshop_course_pins_20261001.sql', sql]]
    .forEach(([f, body]) => { if (pinLit.test(body)) fail.push(f + ': contains a course PIN literal — PINs live in the DB only (public repo)'); });
if (!/enable row level security/.test(sql) || !/revoke all on public\.proshop_pins from public, anon, authenticated/.test(sql)) fail.push('sql: proshop_pins must stay locked to the browser');

if (fail.length) { console.error('✗ pro shop course PIN guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ pro shop course PIN: server-checked, dashboard + tee sheet pinned, no PIN committed');
