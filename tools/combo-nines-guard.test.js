#!/usr/bin/env node
// Regression test for the WRONG-NINES class of bug on multi-nine courses (v1176).
//
// Greenwood 2026-09-12 showed the "no table" half of it: a phone that joined a live combo
// round rebuilt the course from the BASE slug, got nothing, and wrote par 4 / SI = hole number.
// v1171 made a missing table refuse to write. This covers the half that was still open — a
// table that is present but WRONG:
//   'burapha' IS East A+B, 'plutaluang' and 'siam_plantation' each hold one arbitrary 18 under
//   the base slug. A joining phone (which never has comboNines) patched from those rows and
//   then pushed them into every card's score rows via recomputeScoresForCourseChange.
// Extracts the real methods from public/index.html so there is no second copy to drift.
// Run: node tools/combo-nines-guard.test.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

const grab = (re, label) => { const m = src.match(re); if (!m) { console.error('FAIL: ' + label + ' not found'); process.exit(1); } return m[0]; };
const comboCfg  = grab(/ {4}_comboConfig\(\) \{[\s\S]*?\n {4}\}/, '_comboConfig');
const ninesFrom = grab(/ {4}_ninesFromCourseName\(courseKey, courseName\) \{[\s\S]*?\n {4}\}/, '_ninesFromCourseName');
const holeSig   = grab(/ {4}_holeTableSig\(holes\) \{[\s\S]*?\n {4}\}/, '_holeTableSig');
const applyRow  = grab(/ {4}_applyCourseTableFromRow\(row\) \{[\s\S]*?\n {4}\}/, '_applyCourseTableFromRow');
const getHole   = grab(/ {4}getHoleData\(holeNumber\) \{[\s\S]*?\n {4}\}/, 'getHoleData');
const refresh   = grab(/ {4}async refreshCourseDataFromDB\(\) \{[\s\S]*?\n {4}\}/, 'refreshCourseDataFromDB');

let fails = 0; const bad = s => { console.log('  x ' + s); fails++; };
const ok  = s => console.log('  OK ' + s);

// --- a document stub carrying the real venue pickers -------------------------------------
const SELECTS = {
  buraphaFront9:    [['A', 'Course A'], ['B', 'Course B'], ['C', 'Course C'], ['D', 'Course D']],
  buraphaBack9:     [['A', 'Course A'], ['B', 'Course B'], ['C', 'Course C'], ['D', 'Course D']],
  plantationFront9: [['sugarcane', 'Sugar Cane Loop'], ['tapioca', 'Tapioca Loop'], ['pineapple', 'Pineapple Loop']],
  plantationBack9:  [['sugarcane', 'Sugar Cane Loop'], ['tapioca', 'Tapioca Loop'], ['pineapple', 'Pineapple Loop']],
  plutaluangFront9: [['East', 'East Course'], ['South', 'South Course'], ['West', 'West Course'], ['North', 'North Course']],
  plutaluangBack9:  [['East', 'East Course'], ['South', 'South Course'], ['West', 'West Course'], ['North', 'North Course']]
};
const documentStub = {
  getElementById(id) {
    const rows = SELECTS[id];
    if (!rows) return null;
    return { value: '', options: rows.map(([value, textContent]) => ({ value, textContent })) };
  }
};

function make(extra) {
  const toasts = [], logs = [];
  const obj = new Function('document', 'window', 'console', '_lvT', 'LiveScorecardSystem',
    'return ({ ' + [comboCfg, ninesFrom, holeSig, applyRow, getHole, refresh].map(s => s.trim()).join(',\n') + ',\n' +
    'saveRoundState(){ this._saved = (this._saved||0)+1; },\n' +
    'renderHole(){}, renderLiveScorecard(){}, debouncedRefreshLeaderboard(){} })'
  )(documentStub,
    { NotificationManager: { show: t => toasts.push(t) }, SupabaseDB: { client: null } },
    { log: m => logs.push(String(m)), warn: m => logs.push(String(m)), error: m => logs.push(String(m)) },
    (k, d) => d,
    { GolfScoringEngine: { normalizeDuplicateSI(){} } });
  Object.assign(obj, extra || {});
  return { obj, toasts, logs };
}

const table = (pars, sis) => pars.map((p, i) => ({ hole_number: i + 1, par: p, stroke_index: sis[i] }));
// the real white cards, straight out of prod course_holes
const WEST_CD = table([4,5,4,4,3,4,5,3,4,5,3,4,4,5,4,4,3,4], [4,8,2,14,18,12,10,16,6,13,11,7,3,9,5,17,15,1]);
const EAST_AB = table([4,4,3,4,5,3,5,4,4,4,4,3,4,4,5,4,3,5], [14,6,18,8,12,16,10,4,2,3,13,17,9,5,11,1,15,7]);

console.log('=== 1. a joined combo round is NEVER patched from the venue base slug ===');
{
  // The exact Burapha C+D shape: joiner holds the carried West table, comboNines is null
  // (the DB-join path has never had it), courseData.id is the base slug 'burapha' — whose
  // course_holes rows are East A+B, a completely different 18.
  let queried = null;
  const h = make({ courseData: { id: 'burapha', name: 'Burapha Golf Club (C+D)', holes: JSON.parse(JSON.stringify(WEST_CD)) },
                   courseId: 'burapha', comboNines: null, selectedTeeMarker: 'white' });
  const chain = { select(){ return this; }, eq(f, v){ if (f === 'course_id') queried = v; return this; },
                  order(){ return Promise.resolve({ data: EAST_AB.map(x => ({ hole_number: x.hole_number, par: x.par, stroke_index: x.stroke_index })) }); } };
  global.window = { SupabaseDB: { client: { from: () => chain } } };
  const fn = new Function('window', 'console', 'LiveScorecardSystem', 'self',
    'return (' + refresh.trim().replace(/^async refreshCourseDataFromDB\(\)/, 'async function ()') + ').call(self)');
  return fn(global.window, { log(){}, warn(){}, error(){} }, { GolfScoringEngine: { normalizeDuplicateSI(){} } }, h.obj)
    .then(() => {
      if (queried) bad('it queried course_holes for "' + queried + '" — the base slug is a different 18');
      else ok('no base-slug query was made');
      const pars = h.obj.courseData.holes.map(x => x.par).join(',');
      if (pars !== WEST_CD.map(x => x.par).join(',')) bad('the carried C+D table was overwritten: ' + pars);
      else ok('the carried C+D table survived intact');
      rest();
    });
}

function rest() {
console.log('\n=== 2. the "(F+B)" stamp resolves to real option VALUES ===');
{
  const { obj } = make({});
  const cases = [
    ['burapha', 'Burapha Golf Club (C+D)', 'C', 'D'],
    ['plutaluang', 'Plutaluang Navy Golf Course (West+North)', 'West', 'North'],
    // the trap: the card says the DISPLAY name, the picker value is 'sugarcane'
    ['siam_plantation', 'Siam Plantation (Sugar Cane+Tapioca)', 'sugarcane', 'tapioca']
  ];
  for (const [key, name, f, b] of cases) {
    const got = obj._ninesFromCourseName(key, name);
    if (!got || got.front !== f || got.back !== b) bad(name + ' -> ' + JSON.stringify(got));
    else ok(name + ' -> ' + f + '+' + b);
  }
  if (obj._ninesFromCourseName('burapha', 'Burapha Golf Club')) bad('an unstamped name should resolve to null');
  else ok('an unstamped name resolves to null (never a guess)');
  if (obj._ninesFromCourseName('bangpakong', 'Bangpakong (A+B)')) bad('a non-combo venue should resolve to null');
  else ok('a non-combo venue resolves to null');
}

console.log('\n=== 3. getHoleData must not hand back a different hole from a sparse table ===');
{
  // A table seeded from the group's scores on a 10th-tee start: holes 10-18 only.
  const seeded = [10,11,12,13,14,15,16,17,18].map(n => ({ hole_number: n, hole: n, par: 4, stroke_index: n - 9 }));
  const { obj } = make({ courseData: { holes: seeded } });
  if (obj.getHoleData(1)) bad('hole 1 resolved off a table that starts at hole 10: ' + JSON.stringify(obj.getHoleData(1)));
  else ok('hole 1 is absent (so the v1171 write guard refuses it)');
  if (obj.getHoleData(12)?.hole_number !== 12) bad('hole 12 did not resolve');
  else ok('hole 12 still resolves');
  // legacy tables with no hole numbers keep the positional fallback
  const legacy = { holes: [{ par: 4 }, { par: 5 }, { par: 3 }] };
  const l = make({ courseData: legacy }).obj;
  if (l.getHoleData(2)?.par !== 5) bad('legacy positional fallback broke');
  else ok('legacy unnumbered tables still resolve positionally');
}

console.log('\n=== 4. a mid-round nine change is adopted from the group, once ===');
{
  const h = make({ courseData: { id: 'burapha', name: 'Burapha Golf Club (C+D)', holes: JSON.parse(JSON.stringify(WEST_CD)) },
                   courseId: 'burapha', comboNines: { course: 'burapha', front: 'C', back: 'D' } });
  if (h.obj._applyCourseTableFromRow({ course_holes: JSON.parse(JSON.stringify(WEST_CD)), course_name: 'Burapha Golf Club (C+D)' }))
    bad('adopted an identical table (realtime echo loop)');
  else ok('an identical table is ignored — no echo loop');

  const changed = h.obj._applyCourseTableFromRow({ course_holes: EAST_AB, course_name: 'Burapha Golf Club (A+B)' });
  if (!changed) bad('did not adopt the new table');
  else ok('adopted the new table');
  if (h.obj.courseData.holes.map(x => x.par).join(',') !== EAST_AB.map(x => x.par).join(',')) bad('pars did not follow');
  else ok('par/SI followed the group');
  if (h.obj.comboNines?.back !== 'B') bad('comboNines did not follow: ' + JSON.stringify(h.obj.comboNines));
  else ok('comboNines followed to C+... -> A+B');
  if (!h.toasts.length) bad('the golfer was not told the nines changed');
  else ok('golfer told: "' + h.toasts[0] + '"');
  if (!h.obj._saved) bad('the change was not persisted');
  else ok('persisted to round state');

  const partial = make({ courseData: { holes: WEST_CD } }).obj;
  if (partial._applyCourseTableFromRow({ course_holes: WEST_CD.slice(0, 6) })) bad('adopted a partial table');
  else ok('a partial table is never adopted');
}

console.log('\n=== 5. the source still refuses to publish anything short of 18 holes ===');
{
  const pub = grab(/ {4}async _publishCourseTableToCards\(\) \{[\s\S]*?\n {4}\}/, '_publishCourseTableToCards');
  if (!/holes\.length < 18/.test(pub)) bad('_publishCourseTableToCards lost its 18-hole floor');
  else ok('_publishCourseTableToCards refuses a partial table');
  const join = grab(/ {4}async _findMyLiveRoundInDb\(\) \{[\s\S]*?\n {4}\}/, '_findMyLiveRoundInDb');
  if (!/FINAL CROSS-CHECK/.test(join)) bad('the join cross-check against the group scores is gone');
  else ok('the join still cross-checks its table against the group scores');
  if (/loadCourseData\(head\.course_id/.test(join) && !/} else \{\n *try \{ courseData = await this\.loadCourseData/.test(join))
    bad('loadCourseData(base slug) is reachable for a combo again');
  else ok('loadCourseData is only reached for non-combo venues');
}

console.log(fails ? '\n' + fails + ' CHECK(S) FAILED' : '\nAll combo-nines guards hold ✅');
process.exit(fails ? 1 : 0);
}
