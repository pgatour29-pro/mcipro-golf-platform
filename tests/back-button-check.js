// Guard for v1366 "back never stuck" (Pete 2026-09-26: "never happen again").
// Fails the build if the back button stops being the top layer or the catch-all is removed.
const fs = require('fs');
const s = fs.readFileSync(require('path').join(__dirname, '..', 'public', 'index.html'), 'utf8');
const fail = [];
if (!/#dashboardBackBtn\s*\{\s*z-index:\s*2147483000\s*!important;\s*\}/.test(s)) fail.push('#dashboardBackBtn must be z-index 2147483000 !important (top layer)');
const lowered = s.match(/#dashboardBackBtn[^{]*\{[^}]*z-index:\s*(\d+)/g) || [];
lowered.forEach(r => { const z = +r.match(/z-index:\s*(\d+)/)[1]; if (z !== 2147483000 && z !== 9999) fail.push('a rule sets the back button z-index to ' + z + ' — never lower it: ' + r.slice(0, 90)); });
if (!/function dashboardGoBack\(\) \{\s*\/\/ v1366[^\n]*\n\s*if \(_backDialog\(\)\) return;[\s\S]{0,400}?const _top = _backTopOverlay\(\);\s*if \(_top\) \{ _backCloseOverlay\(_top\); return; \}/.test(s)) fail.push('dashboardGoBack must start with _backDialog() (v1559) then the _backTopOverlay() catch-all');
// v1559: Android's back is a close request — a self-re-arming CloseWatcher routes EVERY press into dashboardGoBack, so
// back can never walk out of the app (Pete 2026-10-13: "make sure the back button does not back out of the app").
if (!/_armWatch\(\) \{[\s\S]{0,300}new CloseWatcher\(\);[\s\S]{0,200}w\.onclose = \(\) => \{[^}]*this\._armWatch\(\); this\._inAppBack\(\); \};/.test(s)) fail.push('PWAGuard must arm a CloseWatcher that re-arms itself and runs the in-app back on every close (v1559)');
if (!/this\._armWatch\(\);\s*\n\s*\/\/ Handle page visibility/.test(s)) fail.push('PWAGuard.init must arm the CloseWatcher (v1559)');
if (!/v1402 BACK NEVER A DEAD TAP[\s\S]{0,900}if \(!NavHistory\.canGoBack\(\)\) \{[\s\S]{0,400}showGolferTab\('overview', null\)/.test(s)) fail.push('dashboardGoBack must fall back to the golfer home when history is empty (v1402)');
if (!/if \(dashboardId === 'golferDashboard' && typeof NavHistory !== 'undefined'\) NavHistory\.push\(/.test(s)) fail.push('TabManager.showTab must record golfer tab switches in NavHistory (v1402)');
// v1442: a PIN organizer (no line_user_id) never leaves the organizer home for the organizer's PERSONAL golfer dashboard
if (!/org-on-home'\)\) \{ try \{ showOrganizerTab\('home'\); \} catch \(e\) \{\} return; \}[\s\S]{0,900}_ownGolfer = localStorage\.getItem\('line_user_id'\)[\s\S]{0,120}if \(!_ownGolfer\) return;[\s\S]{0,120}ScreenManager\.showScreen\('golferDashboard'\)/.test(s)) fail.push('organizer-home back must check line_user_id before leaving to the golfer dashboard (v1442: PIN entrants have no golfer account)');
if (/window\.LiveGamesSystem\?\.cleanupOldPools\)\s*\{\s*window\.LiveGamesSystem\.cleanupOldPools\(\);/.test(s)) fail.push('LiveScorecardManager.init must not run the global side_game_pools delete from the browser (v1442)');
// v1547: the phone's back must never close the app after two backs in a row. Chrome skips EVERY entry of a page that
// pushes history after a back press without a fresh tap — so popstate may only push at d<=0, and the buffer is refilled
// from a real tap/key (Tap-In post → wall → OUT, Pete 2026-10-13).
{
  const g = (s.match(/window\.addEventListener\("popstate", \(e\) => \{[\s\S]*?\n                \}\);/) || [''])[0];
  if (!g) fail.push('PWAGuard popstate handler not found');
  else if (g.split('history.pushState').length - 1 !== 1 || !/if \(d <= 0\) \{[\s\S]{0,400}history\.pushState/.test(g)) fail.push('PWAGuard popstate must push ONLY when the buffer is used up (d <= 0) — an unconditional re-push makes Chrome skip the whole app on the next back (v1547)');
  if (!/BACK_DEPTH: \d+/.test(s) || !/\['click', 'touchend', 'keydown'\]\.forEach\(t => window\.addEventListener\(t, refill/.test(s)) fail.push('PWAGuard must refill its back buffer from click/touchend/keydown (v1547)');
}
if (fail.length) { console.error('✗ back button guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ back button: top layer + catch-all in place');
