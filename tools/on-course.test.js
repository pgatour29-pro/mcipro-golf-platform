#!/usr/bin/env node
// Tests the organizer on-course board by EXTRACTING it from public/index.html — no second copy
// to drift. Fixture is a verbatim snapshot of three real events.
// Run: node tools/on-course.test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const m = html.match(/\/\/ ONCOURSE:BEGIN[\s\S]*?\/\/ ONCOURSE:END/);
if (!m) { console.error('FAIL: ONCOURSE block not found in public/index.html'); process.exit(1); }
const win = {};
const OC = new Function('window', '_lvLocale', 'document',
  m[0] + '\nreturn OnCourse;')(win, () => 'en-US', { getElementById: () => null });

let fails = 0; const bad = s => { console.log('  x ' + s); fails++; };
const T0 = Date.parse('2026-09-12T06:00:00Z');
const at = min => new Date(T0 + min * 60000).toISOString();
// n holes played at 12 min each, in the given hole order
const play = (cardId, order, n, pace = 12) =>
  order.slice(0, n).map((h, i) => ({ scorecard_id: cardId, hole_number: h, updated_at: at(i * pace) }));
const FRONT = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
const BACK  = [10,11,12,13,14,15,16,17,18,1,2,3,4,5,6,7,8,9];

console.log('=== 1. a front-nine group 4 holes in is standing on hole 5 ===');
{
  const cards = [{ id: 'c1', group_id: 'g1', player_name: 'A A', status: 'in_progress', starting_nine: 'front' }];
  const g = OC.computeGroups(cards, play('c1', FRONT, 4), T0 + 50 * 60000)[0];
  if (g.currentHole !== 5) bad('currentHole ' + g.currentHole + ', want 5'); else console.log('  OK on hole 5');
  if (g.holesDone !== 4) bad('holesDone ' + g.holesDone); else console.log('  OK 4/18 done');
}

console.log('\n=== 2. THE BACK-NINE TRAP: 4 holes in from the 10th is hole 14, not 5 — and 14/18 ===');
{
  const cards = [{ id: 'c1', group_id: 'g1', player_name: 'A A', status: 'in_progress', starting_nine: 'back' }];
  const g = OC.computeGroups(cards, play('c1', BACK, 4), T0 + 50 * 60000)[0];
  if (g.currentHole !== 14) bad('currentHole ' + g.currentHole + ', want 14'); else console.log('  OK on hole 14');
  if (g.holesDone !== 4) bad('progress ' + g.holesDone + '/18 — a back starter on 14 has 14 to play, not 4');
  else console.log('  OK progress 4/18 (not 14/18)');
  // and after the turn it wraps to the front
  const g2 = OC.computeGroups(cards, play('c1', BACK, 9), T0 + 120 * 60000)[0];
  if (g2.currentHole !== 1) bad('after 9 holes from the 10th it should be on hole 1, got ' + g2.currentHole);
  else console.log('  OK wraps to hole 1 at the turn');
}

console.log('\n=== 3. pace and ETA ===');
{
  const cards = [{ id: 'c1', group_id: 'g1', player_name: 'A A', status: 'in_progress', starting_nine: 'front' }];
  const g = OC.computeGroups(cards, play('c1', FRONT, 6, 15), T0 + 80 * 60000)[0];
  if (g.paceMin !== 15) bad('pace ' + g.paceMin + ', want 15'); else console.log('  OK 15 m/hole');
  // 6 done, last write at t+75, 12 to play at 15 = 180 min -> 255 min after T0
  const wantEta = T0 + 75 * 60000 + 12 * 15 * 60000;
  if (Math.abs(g.etaMs - wantEta) > 60000) bad('eta off by ' + Math.round((g.etaMs - wantEta) / 60000) + ' min');
  else console.log('  OK ETA ' + new Date(g.etaMs).toISOString().slice(11, 16) + ' (12 holes at 15m)');
  const one = OC.computeGroups(cards, play('c1', FRONT, 1), T0)[0];
  if (one.paceMin !== null) bad('claimed a pace from a single hole'); else console.log('  OK no pace from one hole');
}

console.log('\n=== 4. a group with NO scores is unlocatable — never pinned, never counted as "out" ===');
{
  const cards = [{ id: 'c1', group_id: 'g1', player_name: 'A A', status: 'in_progress', starting_nine: 'front' }];
  const g = OC.computeGroups(cards, [], T0)[0];
  if (!g.noScores) bad('not flagged noScores'); else console.log('  OK flagged noScores');
  const s = OC.summarise([g]);
  if (s.out !== 0 || s.noScores !== 1) bad('summary ' + JSON.stringify(s)); else console.log('  OK counted separately, not as "still out"');
}

console.log('\n=== 5. stalled: no score for 25+ min while still out ===');
{
  const cards = [{ id: 'c1', group_id: 'g1', player_name: 'A A', status: 'in_progress', starting_nine: 'front' }];
  const sc = play('c1', FRONT, 3);
  const fresh = OC.computeGroups(cards, sc, T0 + 30 * 60000)[0];   // last write t+24, 6 min ago
  if (fresh.stalled) bad('flagged stalled after 6 min'); else console.log('  OK not stalled at 6 min');
  const old = OC.computeGroups(cards, sc, T0 + 70 * 60000)[0];      // 46 min ago
  if (!old.stalled) bad('not flagged after 46 min'); else console.log('  OK stalled at 46 min (' + old.idleMin + 'm)');
}

console.log('\n=== 6. the group tracks its FURTHEST card (one device scores them all) ===');
{
  const cards = [
    { id: 'c1', group_id: 'g1', player_name: 'A A', status: 'in_progress', starting_nine: 'front' },
    { id: 'c2', group_id: 'g1', player_name: 'B B', status: 'in_progress', starting_nine: 'front' }];
  const g = OC.computeGroups(cards, [...play('c1', FRONT, 7), ...play('c2', FRONT, 5)], T0 + 90 * 60000)[0];
  if (g.holesDone !== 7) bad('holesDone ' + g.holesDone + ', want 7'); else console.log('  OK 7 (not the lagging card\'s 5)');
  if (g.players.length !== 2) bad('players ' + g.players.length); else console.log('  OK both players listed');
}

console.log('\n=== 7. finished groups, and the summary an organizer actually reads ===');
{
  const cards = [
    { id: 'a', group_id: 'g1', player_name: 'A A', status: 'completed', starting_nine: 'front' },
    { id: 'b', group_id: 'g2', player_name: 'B B', status: 'in_progress', starting_nine: 'front' },
    { id: 'c', group_id: 'g3', player_name: 'C C', status: 'in_progress', starting_nine: 'front' }];
  const g = OC.computeGroups(cards,
    [...play('a', FRONT, 18), ...play('b', FRONT, 12, 14), ...play('c', FRONT, 9, 16)], T0 + 200 * 60000);
  const s = OC.summarise(g);
  if (s.finished !== 1 || s.out !== 2) bad('summary ' + JSON.stringify(s));
  else console.log('  OK 1 in, 2 still out');
  if (!s.lastInMs) bad('no projection for the last group');
  else console.log('  OK last group in ~' + new Date(s.lastInMs).toISOString().slice(11, 16) +
                   ' (the slower of the two, which is what the kitchen needs)');
  const slowest = Math.max(...g.filter(x => !x.finished).map(x => x.etaMs));
  if (s.lastInMs !== slowest) bad('lastIn is not the slowest group');
}

console.log('\n=== 8. real events (verbatim fixture) ===');
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'on-course.fixture.json'), 'utf8'));
Object.entries(fx).forEach(([label, d]) => {
  const g = OC.computeGroups(d.cards, d.scores, Date.parse('2026-09-12T12:00:00Z'));
  const s = OC.summarise(g);
  const paces = g.filter(x => x.paceMin).map(x => x.paceMin);
  console.log('  ' + label + ': ' + g.length + ' groups, ' + s.finished + ' in, ' +
              s.noScores + ' not scoring, paces ' + (paces.join('/') || '—') + ' m/hole');
  if (g.some(x => x.holesDone > 18)) bad(label + ': a group shows more than 18 holes');
  paces.forEach(p => { if (p < 3 || p > 60) bad(label + ': implausible pace ' + p + ' m/hole'); });
});
console.log('  OK all real events produce plausible positions and paces');


// ---------- 9. render ----------
console.log('\n=== 9. render ===');
{
  const els = {};
  const mk = id => ({ id, innerHTML: '', style: {} });
  const doc = { getElementById: id => (els[id] = els[id] || mk(id)) };
  const OC2 = new Function('window', '_lvLocale', 'document', m[0] + '\nreturn OnCourse;')({}, () => 'en-US', doc);
  const cards = [
    { id: 'a', group_id: 'g1', player_name: 'Pete Park',   status: 'completed',   starting_nine: 'front' },
    { id: 'b', group_id: 'g2', player_name: 'Alondo B',    status: 'in_progress', starting_nine: 'front' },
    { id: 'c', group_id: 'g3', player_name: '<img src=x>', status: 'in_progress', starting_nine: 'back'  },
    { id: 'd', group_id: 'g4', player_name: 'No Score',    status: 'in_progress', starting_nine: 'front' }];
  const sc = [...play('a', FRONT, 18), ...play('b', FRONT, 11, 14), ...play('c', BACK, 5, 13)];
  OC2.render(OC2.computeGroups(cards, sc, T0 + 200 * 60000));
  const h = els['onCourseBody'].innerHTML;

  if (!/>2<\/span><span class="oc-lbl">still out/.test(h.replace(/\s+/g, ' '))) {
    const mm = h.match(/oc-big">(\d+)<\/span><span class="oc-lbl">still out/);
    if (!mm || mm[1] !== '2') bad('summary "still out" wrong: ' + (mm ? mm[1] : 'not found'));
    else console.log('  OK 2 still out');
  } else console.log('  OK 2 still out');
  if (!/oc-big done">1<\/span>/.test(h)) bad('finished count wrong'); else console.log('  OK 1 in');
  if (!/not scoring/.test(h)) bad('unlocatable group not surfaced'); else console.log('  OK "not scoring" surfaced');
  if (!/last group in ~/.test(h)) bad('no ETA line'); else console.log('  OK ETA line present');

  const holes = (h.match(/class="oc-hole/g) || []).length;
  if (holes !== 18) bad('track has ' + holes + ' cells, want 18'); else console.log('  OK 18 hole cells');
  const pins = (h.match(/class="oc-pin"/g) || []).length;
  // 2 located groups -> 1 pin each on the track, plus one pin per row in the table (4 rows)
  if (pins < 2) bad('no pins placed'); else console.log('  OK pins placed on the track');
  if (!/oc-b10/.test(h)) bad('back-nine starter not marked'); else console.log('  OK "from 10" marked');

  // the real invariant: no LIVE tag from a player name, and its angle brackets are escaped
  const plCells = (h.match(/<td class="oc-pl">[\s\S]*?<\/td>/g) || []).join('');
  if (/<img|<script|onerror=[^&]/.test(plCells)) bad('player name produced a LIVE tag: ' + plCells);
  else if (!/&lt;|&gt;/.test(plCells)) bad('angle brackets from the name were not escaped: ' + plCells);
  else console.log('  OK player name escaped (no live tag)');

  // "Last, First" must not lose the surname
  if (OC2.shortName('Andersson, Niklas') !== 'N Andersson') bad('shortName("Andersson, Niklas") = ' + OC2.shortName('Andersson, Niklas') + ', want "N Andersson"');
  else console.log('  OK "Andersson, Niklas" -> N Andersson');
  if (OC2.shortName('Pete Park') !== 'P Park') bad('shortName("Pete Park") = ' + OC2.shortName('Pete Park'));
  else console.log('  OK "Pete Park" -> P Park');
  if (OC2.shortName('Madonna') !== 'Madonna') bad('single-token name mangled');
  else console.log('  OK single-token name kept');

  OC2.render([]);
  if (!/No cards started/.test(els['onCourseBody'].innerHTML)) bad('no empty state');
  else console.log('  OK empty state');
}

// ---------- 10. the panel is wired into the page ----------
console.log('\n=== 10. wiring ===');
[['panel markup', /id="onCoursePanel"/],
 ['body container', /id="onCourseBody"/],
 ['follows the scoring event', /window\.OnCourse\.show\(eventId\)/],
 ['hides when no event', /window\.OnCourse\.show\(null\)/],
 ['stops polling off-tab', /else OnCourse\.stop\(\);/],
 ['track scrolls at 360px', /\.oc-track\{[^}]*overflow-x:auto/]].forEach(([label, re]) => {
  if (!re.test(html)) bad(label + ' MISSING'); else console.log('  OK ' + label);
});


// ---------- 11. the track must point at the group the headline quotes ----------
console.log('\n=== 11. track target == "last group in" group ===');
{
  const cards = [
    { id: 'x', group_id: 'gx', player_name: 'X X', status: 'in_progress', starting_nine: 'back'  },
    { id: 'y', group_id: 'gy', player_name: 'Y Y', status: 'in_progress', starting_nine: 'front' }];
  // gx: 7 holes at 12 m/hole (finishes EARLIER)   gy: 9 holes at 16 m/hole (finishes LATER)
  const g = OC.computeGroups(cards, [...play('x', BACK, 7, 12), ...play('y', FRONT, 9, 16)], T0 + 200 * 60000);
  const s = OC.summarise(g);
  const fewestHoles = g.slice().sort((a, b) => a.holesDone - b.holesDone)[0];
  const latestEta   = g.slice().sort((a, b) => b.etaMs - a.etaMs)[0];
  if (fewestHoles.groupId === latestEta.groupId) bad('test case is degenerate — pick different paces');
  else console.log('  OK fewest-holes (' + fewestHoles.groupId + ') differs from latest-ETA (' + latestEta.groupId + ')');
  if (s.lastInMs !== latestEta.etaMs) bad('summary quotes the wrong group');
  else console.log('  OK headline quotes the latest-ETA group');
  if (!/withEta\.slice\(\)\.sort\(\(a, b\) => b\.etaMs - a\.etaMs\)/.test(html))
    bad('track does not scroll to the latest-ETA group');
  else console.log('  OK track scrolls to that same group');
}

console.log(fails ? `\nFAILED: ${fails}` : '\nALL TESTS PASSED');
process.exit(fails ? 1 : 0);
