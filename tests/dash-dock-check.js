// Guard for v1565 — DASH DOCK (Pete 2026-10-14): golfer + society organizer PHONES get the pro shop's bottom bar instead
// of the hamburger, plus an optional GLASS look. "Mobile design does not change" / "Default is the classic view".
// 1. index.html loads dash-dock.js after g3-desk/g3-org (it wraps showGolferTab/showOrganizerTab, never replaces them).
// 2. Phone + tablet only: every rule lives inside the max-width:1023px block (desktop rails start at 1024); the hamburger is hidden there, not removed.
// 3. MORE is read from the drawer (#drawer-golfer / #drawer-organizer) — no hard-coded copy of the menu.
// 4. Glass is OFF unless localStorage dash_look_v1 === 'glass'.
// 5. The bar hides during a live round and sits UNDER every dashboard pop-up (z 45 < z-50).
// 6. The golfer chips box stays hidden; Chips stays in the drawer.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const dd = read('dash-dock.js'), html = read('index.html');
const fail = [];
const g3o = html.indexOf('<script src="g3-org.js'), ddi = html.search(/<script src="dash-dock\.js\?v=\w+"><\/script>/);
if (ddi === -1) fail.push('index.html must load dash-dock.js');
else if (g3o === -1 || ddi < g3o) fail.push('dash-dock.js must load AFTER g3-org.js');
const css = dd.slice(dd.indexOf("'@media (max-width:1023px){'"), dd.indexOf("].join('\\n')"));
if (!css) fail.push('dash-dock.js: phone CSS block not found');
if (!/openMobileDrawer[^']*\{display:none!important\}/.test(css)) fail.push('the hamburger must be hidden inside the phone block');
if (!/html\.scr-golferDashboard:not\(\.round-on\) #ddDock/.test(css)) fail.push('the bar must hide during a live round (html.round-on, mirrored from .round-active by the v1573 HTML STATE FLAGS)');
if (/body:has\(|html:has\(/.test(dd)) fail.push('dash-dock.js: no body/html-anchored :has() — Chrome re-walks the whole document per mutation (v1573); use the html.scr-*/has-* flags');
if (!/#ddDock\{z-index:45\}/.test(css)) fail.push('the bar must sit under the z-50 pop-ups (z-index:45)');
if (!/getElementById\(DOCKS\[w\]\.drawer\)/.test(dd) || !/drawer-golfer/.test(dd) || !/drawer-organizer/.test(dd)) fail.push('MORE must be read from the hamburger drawer');
if (!/localStorage\.getItem\(LOOK_KEY\) === 'glass'/.test(dd)) fail.push('glass must be opt-in (dash_look_v1 === glass)');
if (/font:\s*\d{3}\s+[\d.]+px(\/[\d.]+(px)?)?\s+inherit/.test(dd)) fail.push('dash-dock.js: `font:<w> <size> inherit` is invalid CSS');
if (/\bprompt\(|\bconfirm\(|\balert\(/.test(dd)) fail.push('dash-dock.js: no native dialogs');
if (!/<style>#golferWinningsCard\{display:none !important\}<\/style>/.test(html)) fail.push('the golfer chips box must stay hidden (Pete 2026-10-14)');
if (!/WinningsWallet\.open\(\); closeMobileDrawer\(\);"><span[^>]*>poker_chip/.test(html)) fail.push('Chips must stay in the golfer drawer (and so in MORE)');
// v1566: every dashboard (Pete: "This goes for all dashboard"): admin gets the generated bar; caddie/manager/maintenance lose
// the hamburger (outranking #mhvcCSS) and their MORE is topped up from their drawer; glass reaches the staff docks/sheets
if (!/admin:\s*\{\s*screen: 'adminDashboard', drawer: 'drawer-admin'/.test(dd)) fail.push('the platform admin phone must get the generated bar (drawer-admin)');
['caddieDashboard', 'managerDashboard', 'maintenanceDashboard'].forEach(function (d) {
    if (!new RegExp('html body #' + d + ' \\.nav-header button\\[onclick\\*="openMobileDrawer"\\]').test(css)) fail.push(d + ': the hamburger must be hidden with a selector that outranks #mhvcCSS');
});
if (!/sheet: 'cadMoreSheet'/.test(dd) || !/sheet: 'mgrMoreSheet'/.test(dd) || !/sheet: 'mntMoreSheet'/.test(dd)) fail.push('the staff MORE sheets must be topped up from their drawers');
if (!/\.mhvDock:not\(#psDock\)/.test(dd)) fail.push('staff glass must skip the pro shop (it has PSGlass)');
if (fail.length) { console.error('dash-dock-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('dash-dock-check: ok (bar replaces the hamburger on every phone dashboard, glass opt-in, chips box hidden)');
