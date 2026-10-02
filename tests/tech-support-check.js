// Guard for the v1437 Tech Support help desk (Pete 2026-10-02: "something upfront on the hamburger menu
// section that says Tech Support"). Fails the build if the door moves out of the top of the drawer, if
// back can get stuck on the sheet, or if one of the rules that keep real people from being pushed /
// shown tickets they never wrote is edited away.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'tech-support.js'), 'utf8');
const g3 = fs.readFileSync(path.join(__dirname, '..', 'public', 'g3-desk.js'), 'utf8');
const fail = [];

// 1. the drawer row: ONE copy, pinned between the drawer header and the scrolling menu (never inside a role section)
if ((html.match(/id="drawerTechSupport"/g) || []).length !== 1) fail.push('index.html must hold exactly ONE #drawerTechSupport row');
const iHead = html.indexOf('<div class="drawer-header">'), iRow = html.indexOf('id="drawerTechSupport"'), iScroll = html.indexOf('<!-- Scrollable drawer content -->');
if (!(iHead > 0 && iRow > iHead && iScroll > iRow)) fail.push('#drawerTechSupport must sit after .drawer-header and BEFORE the scrolling drawer content (pinned, first thing in the menu)');
if (!/id="drawerTechSupport"[^>]*onclick="closeMobileDrawer\(\); if \(window\.TechSupport\) TechSupport\.open\(\);"/.test(html)) fail.push('#drawerTechSupport must close the drawer and open TechSupport');
if (!/<script defer src="tech-support\.js\?v=\d+"><\/script>/.test(html)) fail.push('index.html must load tech-support.js');
if (!/act: 'techsupport'[^}]*k: 'ts\.title'/.test(g3) || !/act === 'techsupport'\) \{ if \(window\.TechSupport\) TechSupport\.open\(\)/.test(g3)) fail.push('g3-desk.js must keep the Tech Support rail item (desktop has no hamburger)');

// 2. back never stuck: the sheet is registered and dashboardGoBack steps through it
if (!/_BACK_OWNED = new Set\(\[[\s\S]{0,1600}'tsDim'\]\)/.test(html)) fail.push("'tsDim' must be in _BACK_OWNED");
if (!/if \(window\.TechSupport && TechSupport\.canBack\(\)\) \{ try \{ if \(TechSupport\.back\(\)\) return; \} catch \(e\) \{\} \}/.test(html)) fail.push('dashboardGoBack must call TechSupport.canBack()/back()');

// 3. never the tables that carry a LINE-push trigger
if (/from\(['"](direct_messages|announcements)['"]\)|SecureDM/.test(src)) fail.push('tech-support.js must never write direct_messages / announcements (LINE-push triggers) or use SecureDM');
// 4. "My tickets" = real tickets only (seeded batches use real players as reporters)
if (!/\.eq\('reporter_id', uid\(\)\)\.eq\('source', 'app'\)/.test(src)) fail.push("My tickets must filter .eq('source', 'app')");
if (!/source: 'app'/.test(src)) fail.push("a new ticket must be written with source: 'app'");

// 4b. screenshots (v1439): private bucket + signed URLs, a plain picker, at most 3
if (!/var BUCKET = 'support-attachments', MAX_SHOTS = 3,/.test(src)) fail.push('screenshots: bucket support-attachments, at most 3');
if (/getPublicUrl/.test(src)) fail.push('screenshots live in a PRIVATE bucket — show them with createSignedUrls, never getPublicUrl');
if (!/createSignedUrls\(/.test(src)) fail.push('hydrate() must sign the screenshot URLs');
if (!/<input type="file" id="tsFile" accept="image\/\*" multiple hidden>/.test(src) || /<input[^>]*\scapture/.test(src)) fail.push('the screenshot picker must be a plain accept="image/*" input with NO capture attribute (dead tap in LINE)');
if (!/try \{ paths = await this\._upload\('new'\); \}[\s\S]{0,700}attachments: paths/.test(src)) fail.push('a ticket must upload its screenshots BEFORE the row is written');
if (!/WhatsNew = \{\s*REL: 'v1439-techsupport'/.test(html) && !/REL: 'v1[4-9]\d\d-/.test(html)) fail.push("What's New REL must not go back to a pre-Tech-Support release");
if (!/last_reply_by, attachments'/.test(html) || (html.match(/TechSupport\.hydrate\(/g) || []).length < 2) fail.push('the Reports sheet must read attachments and hydrate the thumbs (ticket + thread)');

// 5. run the module: 4-language parity + a seeded row can never be answered/pushed
const calls = { fetch: 0, db: 0 };
const el = () => ({ style: {}, classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } }, setAttribute() {}, getAttribute() { return null; }, addEventListener() {}, appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; }, remove() {} });
const sandbox = {
  console, setTimeout: () => 0, Date, Math, JSON, Promise, Object, String, Array, RegExp, Error, isNaN,
  navigator: { userAgent: 'node', onLine: true }, location: { hostname: 'mycaddipro.com' },
  localStorage: { getItem: () => null, setItem() {} },
  fetch: () => { calls.fetch++; return Promise.resolve({}); },
  document: { currentScript: { src: 'tech-support.js?v=1' }, head: el(), documentElement: el(), createElement: el, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }
};
sandbox.window = sandbox;
sandbox.SupabaseDB = { client: { from() { calls.db++; throw new Error('db touched'); } } };
try { vm.runInNewContext(src, sandbox, { filename: 'tech-support.js' }); } catch (e) { fail.push('tech-support.js threw at load: ' + e.message); }
const TS = sandbox.TechSupport;
if (!TS) fail.push('window.TechSupport missing');
else {
  const D = TS.DICT, langs = ['en', 'th', 'ko', 'ja'], base = Object.keys(D.en).sort();
  langs.forEach(l => {
    const k = Object.keys(D[l] || {}).sort();
    const missing = base.filter(x => !k.includes(x)), extra = k.filter(x => !base.includes(x));
    if (missing.length || extra.length) fail.push('dict ' + l + ' out of parity — missing: ' + missing.join(',') + ' extra: ' + extra.join(','));
    k.forEach(x => { if (!String(D[l][x]).trim()) fail.push('dict ' + l + ' empty: ' + x); });
    if (!/\{s\}/.test(D[l]['ts.push.reply'] || '')) fail.push('dict ' + l + " ts.push.reply must keep the {s} placeholder");
  });
  ['account', 'tee_sheet', 'caddy_booking', 'registration', 'scoring', 'society', 'other'].forEach(c => { if (!D.en['ts.cat.' + c]) fail.push('category without a label: ' + c); });
  ['canBack', 'back', 'open', 'close', 'thread', 'threadHTML', 'supportReply', 'refreshBadge', 'hydrate', 'viewImage'].forEach(f => { if (typeof TS[f] !== 'function') fail.push('TechSupport.' + f + ' missing'); });
}
(async () => {
  if (TS) {
    const r = await TS.supportReply({ id: 'x', source: 'seed_qa_20260914', reporter_id: 'U123', subject: 's', status: 'open', lang: 'en' }, 'hello');
    if (r.ok !== false || r.reason !== 'seed') fail.push('supportReply must refuse a seeded row');
    if (calls.fetch || calls.db) fail.push('supportReply touched the DB / pushed for a seeded row (db ' + calls.db + ', fetch ' + calls.fetch + ')');
    // escaping: a ticket body is user text rendered with innerHTML
    const h = TS.threadHTML({ body: '<img src=x onerror=alert(1)>', created_at: '2026-10-02T00:00:00Z', reporter_name: '<b>x</b>' }, [], 'support');
    if (/<img|<b>x/.test(h)) fail.push('threadHTML must escape user text');
    // a screenshot path is DB text inside an attribute — it must be escaped too, and never used as a src directly
    const h2 = TS.threadHTML({ body: 'x', created_at: '2026-10-02T00:00:00Z', attachments: ['2026-10/a"><script>1</script>.jpg'] }, [{ author: 'support', body: 'y', created_at: '2026-10-02T00:01:00Z', attachments: ['2026-10/b.jpg'] }], 'user');
    if (/<script>/.test(h2)) fail.push('threadHTML must escape attachment paths');
    if ((h2.match(/class="ts-att"/g) || []).length !== 2 || /src="2026-10/.test(h2)) fail.push('threadHTML must render one thumb per attachment, with a placeholder src until signed');
  }
  if (fail.length) { console.error('✗ tech support guard:\n  ' + fail.join('\n  ')); process.exit(1); }
  console.log('✓ tech support: pinned drawer row, back steps, real-ticket-only rules, private screenshots, 4-language parity');
})();
