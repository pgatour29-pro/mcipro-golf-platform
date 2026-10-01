// Guard for v1432 "the app that STARTED the login gets signed in" (2026-10-01).
// LINE returns its approval to the phone's default browser. An installed home-screen app does not
// share that browser's storage, so the login finished in Safari/Chrome and the app icon stayed
// logged out — iPhone app users tapped "Continue with LINE" on nearly every open. The OAuth state
// is now a one-time ticket: the finisher files it, the starter claims it. Fails the build if a
// piece of that chain is removed.
const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const sql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'login_handoff_20261001.sql'), 'utf8');
const fail = [];
if (!/const state = window\.LoginHandoff \? window\.LoginHandoff\.newTicket\(\) : /.test(s)) fail.push('loginWithLINE must use LoginHandoff.newTicket() as the OAuth state');
if (!/window\.LoginHandoff\.completed\(state, AppState\.currentUser && AppState\.currentUser\.lineUserId\);/.test(s)) fail.push('the OAuth return handler must call LoginHandoff.completed() after a successful LINE login');
if (!/RE: \/\^h\[sb\]\[0-9a-f\]\{40\}\$\//.test(s)) fail.push('ticket shape must stay h + s|b + 40 hex (the SQL checks the same shape; the return handler accepts state length 5..50)');
if (!/if \(mine && mine\.t === state\) \{ this\.clear\(\); return; \}/.test(s)) fail.push('a login started and finished in the same context must NOT file a hand-back');
if (!/sb\.rpc\('login_handoff_put', \{ p_ticket: state, p_user: userId \}\)/.test(s)) fail.push('completed() must file the ticket via login_handoff_put');
if (!/sb\.rpc\('login_handoff_claim', \{ p_ticket: p\.t \}\)/.test(s)) fail.push('tryClaim() must claim via login_handoff_claim');
if (!/if \(localStorage\.getItem\('line_user_id'\)\) \{ this\.clear\(\); return; \}/.test(s)) fail.push('tryClaim() must never replace an existing session');
if (!/sessionStorage\.getItem\('__oauth_in_progress'\) \|\| \/\[\?&\]code=\/\.test\(location\.search\)/.test(s)) fail.push('tryClaim() must stand down while this context is finishing its own OAuth return');
if (!/window\.LoginHandoff\.watch\(\);/.test(s)) fail.push('LoginHandoff.watch() must be started');
['visibilitychange', 'pageshow', 'focus'].forEach(ev => { if (!new RegExp("addEventListener\\('" + ev + "', ").test(s.slice(s.indexOf('window.LoginHandoff = {'), s.indexOf('window.LoginHandoff.watch();')))) fail.push('watch() must retry the claim on ' + ev); });
['lgv2.handoff.title', 'lgv2.handoff.body', 'lgv2.handoff.ok', 'lgv2.ioshint.appbody', 'lgv2.ioshint.appnote'].forEach(k => {
    const n = (s.match(new RegExp("'" + k.replace(/\./g, '\\.') + "': '", 'g')) || []).length;
    if (n !== 4) fail.push('i18n key ' + k + ' must exist in all 4 languages (found ' + n + ')');
});
if (!/enable row level security/.test(sql) || !/revoke all on public\.login_handoffs from public, anon, authenticated/.test(sql)) fail.push('sql: login_handoffs must stay locked to the browser');
if (!/claimed_at is null/.test(sql) || !/on conflict \(ticket_hash\) do nothing/.test(sql)) fail.push('sql: a ticket must be single-use and never re-pointable');
if (fail.length) { console.error('✗ login hand-back guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ login hand-back: ticket state, finisher files, starter claims, 5 strings in 4 languages');
