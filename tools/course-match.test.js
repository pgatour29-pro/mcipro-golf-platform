#!/usr/bin/env node
// Tests window.CourseMatch by EXTRACTING the live COURSEMATCH block out of public/index.html —
// there is deliberately no second copy of the matcher to drift out of sync (the v780 lesson).
// Run:  node tools/course-match.test.js
const fs = require('fs'), path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const m = html.match(/\/\/ COURSEMATCH:BEGIN[\s\S]*?\/\/ COURSEMATCH:END/);
if (!m) { console.error('FAIL: COURSEMATCH block not found in public/index.html'); process.exit(1); }
const store = {};
const win = { localStorage: { getItem: k => (k in store ? store[k] : null),
                              setItem: (k, v) => { store[k] = String(v); } } };
new Function('window', 'localStorage', 'console', m[0])(win, win.localStorage, console);
const CM = win.CourseMatch, N = win.normalizeCourseName;

const CANON = CM.CANON.slice();
let fails = 0;
const bad = (msg) => { console.log('  x ' + msg); fails++; };

// ---------- 1. PRECISION: no two distinct canonical courses may merge ----------
console.log('=== PRECISION: distinct canonical courses must stay distinct ===');
let collisions = 0;
for (let i = 0; i < CANON.length; i++) for (let j = i + 1; j < CANON.length; j++) {
  const r = CM.sameCourse(CANON[i], CANON[j]);
  if (r.same) { bad(`COLLISION ${CANON[i]} ~ ${CANON[j]} (${r.why})`); collisions++; }
}
console.log(collisions ? `  ${collisions} collision(s)` : `  OK - all ${CANON.length} distinct`);

// The cluster that proves a flat 80-90% threshold cannot work.
console.log('\n=== the Pattana / Pattavia / Pattaya CC cluster (75-86% alike, all different) ===');
[['Pattana','Pattaya CC'],['Pattana','Pattavia'],['Pattavia','Pattaya CC']].forEach(([a,b]) => {
  if (CM.sameCourse(a, b).same) bad(`${a} MERGED into ${b}`);
  else console.log(`  OK ${a} vs ${b} distinct`);
});

// ---------- 2. RECALL: real-world spellings resolve to the right course ----------
console.log('\n=== RECALL: real-world spellings -> canonical name ===');
const VARIANTS = [
  ['Burapha Golf & Country Club','Burapha'],
  ['Burapha Golf Club A+B','Burapha'],
  ['BURAPHA GOLF AND COUNTRY CLUB (C/D)','Burapha'],
  ['Khao Kheow Country Club','Khao Kheow'],
  ['Khao Kiew Country Club A+B','Khao Kheow'],
  ['Khao Khiew C.C.','Khao Kheow'],
  ['Phoenix Gold Golf & Country Club','Phoenix Gold'],
  ['Phoenix Gold Golf and Country Club - Ocean/Mountain','Phoenix Gold'],
  ['Siam Country Club Old Course','Siam CC Old Course'],
  ['Siam Country Club Plantation Course','Siam Plantation'],
  ['Laem Chabang International Country Club','Laem Chabang'],
  ['Laemchabang Intl CC','Laem Chabang'],
  ['Bangpakong Riverside Country Club','Bangpakong Riverside'],
  ['Bang Pakong Riverside C.C.','Bangpakong Riverside'],
  ['BRC','Bangpakong Riverside'],
  ['brc','Bangpakong Riverside'],
  ['Greenwood Golf & Resort','Greenwood'],
  ['St. Andrews 2000 Golf Club','St Andrews 2000'],
  ['Saint Andrews 2000','St Andrews 2000'],
  ['Eastern Star Country Club & Resort','Eastern Star'],
  ['Pattaya Country Club','Pattaya CC'],
  ['Pattana Golf Resort & Spa','Pattana'],
  ['Pattavia Century Golf Club','Pattavia'],
  ['Treasure Hill Golf & Country Club','Treasure Hill'],
  ['Pleasant Valley Golf & Country Club','Pleasant Valley'],
  ['Mountain Shadow Golf Club','Mountain Shadow'],
  ['Crystal Bay Golf Club B+C','Crystal Bay'],
  ['Hermes Links Golf Course','Hermes Links'],
  ['Thermes Links','Hermes Links'],
  ['Chee Chan Golf Resort','Chee Chan'],
  ['Plutaluang Royal Thai Navy Golf Course','Plutaluang'],
  ['Grand Prix Golf Club','Grand Prix'],
  ['Green Valley Golf Club','Green Valley'],
  ['Bangpra International Golf Club','Bangpra International'],
  ['Bangphra Golf Club','Bangpra International'],
  ['Royal Lakeside Golf Club','Royal Lakeside'],
];
let ok = 0;
VARIANTS.forEach(([raw, want]) => {
  const got = N(raw);
  if (got === want) ok++; else bad(`"${raw}" -> "${got}" (want "${want}")`);
});
console.log(`  ${ok}/${VARIANTS.length} correct`);

// ---------- 3. AMBIGUITY must never be guessed ----------
console.log('\n=== AMBIGUOUS input must not be guessed into a course ===');
// A shared leader over several venues is genuinely ambiguous and must list them.
[['Siam Country Club', ['Siam CC Old Course','Siam Plantation']]].forEach(([q, expect]) => {
  const r = CM.resolve(q, CANON);
  if (r.status !== 'ambiguous') bad(`"${q}" -> ${r.status} (expected ambiguous)`);
  else {
    const got = r.candidates.slice().sort().join(' | ');
    if (got !== expect.slice().sort().join(' | ')) bad(`"${q}" ambiguous over ${got}, expected ${expect.join(' | ')}`);
    else console.log(`  OK "${q}" -> ambiguous: ${got}`);
  }
});
// What actually matters for every non-identifying input: it must NEVER be guessed into a
// course. Either status is acceptable ('Valley Golf Club' is unmatched, not ambiguous, because
// a bare TRAILING word is not an identity) — silently picking one would be the bug.
['Valley Golf Club','Siam Country Club','Golf Club','Country Club','Course'].forEach(q => {
  const r = CM.resolve(q, CANON);
  if (r.status === 'matched') bad(`"${q}" was GUESSED into "${r.course}"`);
  else if (CANON.indexOf(N(q)) !== -1) bad(`normalizeCourseName("${q}") guessed "${N(q)}"`);
  else console.log(`  OK "${q}" -> ${r.status}, normalizes to "${N(q)}"`);
});

// ---------- 4. UNKNOWN courses must not be forced onto a neighbour ----------
console.log('\n=== UNKNOWN courses stay unmatched ===');
['Siam Waterside','Rolling Hills Golf Club','Emerald Golf Club','Sea Pines Golf Course',
 'East Coast Golf Club','Sriracha Golf Club'].forEach(q => {
  const r = CM.resolve(q, CANON);
  if (r.status !== 'unmatched') bad(`"${q}" -> ${r.status}: ${r.course || (r.candidates||[]).join('|')}`);
  else console.log(`  OK "${q}" unmatched -> normalizes to "${N(q)}"`);
});

// ---------- 5. CONTRACT the four replaced forks relied on ----------
console.log('\n=== contract: empty in, empty out + idempotence ===');
[['', ''], [null, ''], [undefined, '']].forEach(([i, want]) => {
  if (N(i) !== want) bad(`N(${JSON.stringify(i)}) === ${JSON.stringify(N(i))}, want ${JSON.stringify(want)}`);
});
const corpus = CANON.concat(VARIANTS.map(v => v[0]), ['Siam Country Club','Emerald Golf Club']);
let nonIdem = 0;
corpus.forEach(c => { const a = N(c); if (N(a) !== a) { bad(`not idempotent: "${c}" -> "${a}" -> "${N(a)}"`); nonIdem++; } });
console.log(nonIdem ? `  ${nonIdem} not idempotent` : '  OK - empty contract + all idempotent');

// ---------- 6. addCanon extends without duplicating ----------
console.log('\n=== addCanon() ===');
const before = CM.CANON.length;
CM.addCanon(['Siam Waterside', 'Burapha Golf & Country Club']);   // one new, one already-known
const after = CM.CANON.length;
if (after !== before + 1) bad(`addCanon added ${after - before}, expected 1 (dupes must be rejected)`);
else console.log(`  OK ${before} -> ${after}; "Siam Waterside Golf Club" now -> "${N('Siam Waterside Golf Club')}"`);


// ---------- 7. THE LIVE CONNECTOR: courses table -> canonical list ----------
// Fixture is a verbatim snapshot of the live `courses` table (75 rows, column `name`).
// It is a MIXED table: venue rows sit next to their individual nines/loops, so feeding it
// raw would make "Phoenix Gold" ambiguous across three nine rows.
console.log('\n=== LIVE CONNECTOR: courses table (75-row fixture) ===');
const live = JSON.parse(fs.readFileSync(path.join(__dirname, 'course-match.fixture.json'), 'utf8'));
const liveNames = live.map(r => r.name).filter(Boolean);

// exercise the real loader, not a re-implementation
win.SupabaseDB = { client: { from: () => ({ select: () => Promise.resolve({ data: live }) }) } };
const seeded = CM.CANON.length;

CM.loadFromDB().then(total => {
  console.log(`  CANON ${seeded} -> ${total} after loading ${liveNames.length} rows`);
  if (total <= seeded) bad('loadFromDB added nothing');
  if (store['mcipro_course_canon'] === undefined) bad('loadFromDB did not cache the list');

  // a) no venue may collide with another inside the grown list
  let coll = 0;
  for (let i = 0; i < CM.CANON.length; i++) for (let j = i + 1; j < CM.CANON.length; j++)
    if (CM.sameCourse(CM.CANON[i], CM.CANON[j]).same) { bad(`COLLISION ${CM.CANON[i]} ~ ${CM.CANON[j]}`); coll++; }
  if (!coll) console.log(`  OK no collisions across ${CM.CANON.length} canonical venues`);

  // b) every real-world spelling must STILL resolve uniquely against the bigger list
  let reg = 0;
  VARIANTS.forEach(([raw, want]) => { const got = N(raw);
    if (got !== want) { const r = CM.resolve(raw, CM.CANON);
      bad(`REGRESSION "${raw}" -> "${got}" want "${want}" [${r.status}]`); reg++; } });
  if (!reg) console.log(`  OK all ${VARIANTS.length} spellings still resolve with the live list`);

  // c) every live row must land on its own venue, never a neighbour's
  let odd = 0;
  live.forEach(r => { const got = N(r.name), venue = N(CM.cutSubvenueTail(r.name));
    if (got !== venue) { bad(`row ${r.id} "${r.name}" -> "${got}" (venue "${venue}")`); odd++; } });
  if (!odd) console.log(`  OK all ${live.length} live rows map to their own venue`);

  // d) the nine rows that used to read as venues of their own
  [['Majestic \u2014 Lake nine (Hua Hin)', 'Majestic Creek Golf Club (Hua Hin)'],
   ['Springfield \u2014 Valley nine (Hua Hin)', 'Springfield Royal Country Club (Hua Hin)'],
   ['Phoenix Gold - Ocean Nine', 'Phoenix Gold'],
   ['Khao Kheow - Course B (with A)', 'Khao Kheow'],
   ['Burapha Golf Club - West Course', 'Burapha'],
   ['Alpine \u2014 Course A nine (Chiang Mai)', 'Alpine Golf Club & Resort (Chiang Mai)']]
   .forEach(([nine, venue]) => { const got = N(nine);
     if (got !== venue) bad(`"${nine}" -> "${got}" want "${venue}"`);
     else console.log(`  OK "${nine}" -> ${venue}`); });

  // e) a real venue must NOT be swallowed by a similarly-named one
  [['Summit Green Valley Country Club (Chiang Mai)', 'Green Valley'],
   ['Green Valley Rayong Country Club', 'Summit Green Valley Country Club (Chiang Mai)'],
   ['Pineapple Valley Golf Club (Hua Hin)', 'Pleasant Valley']].forEach(([a, b]) => {
     if (CM.sameCourse(a, b).same) bad(`"${a}" collapsed into "${b}"`);
     else console.log(`  OK "${a}" stays distinct from "${b}"`);
   });

  console.log(fails ? `\nFAILED: ${fails} problem(s)` : '\nALL TESTS PASSED');
  process.exit(fails ? 1 : 0);
});
