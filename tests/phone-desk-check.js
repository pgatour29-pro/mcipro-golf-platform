// Guard for v1528 — CALL PIN + PHONE DESK (Pete 2026-10-12): a golfer gives 6 digits on the phone, the pro shop
// sees who it is and books in a few taps. Thai staff use numbers, never foreign names.
// 1. The PIN never leaves golfer_call_pins: no browser code reads that table or the desk tokens directly, and
//    no caddy-facing script knows about the PIN at all (caddies never see it).
// 2. The pro shop page loads phone-desk.js, hands it the page internals and decorates every render; the
//    golfer app loads call-pin.js; the PIN line paints under the golfer's name (phone header + desktop rails).
// 3. The desk token rides the course's OWN PIN login only (stored on login, dropped on 000000 and logout).
// 4. PIN boxes are never type=password (v1491); strings exist in all four languages.
// 5. The phone header CSS targets the HCP line as nth-child(2) — the PIN line is now the last child.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const pd = read('phone-desk.js'), cp = read('call-pin.js'), ts = read('proshop-teesheet.html'), html = read('index.html');
const fail = [];

[['phone-desk.js', pd], ['call-pin.js', cp], ['proshop-teesheet.html', ts], ['index.html', html]].forEach(([f, src]) => {
    if (/from\(\s*['"](golfer_call_pins|proshop_desk_tokens|desk_lookup_misses)['"]/.test(src)) fail.push(f + ': reads a locked Call PIN table directly — go through the RPCs');
});
['caddy-work.js', 'caddy-work-core.js'].forEach(f => {
    const src = read(f);
    if (/CallPin|PhoneDesk|desk_call_|call_pin_|golfer_call_pins/.test(src)) fail.push(f + ': caddy screens must never see a Call PIN');
});
const cadDash = html.slice(html.indexOf('const CaddyDashboardData = {'), html.indexOf('window.CaddyGolferCard = {') + 20000);
if (/CallPin|desk_call_|call_pin_/.test(cadDash)) fail.push('index.html caddy dashboard must never see a Call PIN');

if (!/<script src="phone-desk\.js\?v=\w+"><\/script>/.test(ts)) fail.push('proshop-teesheet.html must load phone-desk.js');
if (ts.indexOf('phone-desk.js?v') < ts.indexOf('caddy-module.js?v')) fail.push('phone-desk.js must load after caddy-module.js (Book uses CaddyModule.makeBooking + commit)');
if (!/window\.PhoneDesk\.init\(\{/.test(ts)) fail.push('proshop-teesheet.html must hand PhoneDesk its internals');
['caddyRefusals', 'getDay', 'getLayout', 'dayState', 'bookedAt', 'goDate', 'crm', 'caddies', 'sb'].forEach(k => {
    const blk = ts.slice(ts.indexOf('window.PhoneDesk.init({'), ts.indexOf('[PhoneDesk] init:'));
    if (!new RegExp('\\b' + k + '\\b').test(blk)) fail.push('PhoneDesk.init is missing ' + k);
});
if (!/PhoneDesk\.onRender\(el\.gridBody\)/.test(ts)) fail.push('render() must let PhoneDesk put the PIN on the pills');
if (!/rpc\('desk_call_lookup'/.test(pd) || !/rpc\('desk_call_pins'/.test(pd)) fail.push('phone-desk.js must use desk_call_lookup / desk_call_pins');
if (!/M\.makeBooking\(/.test(pd) || !/M\.commit\(\[b\]/.test(pd) || !/api\.caddyRefusals\(/.test(pd)) fail.push('phone-desk.js Book must go through CaddyModule.makeBooking + commit after caddyRefusals');

if (!/<script src="call-pin\.js\?v=\w+" defer><\/script>/.test(html)) fail.push('index.html must load call-pin.js');
if ((html.match(/if \(window\.CallPin\) window\.CallPin\.paint\(\);/g) || []).length < 2) fail.push('index.html: both name painters must repaint the Call PIN line');
if (!/CallPin\.paint\(\)/.test(read('g3-desk.js')) || !/CallPin\.paint\(\)/.test(read('g3-org.js'))) fail.push('g3-desk.js / g3-org.js must paint the Call PIN line after building the rail');
if (/header\.nav-header \.flex\.flex-col\.min-w-0 > span:last-child/.test(html)) fail.push('index.html: the HCP line is nth-child(2) now — span:last-child no longer matches it');
if (!/rpc\('call_pin_get'/.test(cp) || !/rpc\('call_pin_set'/.test(cp)) fail.push('call-pin.js must use call_pin_get / call_pin_set');

if (!/localStorage\.setItem\('ps_desk_token_v1', data\.desk_token\)/.test(html)) fail.push('index.html: a course PIN login must keep its desk token');
if (!/pin === '000000'\) \{\s*try \{ localStorage\.removeItem\('ps_pin_lock_v1'\); localStorage\.removeItem\('ps_desk_token_v1'\);/.test(html)) fail.push('index.html: the shared 000000 login must drop the desk token');
if (!/removeItem\('ps_pin_lock_v1'\); localStorage\.removeItem\('ps_desk_token_v1'\);/.test(html.slice(html.indexOf("removeItem('mcipro_staff_role')") - 10, html.indexOf("removeItem('mcipro_staff_role')") + 200))) fail.push('index.html: logout must drop the desk token');

[['phone-desk.js', pd], ['call-pin.js', cp]].forEach(([f, src]) => {
    if (/type=\\?"password\\?"|type="password"|type='password'/.test(src)) fail.push(f + ': PIN boxes are never type=password (v1491)');
});

const dict = src => { const a = src.indexOf('var STR = {'), b = src.indexOf('\n  };', a); return a < 0 ? null : Function('return ' + src.slice(a + 10, b + 4).replace(/;\s*$/, ''))(); };
[['phone-desk.js', pd], ['call-pin.js', cp]].forEach(([f, src]) => {
    const D = dict(src); if (!D) { fail.push(f + ': could not read the string table'); return; }
    const en = Object.keys(D.en);
    ['th', 'ko', 'ja'].forEach(l => {
        const miss = en.filter(k => !(D[l] && k in D[l])), extra = Object.keys(D[l] || {}).filter(k => !(k in D.en));
        if (miss.length || extra.length) fail.push(f + ' ' + l + ': missing [' + miss.join(', ') + '] extra [' + extra.join(', ') + ']');
    });
    const used = new Set(); let m; const re = /\bt\(\s*'([A-Za-z0-9]+)'/g;
    while ((m = re.exec(src))) used.add(m[1]);
    const lost = [...used].filter(k => !(k in D.en));
    if (lost.length) fail.push(f + ' uses strings nobody defines: ' + lost.join(', '));
});

// v1530 (Pete): the Call PIN is THE identifier on every booking a course sees, and the golfer sees it on each of theirs
const has = (f, re, msg) => { if (!re.test(read(f))) fail.push(f + ': ' + msg); };
has('proshop-teesheet.html', /PhoneDesk\.slot\(r\.golfer_id \|\| \(r\.booking_data/, 'App bookings list must carry the golfer\'s PIN slot');
has('proshop-teesheet.html', /PhoneDesk\.slot\(r\.golfer_id\)/, 'App booking detail must carry the PIN slot');
has('proshop-teesheet.html', /PhoneDesk\.slot\(j\.row\.golfer_id \|\| j\.row\.user_id\)/, 'Caddy Desk job cards must carry the PIN slot');
has('proshop-teesheet.html', /FacilitySheet\.render\(\); if \(window\.PhoneDesk\) PhoneDesk\.onRender/, 'the facility ALL grid must get PINs on its pills');
has('proshop-teesheet.html', /viaPin \? PhoneDesk\.findPin\(st\.term\)/, 'golfer name boxes must resolve a 6-digit Call PIN');
has('caddy-module.js', /PhoneDesk\.slot\(gid\)/, 'the Caddies board must show the PIN beside each golfer');
has('booking-brief.js', /PhoneDesk\.slot\(id\)/, 'the Book Slot brief must show the golfer\'s PIN');
has('proshop-dashboard.js', /PhoneDesk\.slot\(r\.id\)/, 'Customers must show the PIN');
has('proshop-dashboard.js', /PhoneDesk\.findPin\(pq\)/, 'Customers search must resolve a 6-digit Call PIN');
if (!/<script defer src="phone-desk\.js\?v=\w+"><\/script>/.test(html) || html.indexOf('phone-desk.js?v') < html.indexOf('course-crm.js?v')) fail.push('index.html must load phone-desk.js after course-crm.js (Customers + CRM profile PINs)');
has('tee-times.js', /<div class="cp-slot"><\/div>/, 'the golfer\'s tee time ticket must carry the Call PIN slot');
has('promo-wall.js', /<div class="cp-slot"><\/div>/, 'the golfer\'s deal code must carry the Call PIN slot');
if (!/'<div class="cp-slot"><\/div>'/.test(html)) fail.push('index.html: the dashboard tee time card must carry the Call PIN slot');

if (fail.length) { console.error('phone-desk-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('phone-desk-check: ok');
