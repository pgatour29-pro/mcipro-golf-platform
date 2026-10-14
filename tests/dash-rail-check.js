// Guard for v1568 — DASH RAIL (Pete 2026-10-14: "mobile is working but where is the fucking desktop"): the golfer and
// society organizer DESKTOP get the pro shop's 76px icon rail + MORE flyout, plus the same optional GLASS as the phone.
// 1. index.html loads dash-rail.js after dash-dock.js (it reuses DashDock.setLook and the #ddGround photo).
// 2. Desktop only: every rule lives inside the min-width:1024px block; the G3 rails are restyled, never rebuilt.
// 3. MORE is read from the rail itself on every open (gated items stay out) and clicks the real rail button.
// 4. Glass stays opt-in (dash_look_v1 === 'glass'); Classic is the default.
// 5. The name + Call PIN leave the rail foot for the header — never dropped (Call PIN on every header).
// 6. The rail hides during a live round (the G3 :not(.round-active) gate is kept).
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const dr = read('dash-rail.js'), dd = read('dash-dock.js'), html = read('index.html');
const fail = [];
const ddi = html.search(/<script src="dash-dock\.js\?v=\w+"><\/script>/), dri = html.search(/<script src="dash-rail\.js\?v=\w+"><\/script>/);
if (dri === -1) fail.push('index.html must load dash-rail.js');
else if (ddi === -1 || dri < ddi) fail.push('dash-rail.js must load AFTER dash-dock.js');
if (!/var MQ = '\(min-width:1024px\)'/.test(dr) || !/'@media ' \+ MQ \+ '\{'/.test(dr)) fail.push('dash-rail.js: rules must sit in the min-width:1024px block');
if (!/on: '#golferDashboard\.g3:not\(\.round-active\)'/.test(dr)) fail.push('the golfer rail must keep the live-round gate (.g3:not(.round-active))');
if (!/rail: 'g3Rail'/.test(dr) || !/rail: 'g3oRail'/.test(dr)) fail.push('the slim rail must restyle the existing G3 rails (#g3Rail / #g3oRail)');
if (/createElement\('aside'\)/.test(dr)) fail.push('dash-rail.js must not build a second rail');
if (!/getComputedStyle\(el\)\.display === 'none'\) return;\s+\/\/ role-gated/.test(dr)) fail.push('MORE must leave out role-gated rail items');
if (!/if \(el\) el\.click\(\);/.test(dr)) fail.push('a MORE row must click the real rail button (one action path)');
if (!/localStorage\.getItem\('dash_look_v1'\) === 'glass'/.test(dr)) fail.push('glass must be opt-in (dash_look_v1 === glass)');
if (!/\.flex\.flex-col\{display:flex!important\}/.test(dr)) fail.push('the golfer header name block (Call PIN) must come back when the rail foot goes');
if (!/orgWho/.test(dr)) fail.push('the organizer foot card (name, Call PIN) must move to the header');
if (!/SHARED\.map\(/.test(dd) || !/'@media \(min-width:1024px\)\{'/.test(dd)) fail.push('dash-dock.js must emit the ground + cube glass for desktop too');
if (!/both\(' \.g3-brand'\) \+ '\{display:none!important\}'/.test(dr) || /dd-mark/.test(dr)) fail.push('no brand tile on the slim rail (Pete: the home button is enough)');
if (/font:\s*\d{3}\s+[\d.]+px(\/[\d.]+(px)?)?\s+inherit/.test(dr)) fail.push('dash-rail.js: `font:<w> <size> inherit` is invalid CSS');
if (/\bprompt\(|\bconfirm\(|\balert\(/.test(dr)) fail.push('dash-rail.js: no native dialogs');
if (fail.length) { console.error('dash-rail-check FAILED:\n - ' + fail.join('\n - ')); process.exit(1); }
console.log('dash-rail-check: OK');
