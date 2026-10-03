// Guards tools/personas/guard.mjs: a persona on the LIVE app can read anything but can never write a
// live table or call a write-shaped RPC; telemetry and read RPCs pass. If this fails, personas are
// unsafe to run against production.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'personas', 'guard.mjs'), 'utf8');
const m = /GUARD_JS = `([\s\S]*?)`;\s*$/m.exec(src);
if (!m) { console.error('personas-guard-check: GUARD_JS not found'); process.exit(1); }
const calls = [];
const win = {
    fetch: (input, init) => { calls.push(((init && init.method) || 'GET') + ' ' + input); return Promise.resolve({ status: 200 }); },
    Response: class { constructor(body, init) { this.status = init.status; } },
};
win.window = win;
vm.runInNewContext('window.fetch = window.fetch; ' + m[1].replace(/\\\\/g, '\\').replace(/\\`/g, '`'), win);
const SB = 'https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/';
const cases = [
    ['DELETE', SB + 'caddy_notebook?id=eq.1', 403],
    ['POST', SB + 'event_registrations', 403],
    ['PATCH', SB + 'user_profiles?line_user_id=eq.x', 403],
    ['POST', SB + 'rpc/claim_hot_deal', 403],
    ['POST', SB + 'rpc/caddyProfileWrite', 403],
    ['POST', SB + 'rpc/login_handoff_claim', 403],
    ['POST', SB + 'rpc/get_buddy_suggestions', 200],
    ['POST', SB + 'rpc/admin_user_activity_report', 200],
    ['POST', SB + 'client_errors', 200],
    ['POST', SB + 'app_section_views', 200],
    ['GET', SB + 'society_events?select=id', 200],
    ['POST', 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-oauth-exchange', 403],
];
let bad = 0;
(async () => {
    for (const [method, url, want] of cases) {
        const r = await win.fetch(url, { method });
        if (r.status !== want) { bad++; console.error(`  guard: ${method} ${url.replace(SB, '')} -> ${r.status}, wanted ${want}`); }
    }
    const blocked = win.__personaBlocked.length;
    const wantBlocked = cases.filter((c) => c[2] === 403).length;
    if (blocked !== wantBlocked) { bad++; console.error(`  guard: recorded ${blocked} blocked calls, wanted ${wantBlocked}`); }
    if (bad) { console.error(`personas-guard-check: ${bad} failure(s)`); process.exit(1); }
    console.log(`personas-guard-check: ${cases.length} cases ok (${blocked} writes refused)`);
})();
