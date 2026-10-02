// Guard for v1436 (Pete, 2026-10-02):
//  A. "My Assignment tab: My Work and My Work Week populated ... i want the tabs, the dashboards controls,
//     i don't want it to appear once they register, i want there so they can already see it without the
//     data" — My Schedule always paints both tabs; there is no "once your profile is linked" screen.
//  B. "for the 000000 access to the caddy dashboard i want it fully data loaded because it needs to be
//     mockup demo" — public/caddy-demo.js feeds the PIN caddie session a demo caddy, in MEMORY only.
// The demo must never reach a signed-in account, the database or this phone's storage.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const html = read('index.html'), ui = read('caddy-work.js'), demo = read('caddy-demo.js'), ts = read('proshop-teesheet.html');
const fail = [];

// A. tabs + controls without a caddy record
const a = ui.indexOf('const MY = {'), b = ui.indexOf('W.CaddyMySchedule = MY');
const my = (a >= 0 && b > a) ? ui.slice(a, b) : '';
if (!my) fail.push('caddy-work.js: CaddyMySchedule block not found');
else {
    if (/cws\.my\.nolink/.test(my)) fail.push('caddy-work.js: the "shows once your profile is linked" empty screen is back — both tabs must always paint');
    if (/paint\(\) \{\s*const root = this\.root\(\); if \(!root\) return;\s*if \(!this\.prof\)/.test(my)) fail.push('caddy-work.js: paint() must not bail out when there is no caddy record');
    if (!/regNote\(\) \{/.test(my) || !/data-a="register"/.test(my)) fail.push('caddy-work.js: an unregistered caddy must be shown where to register (regNote)');
    if (!/\(a === 'hours' \|\| a === 'dayoff' \|\| a === 'ask'\) && !this\.prof\)/.test(my)) fail.push('caddy-work.js: the controls must answer "register first" when there is no caddy record');
    if (!/data-a="hours">\$\{ic\('schedule'\)\}/.test(my) || /\$\{p \? `<button type="button" class="cbk-mini" data-a="hours"/.test(my)) fail.push('caddy-work.js: the My hours control must always be on screen');
    if (/\.from\('(caddy_bookings|bookings)'\)[\s\S]{0,200}?\.(update|insert|upsert|delete)\(/.test(my)) fail.push('caddy-work.js: CaddyMySchedule writes a booking');
}

// B. the demo is memory-only and PIN-only
if (/localStorage\.(setItem|removeItem)|sessionStorage\.setItem|indexedDB/.test(demo)) fail.push('caddy-demo.js: the demo must never write to this phone\'s storage');
if (/\.rpc\(|fetch\(|functions\.invoke/.test(demo)) fail.push('caddy-demo.js: the demo must never call the server');
if (!/if \(!u \|\| u\.role !== 'caddie' \|\| u\.lineUserId\) return false;/.test(demo) || !/W\._caddyIsDemo \? !W\._caddyIsDemo\(\)/.test(demo)) fail.push('caddy-demo.js: on() must be false for every signed-in account');
if (!/scr\.classList\.contains\('active'\)/.test(demo)) fail.push('caddy-demo.js: on() must require the caddie dashboard on screen');
if (!/if \(Object\.prototype\.hasOwnProperty\.call\(self\.tables, table\) && self\.on\(\)\) return new Q\(table\);\s*return real\(table\);/.test(demo)) fail.push('caddy-demo.js: only the listed caddy tables may be answered from memory, and only while on()');
const tbl = (demo.match(/tables: \{([\s\S]*?)\n        \},\n/) || [])[1] || '';
const names = (tbl.match(/^            ([a-z_]+): function/gm) || []).map(x => x.trim().split(':')[0]);
const stray = names.filter(n => !/^caddy_/.test(n));
if (!names.length) fail.push('caddy-demo.js: table list not found');
if (stray.length) fail.push('caddy-demo.js: only caddy_* tables may be stood in for (found ' + stray.join(', ') + ')');
// real-world effects are cut off in the demo
if (!/if \(demo\) \{ this\.profile = CaddyDemo\.profile\(\); return this\.profile; \}/.test(html)) fail.push('index.html: resolveProfile must hand the PIN session the demo caddy');
if (!/this\.profile\.id === CaddyDemo\.ID && !demo\) this\.profile = null;/.test(html)) fail.push('index.html: a demo caddy row must be dropped when a real account is on the page');
if (!/if \(window\.CaddyDemo && CaddyDemo\.on\(\)\) return CaddyDemo\.write\(op, id, fields\);/.test(html)) fail.push('index.html: caddyProfileWrite must stay in memory for the demo');
if (!/if \(this\.sc\._demo\) \{ if \(window\.CaddyDemo\) CaddyDemo\.mark\(this, hole, gross\); return; \}/.test(html)) fail.push('index.html: a demo card must never write the scores table');
if (!/if \(this\.sc\._demo\) \{ this\.link\.status = 'completed'; this\.render\(\); return; \}/.test(html)) fail.push('index.html: a demo card must never be posted');
if (!/if \(!error && data && !\(window\.CaddyDemo && CaddyDemo\.on\(\)\)\) \{/.test(html)) fail.push('index.html: a demo day-off request must never message a real caddy master');
if (!/if \(window\.CaddyDemo && CaddyDemo\.on\(\)\) CaddyDemo\.addEarning\(newEarning\);\s*else \{ this\.earnings\.unshift\(newEarning\); this\.saveEarnings\(\); \}/.test(html)) fail.push('index.html: a demo earning must never be saved to this phone');
// one ?v for the three caddy scripts, demo first
const v = n => (html.match(new RegExp(n.replace('.', '\\.') + '\\?v=(\\w+)')) || [])[1];
const v0 = v('caddy-demo.js'), v1 = v('caddy-work-core.js'), v2 = v('caddy-work.js'), v3 = (ts.match(/caddy-work-core\.js\?v=(\w+)/) || [])[1];
if (!v0 || v0 !== v1 || v1 !== v2 || v2 !== v3) fail.push('caddy-demo.js / caddy-work-core.js / caddy-work.js must load with ONE ?v= (found ' + [v0, v1, v2, v3].join(', ') + ')');
if (html.indexOf('caddy-demo.js?') > html.indexOf('caddy-work.js?')) fail.push('caddy-demo.js must load before caddy-work.js');
// new strings in 4 languages
const keys = ['cws.my.reg', 'cws.my.reg.sub', 'cws.my.needreg'];
const missing = keys.filter(k => html.split("'" + k + "': ").length - 1 !== 4);
if (missing.length) fail.push('i18n parity (each key must sit in EN/TH/KO/JA): ' + missing.join(', '));

if (fail.length) { console.error('✗ caddy demo guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ caddy demo: My Schedule tabs always paint, PIN demo is memory-only (' + names.length + ' caddy tables), no account can reach it');
