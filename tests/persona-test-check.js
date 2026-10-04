// Guards Admin → Test (v1447): the tab sits right after Engagement (tab bar + drawer), its panel,
// tab switch and script are wired, its sheets close on the phone's back (aria-label Close on a
// body-mounted *Sheet / *Overlay), and tools/personas/issues.mjs keeps the stable issue keys the
// Test page follows from run to run.
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'public', 'persona-test.js'), 'utf8');
let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error('persona-test-check: ' + msg); } };

const engBtn = html.indexOf('id="admin-engagement-tab"'), testBtn = html.indexOf('id="admin-test-tab"');
const nextBtn = html.indexOf('<button', html.indexOf('</button>', engBtn));
ok(engBtn > 0 && testBtn > 0 && html.lastIndexOf('<button', testBtn) === nextBtn, 'Test tab button must come right after Engagement in the admin tab bar');
const engDrawer = html.indexOf("showAdminTab('engagement'); closeMobileDrawer();"), testDrawer = html.indexOf("showAdminTab('test'); closeMobileDrawer();");
ok(engDrawer > 0 && testDrawer > engDrawer && html.slice(engDrawer, testDrawer).split('drawer-link').length === 2, 'Test drawer link must come right after Engagement');
ok(/<div id="admin-test" class="admin-tab-content"><\/div>/.test(html), '#admin-test panel missing');
ok(/case 'test':\s*\n\s*if \(window\.PersonaTest\) PersonaTest\.render\(\);/.test(html), "showAdminTab case 'test' must call PersonaTest.render()");
ok(/<script defer src="persona-test\.js\?v=\d+"><\/script>/.test(html), 'persona-test.js script tag missing');

ok(/window\.PersonaTest = \{/.test(js), 'window.PersonaTest missing');
ok(/sh\.id = 'ptRunSheet'/.test(js) && /o\.id = 'ptShotOverlay'/.test(js), 'run sheet / screenshot overlay ids changed (back catch-all matches *Sheet / *Overlay)');
ok((js.match(/aria-label="Close"/g) || []).length >= 2, 'both overlays need a Close control for the back button');
ok(/admin_persona_report/.test(js) && /admin_persona_run/.test(js), 'report RPCs not called');
ok(!/\.title\)/.test(js.replace(/who\([^)]*\.title\)/g, '')), 'persona titles carry a made-up first name — show them only through who()');

import(path.join(ROOT, 'tools', 'personas', 'issues.mjs')).then(({ issuesFrom, isStuck }) => {
    const results = [
        { id: 'visitor', title: 'X — visitor', steps: [{ name: 'a', ok: true }, { name: 'door', ok: false, note: 'opened', shot: 'visitor-02.jpg' }, { name: 'c', ok: false, skipped: true }], blocked: [], lint: [] },
        { id: 'golfer', title: 'Y — golfer', steps: [{ name: 'a', ok: true }], blocked: [{ m: 'DELETE', url: 'https://x.supabase.co/rest/v1/side_game_pools?id=in.(1)' }],
          lint: [{ kind: 'page-wider-than-phone', where: 'document', text: '397px vs 393px', step: 'a' }] },
        { id: 'caddie', skipped: 'no fixture', steps: [] },
    ];
    const iss = issuesFrom(results);
    const keys = iss.map((i) => i.key);
    ok(keys[0] === 'guard|golfer|DELETE https://x.supabase.co/rest/v1/side_game_pools', 'a write attempt must rank first with the query string dropped from its key: ' + keys[0]);
    ok(keys.includes('step|visitor|door'), 'step issue key changed');
    ok(keys.includes('lint|golfer|page-wider-than-phone|document|397px vs 393px'), 'lint issue key changed');
    ok(iss.find((i) => i.kind === 'step').lost === 1, 'lost steps not counted');
    ok(iss.filter(isStuck).length === 1, 'only a failed step (or crash) makes a persona stuck');
    ok(!keys.some((k) => k.includes('caddie')), 'a skipped persona must not raise issues');
    if (fail) process.exit(1);
    console.log('persona-test-check: OK');
}).catch((e) => { console.error('persona-test-check:', e); process.exit(1); });
