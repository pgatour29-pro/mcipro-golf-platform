// Guard for v1429 — the caddy module on the Caddie + Caddy Master dashboards (Pete 2026-10-01).
// 1. The CADDY can never cancel, decline or change a booking (hard rule 2026-09-17): her module
//    (CaddyMySchedule in caddy-work.js) must not write caddy_bookings / bookings at all.
// 2. Both tabs mount the module, and both script files ship with the SAME ?v= (a stale core next to a
//    new UI is how "works on my phone" bugs start).
// 3. One resolver: proshop-teesheet.html and the golfer's Book a Caddy read the work schedule through
//    window.CaddyWorkSchedule — not a private copy.
// 4. Every cws.* string exists in all four dictionaries (EN/TH/KO/JA).
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const html = read('index.html'), ui = read('caddy-work.js'), core = read('caddy-work-core.js'), ts = read('proshop-teesheet.html');
const fail = [];

const a = ui.indexOf('const MY = {'), b = ui.indexOf('W.CaddyMySchedule = MY');
if (a < 0 || b < a) fail.push('caddy-work.js: CaddyMySchedule block not found');
else {
    const my = ui.slice(a, b);
    if (/\.from\('(caddy_bookings|bookings)'\)[\s\S]{0,200}?\.(update|insert|upsert|delete)\(/.test(my)) fail.push('CaddyMySchedule writes a booking — the caddy can never cancel, decline or change one');
    if (/D\._update|releaseBooking|cancelBooking|_patchParent/.test(my)) fail.push('CaddyMySchedule calls a caddy master booking writer');
    if (!/cws\.my\.rule/.test(my)) fail.push('CaddyMySchedule lost the "ask the caddy master" rule line');
}
if (!/id="caddie-assignments"[\s\S]{0,900}id="cwsCaddyRoot"/.test(html)) fail.push('index.html: #caddie-assignments must mount #cwsCaddyRoot');
if (!/id="caddyMaster-roster"[\s\S]{0,300}id="cmxRoot"/.test(html)) fail.push('index.html: #caddyMaster-roster must mount #cmxRoot');
const v1 = (html.match(/caddy-work-core\.js\?v=(\w+)/) || [])[1], v2 = (html.match(/caddy-work\.js\?v=(\w+)/) || [])[1], v3 = (ts.match(/caddy-work-core\.js\?v=(\w+)/) || [])[1];
if (!v1 || v1 !== v2 || v1 !== v3) fail.push('caddy-work-core.js / caddy-work.js must load with ONE ?v= on index.html and proshop-teesheet.html (found ' + [v1, v2, v3].join(', ') + ')');
if (html.indexOf('caddy-work-core.js') > html.indexOf('caddy-work.js?')) fail.push('caddy-work-core.js must load before caddy-work.js');
if (!/CaddyWorkSchedule\.offNumbers\(allCaddies, date\)/.test(ts)) fail.push('proshop-teesheet.html: the Caddy Desk must read days off through CaddyWorkSchedule.offNumbers');
if (!/_dayOff\(c, date\)[\s\S]{0,200}_workDay|_workDay\(c, date\) \{[\s\S]{0,300}WS\.resolve/.test(html)) fail.push('index.html: GolferCaddyBooking must resolve days off through CaddyWorkSchedule.resolve');
if (!/resolve: function \(store, caddy, date, dayoffs\)/.test(core)) fail.push('caddy-work-core.js: resolve(store, caddy, date, dayoffs) is THE rule');

const keys = new Set();
const re = /T\(\s*(['"])(cws\.[A-Za-z0-9.]+)\1/g; let m;
while ((m = re.exec(ui))) keys.add(m[2]);
['cbk.dayoff', 'cbk.dayoff.day', 'cbk.dayoff.line'].forEach(k => keys.add(k));
const missing = [];
keys.forEach(k => { const n = html.split("'" + k + "': ").length - 1; if (n !== 4) missing.push(k + ' ×' + n); });
if (missing.length) fail.push('i18n parity (each key must sit in EN/TH/KO/JA): ' + missing.slice(0, 12).join(', ') + (missing.length > 12 ? ' …' : ''));

if (fail.length) { console.error('✗ caddy module guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ caddy module: caddy side read-only, one work-schedule resolver, ' + keys.size + ' strings in 4 languages');
