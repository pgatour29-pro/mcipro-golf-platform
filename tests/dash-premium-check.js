// Guard for v1578 — PREMIUM LOOK (Pete 2026-10-15: "all of the cubes and buttons to look premium" / "Premium is the
// default" / "a constant look for both classic and glass").
// 1. index.html loads dash-premium.js after dash-glass.js (it layers over the glass cube rules by specificity).
// 2. Always on, under both looks: no look key, no switch — html.prm is set by the module itself.
// 3. Nothing moves: the file sets no layout property (no padding / margin / width / height / display / position).
// 4. Buttons keep their own colour: the layered gradient is alpha-only (no opaque colour baked in).
// 5. Left alone: the scoring engine, the login page, docks / rails / sheets, the look switch, chat rows.
// 6. Perf: the boot pass is scoped to the active screen + idle slices; a throttle valve exists; no native dialogs.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const p = read('dash-premium.js'), html = read('index.html');
const fail = [];
const gi = html.search(/<script src="dash-glass\.js\?v=\w+"><\/script>/), pi = html.search(/<script src="dash-premium\.js\?v=\w+"><\/script>/);
if (pi === -1) fail.push('index.html must load dash-premium.js');
else if (gi === -1 || pi < gi) fail.push('dash-premium.js must load AFTER dash-glass.js');
if (/dash_look_v1|ps_look_v1/.test(p)) fail.push('premium is constant under both looks: it must not read or write a look key');
if (!/classList\.toggle\('prm', want\)/.test(p)) fail.push('html.prm must be set by the module');
const css = p.slice(p.indexOf('css: function'), p.indexOf('// ---- the pass'));
if (/[{;\s](padding|margin|width|height|display|position|top|left|right|bottom|font-size|grid|flex)\s*:/.test(css)) fail.push('the premium layer must not touch layout (surfaces only)');
if (!/background-image:linear-gradient\(180deg,rgba\(255,255,255,\.16\)/.test(css) || /\[data-prm="solid"\]\{[^}]*background(-color)?:#/.test(css)) fail.push('button layers must be alpha-only (the button keeps its own colour)');
['#scorecardActiveSection', '#loginScreen', '.mhvDock', '#ddDock', '#psDock', '.dd-srail', '.dd-look', '#psgLook', '.im-row'].forEach(function (k) {
    if (p.indexOf(k) === -1 || p.indexOf(k) > p.indexOf('var SEL')) fail.push('SKIP must leave ' + k + ' alone');
});
if (!/passActive: function/.test(p) || !/idleAll: function/.test(p) || !/requestIdleCallback/.test(p)) fail.push('boot must tag the active screen first and the rest in idle slices');
if (!/return \+\+P\._n > 60;/.test(p) || !/if \(P\._t\) return;/.test(p)) fail.push('the mutation pass must have the valve + throttle');
if (!/cs\.backgroundImage !== 'none'/.test(p)) fail.push('a button that already wears a gradient or image must be left alone');
if (/\bprompt\(|\bconfirm\(|\balert\(/.test(p)) fail.push('dash-premium.js: no native dialogs');
if (fail.length) { console.error('dash-premium-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('dash-premium-check: OK');
