#!/usr/bin/env node
// Regression test for the Greenwood 2026-09-12 placeholder-par corruption: a device with no
// course hole table must REFUSE to write a score rather than invent par 4 / SI = hole number.
// Extracts _hasRealHole + queueScoreSave from public/index.html (no second copy to drift).
// Run: node tools/score-write-guard.test.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

const grab = (re, label) => { const m = src.match(re); if (!m) { console.error('FAIL: ' + label + ' not found'); process.exit(1); } return m[0]; };
const hasReal = grab(/ {4}_hasRealHole\(hole\) \{[\s\S]*?\n {4}\}/, '_hasRealHole');
const queue   = grab(/ {4}queueScoreSave\(scorecardId[\s\S]*?\n {4}\}/, 'queueScoreSave');

let fails = 0; const bad = s => { console.log('  x ' + s); fails++; };

function harness(holes) {
  const toasts = [], errors = [];
  const obj = new Function('NotificationManager', 'console',
    'return ({ ' + hasReal.trim() + ',\n' + queue.trim() + ',\n' +
    'getHoleData(n){ return (this._holes||[]).find(h=>h.hole_number===n) || null; },\n' +
    '_engineStrokesFor(){ return 0; },\n' +
    '_processScoreQueue(){ this._ran = true; } })'
  )({ show: (t) => toasts.push(t) }, { error: e => errors.push(e), warn: e => errors.push(e), log(){} });
  obj._holes = holes; obj._scoreQueue = []; obj._queueProcessing = false;
  return { obj, toasts, errors };
}

const REAL = [{ hole_number: 4, par: 5, stroke_index: 5 }];
const EMPTY = [];                                        // what a combo joiner got
const NOPAR = [{ hole_number: 4, par: null, stroke_index: 4 }];

console.log('=== 1. empty hole table (the combo-joiner case) -> REFUSE ===');
{
  const h = harness(EMPTY);
  h.obj.queueScoreSave('sc-1', 4, 6, 4, 4, 12, 'Alondo Brewington');
  if (h.obj._scoreQueue.length) bad('queued a write with no table: ' + JSON.stringify(h.obj._scoreQueue));
  else console.log('  OK nothing queued');
  if (!h.errors.some(e => /refusing to save H4/.test(String(e)))) bad('no explanatory error logged');
  else console.log('  OK logged why');
  if (!h.toasts.length || !/course data/i.test(h.toasts[0])) bad('no user-visible warning: ' + JSON.stringify(h.toasts));
  else console.log('  OK told the user: "' + h.toasts[0].slice(0, 58) + '…"');
}

console.log('\n=== 2. a par of null is not a real hole -> REFUSE ===');
{
  const h = harness(NOPAR);
  h.obj.queueScoreSave('sc-2', 4, 6, 4, 4, 12, 'Alondo');
  if (h.obj._scoreQueue.length) bad('queued on a null par');
  else console.log('  OK nothing queued');
}

console.log('\n=== 3. real table -> writes normally, with the REAL par/SI ===');
{
  const h = harness(REAL);
  h.obj.queueScoreSave('sc-3', 4, 6, 5, 5, 12, 'Alondo');
  if (h.obj._scoreQueue.length !== 1) bad('did not queue a legitimate write');
  else {
    const q = h.obj._scoreQueue[0];
    if (q.par !== 5 || q.strokeIndex !== 5) bad('wrong par/SI queued: ' + JSON.stringify(q));
    else console.log('  OK queued H4 par 5 SI 5');
  }
  if (h.toasts.length) bad('warned on a healthy write: ' + JSON.stringify(h.toasts));
  else console.log('  OK no spurious warning');
}

console.log('\n=== 4. the toast fires ONCE, not on every hole ===');
{
  const h = harness(EMPTY);
  for (let i = 1; i <= 5; i++) h.obj.queueScoreSave('sc-4', i, 4, 4, i, 12, 'Alondo');
  if (h.toasts.length !== 1) bad('toast fired ' + h.toasts.length + ' times');
  else console.log('  OK one toast across 5 refused holes');
  if (h.obj._scoreQueue.length) bad('something slipped through');
  else console.log('  OK all 5 refused');
}

console.log('\n=== 5. the two backfill paths no longer fabricate ===');
[['re-upload sweeper', /skipping re-upload of H/],
 ['reconciliation backfill', /RECONCILIATION: skipping H/]].forEach(([label, re]) => {
  if (!re.test(src)) bad(label + ' still has no skip branch');
  else console.log('  OK ' + label + ' skips instead of inventing');
});
if (/const par = holeData\?\.par \|\| 4;\s*\n\s*const strokeIndex = holeData\?\.stroke_index \|\| missing\.hole;/.test(src))
  bad('reconciliation still defaults par to 4');
else console.log('  OK reconciliation no longer defaults par to 4');

console.log('\n=== 6. the host carries its stitched table, the joiner prefers it ===');
[['host writes course_holes on create', /course_holes: Array\.isArray\(this\.courseData\?\.holes\)[\s\S]{0,90}\? this\.courseData\.holes : null/],
 ['joiner selects the column', /controlled_by, starting_nine, course_holes'/],
 ['joiner prefers the carried table', /if \(carried\) \{[\s\S]{0,120}holes: carried/]].forEach(([label, re]) => {
  if (!re.test(src)) bad(label + ' MISSING'); else console.log('  OK ' + label);
});

console.log(fails ? `\nFAILED: ${fails}` : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);
