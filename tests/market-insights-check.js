// Guard for v1509 course MARKET insights (Pete, 2026-10-11: "golfers data mined for the golf courses for marketing").
// Courses see COUNTS, never who: the market comes from the market_insights RPC (1–4 → "<5" server-side), offers to the
// market audiences are delivered by the platform, other courses stay unnamed in the share ranking, and golfers are asked
// ONCE per course after a round whether to follow it. Strings in all 4 languages.
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const mk = read('public/marketing-dashboard.js');
const idx = read('public/index.html');
const sql = read('sql/course_market_insights_v1509.sql');
const edge = read('supabase/functions/line-push-notification/index.ts');
const priv = read('public/privacy.html');
const lock = read('sql/course_follows_lock_v1511.sql');
const cad = read('sql/market_caddies_v1512.sql');
const fail = [];

// server: counts only, under-5 suppression, offers resolved by the platform
if (!/create or replace function public\.k5\(n bigint\)/.test(sql) || !/'<5'/.test(sql)) fail.push('sql: k5() must turn 1–4 into "<5"');
if (!/grant execute on function public\.market_insights\(text, text, integer\) to anon/.test(sql)) fail.push('sql: market_insights must be callable by the dashboard');
if (!/revoke execute on function public\.resolve_offer_segment\([^)]*\) from public, anon, authenticated/.test(sql)) fail.push('sql: resolve_offer_segment (the golfer list) must stay server-only');
if (!/'rank', rk, 'golfers', public\.k5\(g\), 'you', v = me/.test(sql)) fail.push('sql: the share ranking must not carry other courses\' names');
if (!/p_audience: seg\.audience \?\? null/.test(edge)) fail.push('line-push-notification: delivery must pass the market audience');

// dashboard: Market tab, no golfer lists, under-5 shown as words
if (!/market: MK\.loadMarket/.test(mk)) fail.push('marketing-dashboard.js: Market tab not registered');
if (!/rpc\('market_insights'/.test(mk)) fail.push('marketing-dashboard.js: Market must read market_insights');
if (/from\('rounds'\)|from\('course_follows'\)|from\('course_offer_reads'\)/.test(mk)) fail.push('marketing-dashboard.js: the dashboard must never read golfer rows directly');
if (!/data === -1 \? tr\('mkt\.under5'/.test(mk) || !/when n between 1 and 4 then -1/.test(sql)) fail.push('count_offer_segment must send 1–4 as -1 and the composer must show "under 5"');
if (!/only the course this golfer was actually asked about/.test(sql)) fail.push('sql: follow_prompt_answer must only accept a course the golfer played in the last 14 days');
if (!/id="marketing-market"/.test(idx) || !/showMarketingTab\('market', event\)/.test(idx)) fail.push('index.html: Market pane / tab button missing');

// strings: every mkt.* / fp.* key in EN, TH, KO, JA
const keys = new Set((mk.match(/tr\('(mkt\.[a-z0-9.]+)'/g) || []).map(m => m.slice(4, -1)));
['mk.tab.market', 'mk.cube.mktsub', 'fp.title', 'fp.body', 'fp.no', 'fp.yes', 'fp.done', 'fp.fail'].forEach(k => keys.add(k));
keys.forEach(k => { const n = (idx.match(new RegExp("'" + k.replace(/\./g, '\\.') + "':", 'g')) || []).length; if (n !== 4) fail.push('index.html: ' + k + ' is in ' + n + ' of 4 languages'); });

// reach: asked once per course after a round, server decides + records
if (!/sb\.rpc\('follow_prompt_next'/.test(idx) || !/sb\.rpc\('follow_prompt_answer'/.test(idx)) fail.push('index.html: FollowPrompt must go through follow_prompt_next / follow_prompt_answer');
if (!/L\._isRoundActive && L\._isRoundActive\(\)\) return;/.test(idx)) fail.push('index.html: the follow prompt must never open on top of a round');
// v1512: caddies — counts only, Chee Chan (tester course) never in another course's market, caddy audience delivered by the platform
if (!/rpc\('market_caddies'/.test(mk) || !/grant execute on function public\.market_caddies\(text, text, integer\) to anon/.test(cad)) fail.push('Market › Caddies must read market_caddies');
if (!/slug <> 'cheechan' or me = 'cheechan'/.test(cad)) fail.push('sql: Chee Chan (tester course) must stay out of other courses\' caddy market');
if (!/caddy_users as \(/.test(cad) || !/'caddy_users'/.test(mk)) fail.push('the "golfers who book caddies" audience is missing');
// v1511: follows + offer consent belong to the verified login
if (!/create policy cf_own_insert on public\.course_follows for insert to authenticated with check \(golfer_line_id = public\.line_id\(\)\)/.test(lock) || !/revoke insert, update, delete on public\.course_follows from anon/.test(lock)) fail.push('sql: course_follows must be own-rows-only for signed-in golfers');
// v1526: they belong to the signed-in golfer, saved like any other setting (sql/deal_prefs_app_login_v1526.sql, guarded in promo-wall-check.js)
if (!/sb\.rpc\('golfer_follow', \{ p_golfer: uid/.test(idx)) fail.push('index.html: following saves for the signed-in golfer (golfer_follow)');
// v1527 (Pete: "it only needs to ask once after i make a selection"): closing = an answer, remembered on the phone, one question a week
const once = fs.readFileSync(path.join(__dirname, '..', 'sql/follow_prompt_once_v1527.sql'), 'utf8');
if (!/this\.answer\(c, false\); return; \}/.test(idx) || !/this\.asked\(\)\.indexOf\(uid \+ '\|' \+ data\.course_id\) >= 0/.test(idx)) fail.push('index.html: the follow question must count a close as an answer and never re-ask a course answered on this phone');
if (!/q\.asked_at > now\(\) - interval '7 days'\) then return null/.test(once)) fail.push('sql: follow_prompt_next must ask at most one course a week');
if (!/Golf courses \(anonymous counts\)/.test(priv)) fail.push('privacy.html: the anonymous course counts must be disclosed');

if (fail.length) { console.error('✗ market insights guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ market insights: counts only (under 5 hidden), platform delivers, ' + keys.size + ' strings in 4 languages, follow asked once');
