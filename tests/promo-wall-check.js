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
const pf = read('sql/promo_prefs_v1521.sql');
const wa = read('sql/passkey_session_v1525.sql');
const waFn = read('supabase/functions/passkey-session/index.ts');
const app = read('sql/deal_prefs_app_login_v1526.sql');
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

// desktop: a mouse can't swipe a hidden-scrollbar strip, so the caddy pickers are a scrolling grid from 768px (Pete 10-11)
if (!/@media \(min-width:768px\)\{\.ttx-cads\{display:grid[^}]*overflow-y:auto/.test(tt)) fail.push('tee-times.js: caddy picker must be a vertical grid on desktop');
if (!/@media \(min-width:768px\)\{\.pw-cads-row\{display:grid[^}]*overflow-y:auto/.test(pw)) fail.push('promo-wall.js: deal caddies must be a vertical grid on desktop');
// desktop: book + deal sheets are two columns from 900px so the bill and the Book button sit on screen (Pete 10-11 "not all of the information is showing")
if (!/@media \(min-width:900px\)\{#ttxSheet\{padding:[^}]*\}[^@]*\.ttx-cols\{display:grid/.test(tt) || !/<div class="ttx-cols"><div class="ttx-c1">/.test(tt) || !/<\/div><div class="ttx-c2">/.test(tt)) fail.push('tee-times.js: book sheet must be two columns on desktop');
if (!/@media \(min-width:900px\)\{#pwSheet\{padding:[^}]*\}[^@]*\.sh\.two\{[^}]*display:grid/.test(pw) || !/<div class="pw-r pw-bd">/.test(pw)) fail.push('promo-wall.js: deal sheet must be two columns on desktop');
// phones: Book rides the bottom of the scrolling sheet (sticky), solid to the edge above the app's back button
if (!/@media \(max-width:899px\)\{#ttxSheet \.sh:has\(\.ttx-ctabar\)\{padding-bottom:0\}\.ttx-ctabar\{position:sticky;bottom:0/.test(tt) || !/<div class="ttx-ctabar"><button type="button" class="ttx-cta" data-act="book"/.test(tt)) fail.push('tee-times.js: Book must be pinned to the bottom of the phone sheet');
if (!/@media \(max-width:899px\)\{#pwSheet \.sh:has\(\.pw-acts\)\{padding-bottom:0\}\.pw-acts\{position:sticky;bottom:0/.test(pw)) fail.push('promo-wall.js: deal buttons must be pinned to the bottom of the phone sheet');
// v1521 Your deals: the golfer's choices are theirs (verified login), drive For you AND the LINE alerts with ONE rule
if (!/alter table public\.golfer_deal_prefs enable row level security;/.test(pf) || !/revoke all on public\.golfer_deal_prefs from anon, authenticated;/.test(pf)) fail.push('sql: golfer_deal_prefs must be RLS-locked, RPC only');
if (!/me text := public\.line_id\(\);[\s\S]*?if me is null or me = '' then return jsonb_build_object\('ok', false, 'reason', 'signin'\)/.test(pf)) fail.push('sql: promo_prefs_set must use the verified login only');
['_deal_match(public.golfer_deal_prefs, public.course_offers)', '_deal_for(text, public.course_offers)', '_deal_push(text, public.course_offers)'].forEach(f => { if (pf.indexOf('revoke execute on function public.' + f + ' from public, anon, authenticated;') < 0) fail.push('sql: ' + f + ' must stay server-only'); });
if (!/if v_offer\.on_wall then\s+p_recipients := coalesce\(array\(select r from unnest\(p_recipients\) r where public\._deal_for\(r, v_offer\)\)/.test(pf) || !/case when v_offer\.on_wall then public\._deal_push\(r, v_offer\)/.test(pf)) fail.push('sql: deliver_course_offer must send a wall deal only to the golfers it is for');
// the same tee-off buckets on both sides
['00:00', '08:00', '11:00', '14:00', '24:00'].forEach(t => { if (pf.indexOf("'" + t + "'") < 0 || pw.indexOf("'" + t + "'") < 0) fail.push('tee-off bucket ' + t + ' must match in SQL and promo-wall.js'); });
if (!/function dealMatch\(p, g\)/.test(pw) || !/S\.tab === 'foryou'\) l = S\.prefs \? l\.filter\(p => fits\(p, S\.prefs, S\.follows\)\)/.test(pw)) fail.push('promo-wall.js: For you must filter with dealMatch');
if (!/rpc\('promo_prefs_get'/.test(tt) || !/rpc\('promo_prefs_set'/.test(tt)) fail.push('tee-times.js: Your deals must load + save through the RPCs');
if (!/@media \(min-width:900px\)\{#pwSheet \.sh\.pf\{max-width:960px\}[^@]*\.pf-cols\{display:grid/.test(pw) || !/\.pf-foot\{position:sticky;bottom:0/.test(pw) || !/#pwSheet\.inapp \.sh\.pf\{padding:0\}/.test(pw)) fail.push('promo-wall.js: Your deals sheet must be two columns on desktop with Save pinned on phones');
// v1522 rooms + transport (Pete: "Add room accommodations and transportation if available"): types of their own AND ticks on any deal
if (!/'accommodation', 'transport'\]\)\);/.test(sql) || !/add column if not exists incl_room boolean not null default false/.test(sql) || !/v_room := v_type = 'accommodation' or/.test(sql)) fail.push('sql: course_offers must take rooms + transport (type CHECK, incl_room/incl_transport, promo_post)');
if (!/o\.incl_room room, o\.incl_transport transport/.test(sql)) fail.push('sql: promo_wall must hand out room/transport');
if (!/\('accommodation' = any\(g\.types\) and o\.incl_room\)/.test(pf)) fail.push('sql: _deal_match must count a room-included deal as Rooms');
if (!/\(k === 'accommodation' && !!p\.room\)/.test(pw) || !/\['accommodation', 'pw\.type\.room'/.test(pw)) fail.push('promo-wall.js: Rooms / Transport types + typeHit');
if (!/\['accommodation', 't_room', 'hotel'\]/.test(cp) || !/room: String\(f\.type === 'accommodation' \|\| !!f\.room\)/.test(cp)) fail.push('course-promos.js: the pro shop must be able to post rooms / transport and tick them as included');
// v1523 (Pete: "I'm already signed in, that should already register that its me"): a signed-in golfer is never told to sign out and back in
if (/Sign out and sign in again|로그아웃 후 다시 로그인|ログアウトして再ログイン|ออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง/.test(idx)) fail.push('index.html: never tell a signed-in golfer to sign out and back in');
// v1526 (Pete: "we are already logged in" / "no difference than setting up the profile settings"): Your deals, follows and the
// offer switch save for the golfer the app has signed in. Nothing in them may check the login, confirm it, or send anyone to LINE.
if (/window\.confirmLogin|signInMsg|ensureSignedIn|promoSignIn|fp\.confirm\.|fp\.signin/.test(idx + tt + pw)) fail.push('Your deals / follows must never ask a signed-in golfer to log in or confirm');
if (/from\('course_follows'\)/.test(tt + idx)) fail.push('follows must go through golfer_follow / golfer_offer_state, not the table');
if (!/rpc\('promo_prefs_set', \{ p: d, p_golfer: me\(\) \|\| null \}\)/.test(tt) || !/rpc\('promo_prefs_get', \{ p_test: promoTest\(\), p_golfer: me\(\) \|\| null \}\)/.test(tt)) fail.push('tee-times.js: Your deals must load + save for the app\'s golfer');
if (!/coalesce\(nullif\(public\.line_id\(\), ''\),\s*\(select up\.line_user_id from public\.user_profiles up where up\.line_user_id = nullif\(p_golfer, ''\)/.test(app)) fail.push('sql: _app_golfer = the verified login, else a REAL signed-in account');
if ((app.match(/public\._app_golfer\(/g) || []).length < 8) fail.push('sql: every deal / follow / consent function must use _app_golfer');
// v1525: a fingerprint login the server can trust. The browser key may only ADD a credential (never read / rewrite / bind),
// only a session verified for the account binds it, and the function checks challenge, origin, rpId, UV and the signature
if (!/revoke all on public\.webauthn_credentials from anon, authenticated;/.test(wa) || !/grant insert \(user_id, credential_id, public_key, user_name, device_name, created_at\) on public\.webauthn_credentials/.test(wa) || /tmp_update/.test(wa.replace(/drop policy if exists tmp_update/, ''))) fail.push('sql: webauthn_credentials must be insert-only for the browser key');
if (!/me text := public\.line_id\(\);[\s\S]*?where credential_id = p_credential_id and user_id = me;/.test(wa)) fail.push('sql: webauthn_bind must bind only the verified caller\'s own credential');
['client.challenge !== ch.challenge', '!ORIGINS.includes(client.origin', "!(flags & 0x04)", 'if (!cred || !cred.bound_at) return json({ error: "not_bound" }', 'counter <= Number(cred.sign_count)', 'await verifySig(cred.public_key'].forEach(x => { if (waFn.indexOf(x) < 0) fail.push('passkey-session: missing check ' + x); });
if (!/window\.bindFingerprint = async function/.test(idx) || !/this\._serverSession\(assertion, serverCh, storedUserId\)/.test(idx)) fail.push('index.html: fingerprint login must ask the server for the session, and bind when verified');

if (fail.length) { console.error('✗ promotions wall:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ promotions wall: expiry required, public fields only, places locked + handed back, ' + keys.size + ' strings in 4 languages');
