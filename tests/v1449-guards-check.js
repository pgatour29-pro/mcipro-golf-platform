// v1449 guards (found by the persona tests in Admin → Test):
//  1. Organizer PIN form: every message goes through _pinMsg (the bare NotificationManager.show is the
//     console-only class — a mismatch or failed save looked like Save doing nothing); the PIN boxes open
//     the number pad and never take a saved password.
//  2. Golfer leaderboard: special-shot labels are worked out only for special holes (a date format for
//     every scored hole froze the app ~4s a few seconds after it opened).
//  3. Live scorecard on phones pulls out exactly the parent's 12px padding (it ran 4px past both edges).
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error('v1449-guards-check: ' + msg); } };

const pinStart = html.indexOf('    async saveDashboardPin() {');
const pinEnd = html.indexOf('ROLE-BASED ACCESS CONTROL', pinStart);
const pinBody = html.slice(pinStart, pinEnd);
ok(pinStart > 0 && pinEnd > pinStart, 'saveDashboardPin not found');
ok(!/NotificationManager\.show\(/.test(pinBody), 'saveDashboardPin uses NotificationManager.show again — bare calls are silent; use this._pinMsg');
ok((pinBody.match(/this\._pinMsg\(/g) || []).length >= 10, 'saveDashboardPin messages must go through this._pinMsg');
ok(/id="pinSaveMsg"/.test(html), '#pinSaveMsg status line missing from the PIN form');
for (const id of ['superAdminPin', 'confirmSuperAdminPin', 'staffPin', 'confirmStaffPin']) {
    ok(new RegExp('id="' + id + '" inputmode="numeric" pattern="\\[0-9\\]\\*" autocomplete="new-password"').test(html), id + ' must use the number pad and autocomplete="new-password"');
}

const lbAt = html.indexOf('// Special shots! (an ace, or two-plus under par');
ok(lbAt > 0, 'leaderboard special-shot block changed');
const lbLoop = html.slice(html.lastIndexOf('allHoles.forEach(h => {', lbAt), lbAt + 400);
ok(/if \(h\.gross_score !== 1 && diff > -2\) return;/.test(lbLoop), 'ordinary holes must skip the special-shot labels');
ok(!/toLocaleDateString/.test(lbLoop), 'no date formatting per hole inside the leaderboard loop — use _shotLabel(round_id)');

ok(/#golferDashboard\.round-active #golfer-scorecard \{\s*padding: 6px 8px !important;[\s\S]{0,400}?margin: -20px -12px;\s*padding-left: 12px !important;\s*padding-right: 12px !important;/.test(html),
    'phone live scorecard must pull out -12px with 12px padding (the parent pads px-3)');

if (fail) process.exit(1);
console.log('v1449-guards-check: OK');
