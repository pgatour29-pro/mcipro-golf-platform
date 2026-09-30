// Guard for v1428 "every PIN pill names where the pin is" (Pete 2026-10-01: "Papercard PIN pill gives
// location on the pill but on the Card and Keypad scorecard it does not, it just says PIN").
// The location used to be bolted onto the Paper Card pill only. It now lives in THE pill body
// (PinSheetManager.pillInner -> pillLabel), and the per-hole refresh writes every pill.
// Fails the build if a live view draws a pill without the location slot.
const fs = require('fs');
const s = fs.readFileSync(require('path').join(__dirname, '..', 'public', 'index.html'), 'utf8');
const fail = [];
if (!/pillLabel\(hole\) \{[\s\S]{0,400}this\.labelFor\(q, h\)/.test(s)) fail.push('PinSheetManager.pillLabel(hole) must exist and read labelFor (quadrant name or letter)');
if (!/pillInner\(hole\) \{[\s\S]{0,400}class="pin-q"[\s\S]{0,80}this\.pillLabel\(hole\)/.test(s)) fail.push('pillInner(hole) must carry the .pin-q location slot');
// every pill button in the file: either built with pillInner(...) or (the static Keypad one) holding a .pin-q span
const pills = s.match(/<button type="button" id="\w+" class="pin-pill"[^\n]*/g) || [];
if (pills.length < 4) fail.push('expected 4 PIN pills (Keypad, Card, 3-hole pace, Paper), found ' + pills.length);
pills.forEach(p => {
    const id = (p.match(/id="(\w+)"/) || [])[1];
    const next = s.slice(s.indexOf(p), s.indexOf(p) + 700);
    if (!/pillInner\(this\.currentHole\)/.test(next) && !/<span class="pin-q"><\/span>/.test(next)) fail.push('#' + id + ' draws a PIN pill without the location (use PinSheetManager.pillInner(this.currentHole))');
});
const upd = (s.match(/updatePinPositionIndicator\(\) \{[\s\S]{0,1800}?\n    \}/) || [''])[0];
['holePinIndicator', 'tradPinIndicator', 'pacePinIndicator', 'pcvPinIndicator'].forEach(id => {
    if (!upd.includes("'" + id + "'")) fail.push('updatePinPositionIndicator must refresh #' + id);
});
if (!/pillLabel\(this\.currentHole\)/.test(upd) || !/querySelector\('\.pin-q'\)/.test(upd)) fail.push('updatePinPositionIndicator must write the location into every pill, not one');
if (fail.length) { console.error('✗ PIN pill guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ PIN pill: all ' + pills.length + ' live pills name the pin location');
