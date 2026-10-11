// Guard for v1513 PROMOTIONS WALL (Pete, 2026-10-11: courses advertise on a wall golfers browse, inside Tee Times and
// public; "Expirations are a must because it needs to sell quickly and the course sets those limits").
// The end time is required (form + RPC + table CHECK), the public wall hands out public fields only (never the segment),
// places are taken under the offer's row lock and handed back when a booking is cancelled, the browser key cannot write
// the wall columns, and every string is in all 4 languages. Public page: no em-dashes, no pull-to-refresh.
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sql = read('sql/promo_wall_v1513.sql');
const pw = read('public/promo-wall.js');
const tt = read('public/tee-times.js');
const cp = read('public/course-promos.js');
const idx = read('public/index.html');
const ps = read('public/proshop-teesheet.html');
const pub = read('public/tee-time-deals/index.html');
const fail = [];

// expiry: required everywhere
if (!/valid_to is not null and venue_slug is not null/.test(sql)) fail.push('sql: the table CHECK must require valid_to on a wall promotion');
if (!/if v_end is null then return jsonb_build_object\('ok', false, 'reason', 'ends'\)/.test(sql)) fail.push('sql: promo_post must refuse a promotion with no end time');
if (!/if \(!f\.ends\) return L\('v_end'\)/.test(cp)) fail.push('course-promos.js: the form must not post without an end time');
if (!/o\.valid_to > now\(\)/.test(sql)) fail.push('sql: the wall must drop a promotion the second it ends');
// posting is the course's own: PIN checked server-side (proshop_pins), lockout after 10 wrong tries an hour
if (!/v_type := public\._promo_pin_check\(p_slug, p_pin\);/.test(sql) || !/why := public\._promo_pin_check\(p_slug, p_pin\);/.test(sql)) fail.push('sql: promo_post / promo_withdraw must check the course PIN');
if (!/>= 10 then return 'locked'/.test(sql) || !/revoke execute on function public\._promo_pin_check\(text, text\) from public, anon, authenticated/.test(sql)) fail.push('sql: PIN lockout / helper must stay server-only');
if (!/p_pin: this\.pin/.test(cp) || /localStorage[^;]*pin|sessionStorage[^;]*pin/i.test(cp) || /type="password"/.test(cp)) fail.push('course-promos.js: the PIN rides the RPC, is never stored, never a password box');
// the public wall: public fields only
const wall = (sql.match(/create or replace function public\.promo_wall[\s\S]*?\n\$\$;/) || [''])[0];
if (!wall) fail.push('sql: promo_wall missing');
if (/segment|created_by|push_recipients/.test(wall)) fail.push('sql: promo_wall must never return the segment / who posted / reach');
if (!/venue_slug <> 'cheechan' or p_test/.test(wall)) fail.push('sql: Chee Chan (tester course) must stay off the public wall');
// places: row lock, handed back on cancel, browser key cannot write them
if (!/where o\.id = p_promo and o\.on_wall and o\.status = 'active' and o\.valid_to > now\(\)\s+for update/.test(sql)) fail.push('sql: teetime_book must lock the deal row');
if (!/create trigger trg_promo_booking_gone after update of deleted on public\.bookings/.test(sql)) fail.push('sql: a cancelled booking must hand its places back');
if (!/revoke insert, update on public\.course_offers from anon, authenticated;/.test(sql) || /grant (insert|update) \([^)]*limit_left/.test(sql)) fail.push('sql: the browser key must not write limit_left / on_wall');
if (!/revoke all on public\.course_promo_claims from anon, authenticated;/.test(sql)) fail.push('sql: claims are RPC-only');
// client: the deal id rides teetime_book; the wall + panel are wired
if (!/p_promo: sh\.promo \? sh\.promo\.id : null/.test(tt)) fail.push('tee-times.js: booking a deal must send p_promo');
if (!/rpc\('promo_wall'/.test(tt) || !/call\('promo_wall'/.test(pub)) fail.push('promo_wall must feed both the app and the public page');
if (!/\$\('promos-btn'\)\.addEventListener\('click'/.test(ps) || !/promo-wall\.js\?v=/.test(ps) || !/course-promos\.js\?v=/.test(ps)) fail.push('proshop-teesheet.html: Promotions button / scripts not wired');
if (!/<script src="promo-wall\.js\?v=\d+" defer><\/script>/.test(idx)) fail.push('index.html: promo-wall.js not loaded');
if (!/TeeTimes\.openPromo\(/.test(idx)) fail.push('index.html: /?promo= links must open the deal');
// caddies in the deal (Pete: "In these modals where are the caddies?"): the sheet shows the course's caddies, a tapped
// caddy rides into the book sheet, a caddy deal prices the caddy and needs one
if (!/caddiesHtml\(p\) \+/.test(pw) || !/loadCaddies: loadPromoCaddies/.test(tt) || !/S\.preCaddy = \(o && o\.caddy\)/.test(tt)) fail.push('caddies must show in the deal sheet and carry into the booking');
if (!/'caddies', \(select count\(\*\) from public\.caddy_profiles/.test(sql) || !/pr_type = 'caddy' and picks \+ want_any = 0/.test(sql)) fail.push('sql: promo_wall caddy count / caddy deal needs a caddy');
// strings: every pw.* / ttx.mode.* key in EN, TH, KO, JA (index.html dictionaries)
const keys = new Set();
[pw, tt].forEach(s => (s.match(/[TF]\('((?:pw|ttx\.mode)\.[a-z0-9.]+)'/g) || []).forEach(m => keys.add(m.slice(3, -1))));
[...pw.matchAll(/\['[a-z_]+', '(pw\.[a-z.]+)'/g)].forEach(m => keys.add(m[1]));
keys.forEach(k => { const n = (idx.match(new RegExp('"' + k.replace(/\./g, '\\.') + '":', 'g')) || []).length; if (n !== 4) fail.push('index.html: ' + k + ' is in ' + n + ' of 4 languages'); });
// pro shop panel strings: every L() key in EN + TH + KO + JA
const enKeys = (cp.match(/var EN = \{([\s\S]*?)\};/) || ['', ''])[1].match(/\b([a-z_0-9]+):/g).map(s => s.slice(0, -1));
['th', 'ko', 'ja'].forEach(l => { const blk = (cp.match(new RegExp('\\b' + l + ': \\{([\\s\\S]*?)close: ')) || ['', ''])[1] + 'close:';
  enKeys.forEach(k => { if (!new RegExp('\\b' + k + ':').test(blk)) fail.push('course-promos.js: ' + k + ' missing in ' + l); }); });
// public page rules
if (/[—–]/.test(pub)) fail.push('tee-time-deals: no em/en dashes on a public page');
if (!/<style id="no-ptr">html,body\{overscroll-behavior-y:none\}<\/style>/.test(pub)) fail.push('tee-time-deals: needs the no-ptr style');
if (!/tee-time-deals/.test(read('public/sitemap.xml'))) fail.push('sitemap.xml: /tee-time-deals/ missing');

if (fail.length) { console.error('✗ promotions wall:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ promotions wall: expiry required, public fields only, places locked + handed back, ' + keys.size + ' strings in 4 languages');
