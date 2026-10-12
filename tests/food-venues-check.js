// Guard for v1532 — a kitchen per venue + room ordering (Pete 2026-10-12).
// 1. A golfer only ever sees the menu and prices of the venue they are ordering from: loadMenu filters by the
//    venue key and never falls back to the shared sample menu (course_name null).
// 2. A kitchen serves ONE venue: its queue and realtime are filtered by venue_key; menu writes are pinned to it.
// 3. Venue settings, sign-in, rooms and Admin golf bars go through the RPCs — the locked tables are never read
//    or written directly from the browser, and no PIN value lives in client code or the committed SQL.
// 4. Tester venues (Chee Chan, TESTQA bars) are never auto-picked for a real golfer playing there.
// 5. The PIN boxes are never type=password (v1491).
const fs = require('fs'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'public', 'food-fgv1.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'food_venue_kitchens_v1532.sql'), 'utf8');
const fail = [];

if (!/\.eq\('active', true\)\.eq\('course_name', key\)/.test(js)) fail.push('loadMenu must read only the venue\'s own menu (course_name = venue key)');
if (/specific\.length \? specific : rows\.filter\(r => !r\.course_name\)/.test(js)) fail.push('the shared sample menu must never be shown as a venue\'s prices');
if (!/from\('food_orders'\)\.select\('\*'\)\.eq\('venue_key', this\.venue\.key\)/.test(js)) fail.push('the kitchen queue must be filtered by its venue_key');
if (!/filter: 'venue_key=eq\.' \+ this\.venue\.key/.test(js)) fail.push('kitchen realtime must be filtered by venue_key');
if (!/\.update\(row\)\.eq\('id', e\.id\)\.eq\('course_name', this\.venue\.key\)/.test(js)) fail.push('menu edits must be pinned to the kitchen\'s venue');
if (!/row\.course_name = this\.venue\.key/.test(js)) fail.push('new menu items must belong to the kitchen\'s venue');

if (/from\(\s*'(food_venue_pins|food_kitchen_tokens|food_admin_pins|food_stays|food_login_misses)'/.test(js)) fail.push('locked food tables must only be reached through RPCs');
if (/from\('food_venues'\)\.(insert|update|upsert|delete)/.test(js)) fail.push('food_venues writes go through food_venue_save only');
['food_kitchen_login', 'food_kitchen_me', 'food_venue_save', 'food_menu_from_sample', 'food_venue_for_course', 'food_stay_get', 'food_stay_set', 'food_stay_clear', 'food_admin_bars', 'food_admin_bar_create']
    .forEach(f => { if (!new RegExp("rpc\\('" + f + "'").test(js)) fail.push('food-fgv1.js should use rpc ' + f); });
if (/insert into public\.food_admin_pins\s*\(pin\)\s*values/i.test(sql) || /insert into public\.food_venue_pins[^;]*values\s*\([^)]*'\d{6}'/i.test(sql)) fail.push('no PIN values in the committed SQL');
if (/'\d{6,10}'/.test(js.replace(/'\d{6}'\)/g, ''))) { /* digits in strings are fine unless they look like a PIN assignment */ }
if (/food_admin_pin'[^)]*'\d{6,}'/.test(js)) fail.push('no Admin PIN in client code');

if (!/if \(rv && rv\.open && \(!rv\.test \|\| testMode\(\)\)\)/.test(js)) fail.push('a tester venue must never be auto-picked for a real golfer');
if (!/const listed = v => v\.open && \(!v\.test \|\| testMode\(\)\)/.test(js)) fail.push('tester venues are listed only in test mode');

if (/type=\\?"password\\?"|type='password'/.test(js)) fail.push('PIN boxes are never type=password (v1491)');
if (!/id="proshop-kitchen-tab"/.test(html)) fail.push('the pro shop needs its Kitchen button');
if (!/onclick="FoodAdmin\.open\(\)"/.test(html)) fail.push('Admin › Courses needs the Golf bars card');

// v1532d: the keyboard opening (a height-only resize) must never re-draw the food page under the thumb
if (/window\.addEventListener\('resize', \(\) => \{ clearTimeout\(rz\); rz = setTimeout\(\(\) => \{ if \(foodVisible\(\)\) render\(\); \}/.test(js)) fail.push('resize must not re-render the food page (it kills the phone keyboard)');
if (!/if \(isDesk\(\) !== wasDesk && !typing\)/.test(js)) fail.push('resize re-renders only on a phone/desktop flip and never under a focused input');

// v1532e: kitchen staff find it on the login screen; nothing ever overlays the login page
if (!/onclick="loginWithPin\('kitchen'\)"/.test(html)) fail.push('the staff login needs its Kitchen chip');
if (!/rpc\('food_kitchen_login', \{ p_pin: pin \}\)/.test(html)) fail.push('the Kitchen chip must check the PIN with food_kitchen_login');
if (!/if \(!this\.stationMode && this\.loginShowing\(\)\)/.test(js)) fail.push('the kitchen must never open as an overlay on the login page');
if (!/id="kitchenScreen" class="screen"/.test(html)) fail.push('the kitchen station needs its own screen');

// v1534: the kitchen on a phone is never wider than the screen (Pete 2026-10-12) — rows stack, tabs share the width, chips filter
if (!/@media \(max-width:600px\)\{/.test(js) || !/grid-template-areas:"ph mid mid mid" "ph tags pin tgl"/.test(js)) fail.push('kitchen menu rows must stack on a phone (photo / name / station+price+switch)');
if (!/\.fgv-ksheet \.ktabs\{order:9;flex:1 1 100%/.test(js)) fail.push('kitchen tabs must share the phone width, not run off the edge');
if (!/onclick="KitchenQueue\.setCat\(/.test(js)) fail.push('kitchen menu category chips must filter the list');

if (fail.length) { console.error('food-venues-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('food-venues-check: ok');
