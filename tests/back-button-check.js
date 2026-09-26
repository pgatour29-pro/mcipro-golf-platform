// Guard for v1366 "back never stuck" (Pete 2026-09-26: "never happen again").
// Fails the build if the back button stops being the top layer or the catch-all is removed.
const fs = require('fs');
const s = fs.readFileSync(require('path').join(__dirname, '..', 'public', 'index.html'), 'utf8');
const fail = [];
if (!/#dashboardBackBtn\s*\{\s*z-index:\s*2147483000\s*!important;\s*\}/.test(s)) fail.push('#dashboardBackBtn must be z-index 2147483000 !important (top layer)');
const lowered = s.match(/#dashboardBackBtn[^{]*\{[^}]*z-index:\s*(\d+)/g) || [];
lowered.forEach(r => { const z = +r.match(/z-index:\s*(\d+)/)[1]; if (z !== 2147483000 && z !== 9999) fail.push('a rule sets the back button z-index to ' + z + ' — never lower it: ' + r.slice(0, 90)); });
if (!/function dashboardGoBack\(\) \{\s*\/\/ v1366[^\n]*\n\s*const _top = _backTopOverlay\(\);\s*if \(_top\) \{ _backCloseOverlay\(_top\); return; \}/.test(s)) fail.push('dashboardGoBack must start with the _backTopOverlay() catch-all');
if (fail.length) { console.error('✗ back button guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ back button: top layer + catch-all in place');
