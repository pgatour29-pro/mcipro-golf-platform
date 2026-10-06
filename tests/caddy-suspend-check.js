// Guard for v1472 — caddy suspensions (Pete 2026-10-06: caddy master only; the golfer never sees the word).
// 1. One resolver: CaddyWorkSchedule knows 'suspended'; every surface reads it from there (no private suspension reads).
// 2. The Caddy Master Control tab is mounted and reachable; only the caddy master role writes (isCaddyMaster gate on
//    suspend / change / lift).
// 3. Golfer strings (cbk.away*) in all four languages never carry the word for "suspended".
// 4. The DB lock file ships with its rollback.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('public/index.html'), core = read('public/caddy-work-core.js'), ui = read('public/caddy-work.js'), ts = read('public/proshop-teesheet.html');
const fail = [];
if (!/state = 'suspended'/.test(core) || !/susAt: function/.test(core) || !/suspended: async function/.test(core)) fail.push('caddy-work-core.js must resolve suspensions (state suspended, susAt, suspended())');
if (!/W\.CaddyControl = CTL/.test(ui)) fail.push('caddy-work.js must export CaddyControl');
['openSuspend', 'lift', 'openChange'].forEach(fn => { const i = ui.indexOf(fn + '(' ); const body = ui.slice(ui.indexOf('async ' + fn + '(') > -1 ? ui.indexOf('async ' + fn + '(') : ui.indexOf(fn + '(id)'), ui.indexOf('async ' + fn + '(') > -1 ? ui.indexOf('async ' + fn + '(') + 600 : ui.indexOf(fn + '(id)') + 600); if (!/isCaddyMaster\(\)/.test(body)) fail.push('CaddyControl.' + fn + ' must be gated to the caddy master'); });
if (!/id="caddyMaster-control"[\s\S]{0,120}id="cmCtlRoot"/.test(html)) fail.push('index.html: #caddyMaster-control must mount #cmCtlRoot');
if (!/tab === 'control'[^\n]*CaddyControl\.open\(\)/.test(html)) fail.push('index.html: CaddyMasterData.onTab must open CaddyControl');
if (!/mhvGo\('cm','control'\)/.test(html)) fail.push('index.html: the Control cube / More entry is missing');
if (!/\.from\('caddy_suspensions'\)/.test(ui) === false) fail.push('caddy-work.js must not read caddy_suspensions itself (CaddyWorkSchedule does)');
if (/\.from\('caddy_suspensions'\)/.test(ts)) fail.push('proshop-teesheet.html must not read caddy_suspensions itself');
if (!/CaddyWorkSchedule\.suspended\(allCaddies, date\)/.test(ts)) fail.push('proshop-teesheet.html: the caddy day state and the desk must read suspensions through CaddyWorkSchedule.suspended');
if (!/caddy_suspensions'\)\.select\('ends_at'\)/.test(html)) fail.push('CaddyBookingGuard must refuse a suspended caddy before any booking write');
const bad = /suspend|พักงาน|정지|停止/i;
const re = /'(cbk\.away[a-z.]*)':\s*'((?:[^'\\]|\\.)*)'/g; let m, n = 0;
while ((m = re.exec(html))) { n++; if (bad.test(m[2])) fail.push('golfer string ' + m[1] + ' says why: ' + m[2]); }
if (n !== 20) fail.push('cbk.away* must sit in all four dictionaries (5 keys x 4 = 20, found ' + n + ')');
if (/_tt\('cbk\.away[^']*',\s*'[^']*[Ss]uspend/.test(html)) fail.push('a golfer fallback string says suspended');
['sql/caddy_suspensions_v1472.sql', 'sql/caddy_suspensions_v1472_ROLLBACK.sql'].forEach(f => { if (!fs.existsSync(path.join(__dirname, '..', f))) fail.push('missing ' + f); });
if (!/caddy_bookings_not_suspended/.test(read('sql/caddy_suspensions_v1472.sql'))) fail.push('the SQL must carry the booking lock trigger');
if (fail.length) { console.error('✗ caddy suspend guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ caddy suspend: one resolver, caddy master only, golfer never reads the word, DB lock shipped');
