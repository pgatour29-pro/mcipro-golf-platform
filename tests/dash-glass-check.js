// Guard for v1570 — GLASS ON EVERY TAB (Pete 2026-10-14: "stop giving me excuses").
// 1. index.html loads dash-glass.js after dash-rail.js.
// 2. Glass stays the option: everything keys off html.dgl (DashDock.setLook / dash_look_v1); Classic is untouched.
// 3. The golfer rides the app's own dark theme for the session only — never saved to the profile (persist=false).
// 4. The pass never touches the home cubes, rails, bars, the Play Golf / scoring tab or the pro shop.
// 5. The pass is throttled (a ticker must not starve it) and re-checks a node whose class/style changed.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const g = read('dash-glass.js'), html = read('index.html');
const fail = [];
const ri = html.search(/<script src="dash-rail\.js\?v=\w+"><\/script>/), gi = html.search(/<script src="dash-glass\.js\?v=\w+"><\/script>/);
if (gi === -1) fail.push('index.html must load dash-glass.js');
else if (ri === -1 || gi < ri) fail.push('dash-glass.js must load AFTER dash-rail.js');
if (!/function glass\(\) \{ return document\.documentElement\.classList\.contains\('dgl'\); \}/.test(g)) fail.push('glass must key off html.dgl');
if (/ThemeMode\.set\('dark'\)/.test(g) || !/ThemeMode\.set\('dark', false\)/.test(g)) fail.push('the golfer dark base must not be saved to the profile (persist=false)');
['#liteCubesGrid', '#orgLiteCubesGrid', '.mhvCubeHome', '#golfer-scorecard', '#scorecardActiveSection', '.dd-srail', '#g3Rail', '.mhvDock'].forEach(function (k) { if (g.indexOf(k) === -1 || g.indexOf('var SKIP') === -1) fail.push('the pass must skip ' + k); });
if (/proshopDashboard/.test(g)) fail.push('the pro shop keeps its own PSGlass — dash-glass.js must not scope it');
if (!/if \(G\._t\) return;/.test(g)) fail.push('the pass must be throttled, not debounced');
if (!/t\._dgx = 0;/.test(g)) fail.push('a node whose class/style changed must be re-checked');
if (/\bprompt\(|\bconfirm\(|\balert\(/.test(g)) fail.push('dash-glass.js: no native dialogs');
if (fail.length) { console.error('dash-glass-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('dash-glass-check: OK');
