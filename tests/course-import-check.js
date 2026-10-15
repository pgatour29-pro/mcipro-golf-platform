// Guard for v1581 "Import data" (Pete, 2026-10-15: on-boarding a course's tee sheet, caddies, members, customers
// and shop stock). The import is reachable from every pro shop surface, writes ONLY through the three server
// RPCs (course_import_run / undo / list — gated by the course's desk token when it has its own PIN), its tables
// stay locked to the browser, the PIN box is never a password field, and no course PIN is committed.
const fs = require('fs');
const path = require('path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const idx = read('public/index.html');
const ps = read('public/proshop-dashboard.js');
const glass = read('public/proshop-glass.js');
const mod = read('public/course-import.js');
const crm = read('public/course-crm.js');
const sql = read('sql/course_import_v1581.sql');
const fail = [];
const count = (s, re) => (s.match(re) || []).length;

// 1. every pro shop entrance: tab strip, phone cube, More sheet, glass rail, pane, script
if (!/id="proshop-import-tab"/.test(idx) || !/showProshopTab\('import', event\)/.test(idx)) fail.push('index.html: the Import data tab button is missing from the strip');
if (count(idx, /psOpenSection\('import'\)/g) < 2) fail.push('index.html: the phone needs BOTH the home cube and the More-sheet entry for Import data');
if (!/<div id="proshop-import" class="tab-content hidden"><div id="ps-import-body"><\/div><\/div>/.test(idx)) fail.push('index.html: the #proshop-import pane / #ps-import-body host is missing');
if (!/<script defer src="course-import\.js\?v=\d+"><\/script>/.test(idx)) fail.push('index.html: course-import.js is not loaded');
if (count(idx, /'ps\.import\.tab':/g) !== 4 || count(idx, /'ps\.cube\.import':/g) !== 4) fail.push('index.html: ps.import.tab / ps.cube.import must exist in all four language dictionaries');
if (!/tab === 'import'\) PS\.loadImport\(\)/.test(ps) || !/loadImport\(\) \{/.test(ps)) fail.push('proshop-dashboard.js: onTab(import) → PS.loadImport is missing');
if (!/CourseImport;/.test(ps) || !/token: \(\) => \{ try \{ return localStorage\.getItem\('ps_desk_token_v1'\)/.test(ps)) fail.push('proshop-dashboard.js: loadImport must open CourseImport with the desk token');
if (!/data-tab="import"/.test(glass)) fail.push('proshop-glass.js: the glass rail has no Import data button');
if (!/psProdModal\|psVenueQrModal\|psCoursePick\|psImportModal/.test(glass)) fail.push('proshop-glass.js: the import wizard modal must get the glass skin (psImportModal)');

// 2. the module: server RPCs only, chunked, PIN box never a password, nothing else writes
['course_import_run', 'course_import_undo', 'course_import_list'].forEach(n => { if (!mod.includes("rpc('" + n + "'") && !mod.includes("rpcWithPin('" + n + "'")) fail.push('course-import.js: must call ' + n); });
if (!/var CHUNK = (\d+);/.test(mod) || parseInt(mod.match(/var CHUNK = (\d+);/)[1], 10) > 500) fail.push('course-import.js: CHUNK must be ≤ 500 rows (the RPC refuses more)');
if (/type="password"/.test(mod)) fail.push('course-import.js: a PIN box is never type=password (phones offer to save it)');
if (!/id="cimPin" type="text" inputmode="numeric" pattern="\[0-9\]\*" maxlength="6" class="pin-mask" autocomplete="one-time-code"/.test(mod)) fail.push('course-import.js: the PIN box must be the pin-mask / one-time-code input');
if (/from\('(bookings|caddy_bookings|caddy_profiles|course_memberships|course_customers|proshop_products|course_golfer_notes)'\)\s*\.(insert|upsert|update|delete)\(/.test(mod)) fail.push('course-import.js: the browser never writes the data tables directly — every write goes through course_import_run');
if (!/new TextDecoder\('windows-874'\)/.test(mod)) fail.push('course-import.js: Thai legacy CSVs (windows-874) must still be read');

// 3. the CRM reads the imported records and memberships
if (!/rpc\('course_customers_list'/.test(crm) || /from\('course_customers'\)/.test(crm) || !/from\('course_memberships'\)/.test(crm)) fail.push('course-crm.js: the player book reads customer records through course_customers_list (never the table) + course_memberships');

// 4. SQL: locked tables, server-only helpers, the quiet switch, public RPCs gated
['course_import_batches', 'course_import_rows'].forEach(t => {
    if (!new RegExp('alter table public\\.' + t + ' enable row level security;\\s*revoke all on public\\.' + t + ' from public, anon, authenticated;').test(sql)) fail.push('sql: ' + t + ' must stay locked to the browser');
});
if (!/drop policy if exists course_customers_select on public\.course_customers;\s*revoke select on public\.course_customers from anon, authenticated;/.test(sql) || !/revoke insert, update, delete on public\.course_customers from anon, authenticated;/.test(sql)) fail.push('sql: course_customers has no browser read or write — the player book reads it through course_customers_list');
if (!/create or replace function public\.course_customers_list\(p_token text, p_course text, p_slug text, p_venue text\)\s*returns jsonb language plpgsql security definer/.test(sql)) fail.push('sql: course_customers_list must be the gated reader');
if (!/keys := public\._import_keys\(p_token, p_course\);\s*perform public\._import_gate\(p_token, p_course, p_slug\);\s*perform set_config\('mcp\.import_keys', keys::text, true\);/.test(sql)) fail.push('sql: course_import_run must bind the caller to its course keys (slug, venue, facility, roster all checked against them)');
if (/opts := coalesce\(p_opts, '\{\}'::jsonb\) - 'facility_id' - 'venue';/.test(sql) === false) fail.push('sql: facility_id and venue are never taken from the client as-is');
if (!/if coalesce\(current_setting\('mcp\.quiet', true\), ''\) = '1' then return null; end if;/.test(sql)) fail.push('sql: caddy_job_alert must honour the mcp.quiet switch (bulk imports with alerts off)');
['course_import_run', 'course_import_undo', 'course_import_list'].forEach(n => {
    if (!new RegExp('create or replace function public\\.' + n + '\\([^)]*\\)\\s*returns jsonb language plpgsql security definer').test(sql)) fail.push('sql: ' + n + ' must be security definer');
});
if (!/perform public\._import_gate\(p_token, p_course, p_slug\);/.test(sql)) fail.push('sql: course_import_run must pass the desk-token gate');
if (/grant execute on function public\._import/.test(sql)) fail.push('sql: the _import_* helpers are never granted to the browser');

// 5. no course PIN is ever committed (000000 is the public shared PIN and is fine)
const pinLit = /['"`]0{5}[1-9]['"`]|['"`]0{4}[1-9][0-9]['"`]/;
[['public/course-import.js', mod], ['sql/course_import_v1581.sql', sql], ['tests/course-import-check.js', read('tests/course-import-check.js')]]
    .forEach(([f, body]) => { if (pinLit.test(body)) fail.push(f + ': contains a course PIN literal — PINs live in the DB only (public repo)'); });

// 6. every script the import touches must PARSE — v1585 shipped a statement inside an else-if chain and took the
//    whole pro shop dashboard down (window.ProshopDashboard never defined)
['public/proshop-dashboard.js', 'public/proshop-glass.js', 'public/course-import.js', 'public/course-crm.js', 'public/course-audit.js', 'public/booking-brief.js', 'public/player-card.js']
    .forEach(f => { try { new Function(read(f)); } catch (e) { fail.push(f + ': does not parse — ' + e.message); } });

if (fail.length) { console.error('✗ course import guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ course import: every pro shop entrance, server-only writes, locked tables, pin-mask PIN box, no PIN committed');
