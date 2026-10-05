// Guard for v1469 — the Book Slot dialog's brief of WHO the booking is for (Pete 2026-10-06).
// 1. The tee sheet mounts it: form + #bk-rail inside the booking dialog, module loaded after course-crm.js,
//    and course-crm.js / booking-brief.js ship with ONE ?v= everywhere (a stale data layer under a new brief
//    is a blank panel).
// 2. The brief reads the venue book through CourseCRM only — it never queries tables itself, so the course
//    keeps seeing its OWN venue and nothing from the golfer's account beyond what CourseCRM selects.
// 3. Every string exists in all four languages; every T('key') resolves in the brief or in CourseCRM.
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const ts = read('proshop-teesheet.html'), html = read('index.html'), bb = read('booking-brief.js'), crm = read('course-crm.js');
const fail = [];

const dlg = ts.slice(ts.indexOf('<dialog id="booking-dialog">'), ts.indexOf('<!-- Caddy Picker Modal -->'));
if (!/class="bk-form"/.test(dlg) || !/<aside id="bk-rail"/.test(dlg)) fail.push('proshop-teesheet.html: #booking-dialog must hold .bk-form and #bk-rail');
if (dlg.indexOf('id="bk-rail"') < dlg.indexOf('id="recurring-preview"')) fail.push('#bk-rail must close the dialog body, after the form');
const vC = (ts.match(/course-crm\.js\?v=(\w+)/) || [])[1], vB = (ts.match(/booking-brief\.js\?v=(\w+)/) || [])[1], vI = (html.match(/course-crm\.js\?v=(\w+)/) || [])[1];
if (!vC || vC !== vB || vC !== vI) fail.push('course-crm.js / booking-brief.js must load with ONE ?v= on proshop-teesheet.html and index.html (found ' + [vC, vB, vI].join(', ') + ')');
if (ts.indexOf('booking-brief.js?v') < ts.indexOf('course-crm.js?v')) fail.push('booking-brief.js must load after course-crm.js');
if (!/BookingBrief\.mount\(\{ host: briefHost/.test(ts) || !/el\.dialog\.showModal\(\);\s*BookingBrief\.open\(\);/.test(ts)) fail.push('proshop-teesheet.html: openDialog must hand the dialog to BookingBrief');
['crm', 'lang', 'date', 'isRange', 'groupName', 'setGroupName', 'dayHits', 'caddy', 'pickCaddy', 'hasRoom', 'addGolfer', 'blockSlots', 'openFull'].forEach(k => {
    if (new RegExp('host\\.' + k + '\\(').test(bb) && !new RegExp('\\n      ' + k + '[:(]').test(ts)) fail.push('briefHost is missing ' + k + '()');
});
if (/\.from\(\s*['"]/.test(bb) || /\.rpc\(/.test(bb)) fail.push('booking-brief.js must not query the database itself — venue data comes through CourseCRM');
const profSel = (crm.match(/from\('user_profiles'\)\.select\('([^']+)'\)/g) || []).join(' ');
if (/phone|email|score/i.test(profSel)) fail.push('course-crm.js: the course never reads account phone / email / scores');

const dict = src => { const a = src.indexOf('var STR = {'), b = src.indexOf('\n  };', a); return a < 0 ? null : Function('return ' + src.slice(a + 10, b + 4).replace(/;\s*$/, ''))(); };
const B = dict(bb), C = dict(crm);
if (!B || !C) fail.push('could not read the string tables');
else {
    const en = Object.keys(B.en);
    ['th', 'ko', 'ja'].forEach(l => {
        const miss = en.filter(k => !(B[l] && k in B[l])), extra = Object.keys(B[l] || {}).filter(k => !(k in B.en));
        if (miss.length || extra.length) fail.push('booking-brief.js ' + l + ': missing [' + miss.join(', ') + '] extra [' + extra.join(', ') + ']');
    });
    const used = new Set(); let m; const re = /\bT\(\s*'([A-Za-z0-9]+)'/g;
    while ((m = re.exec(bb))) used.add(m[1]);
    ['segNew', 'segRegular', 'segLapsing', 'segOcc', 'segUp'].forEach(k => used.add(k));
    const lost = [...used].filter(k => !(k in B.en) && !(k in C.en));
    if (lost.length) fail.push('booking-brief.js uses strings nobody defines: ' + lost.join(', '));
    var nStr = en.length;
}

if (fail.length) { console.error('✗ booking brief guard:\n  ' + fail.join('\n  ')); process.exit(1); }
console.log('✓ booking brief: mounted in the Book Slot dialog, venue data via CourseCRM only, ' + nStr + ' strings in 4 languages');
