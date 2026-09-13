#!/usr/bin/env node
// Burapha 2026-09-13, two-phone test: Joe's phone sat on hole 2 while the group played hole 3.
// A device that owns NO cards is deliberately excluded from auto-advance (own nothing => never
// advance, Bangpra 2026-08-12), so it never moved — and the "Current" button never lit either,
// because latestHoleIndex only ever moved on this device's own advance. This covers the follower
// rule that replaces it, and that it still cannot run away to hole 18.
// Run: node tools/follow-group-hole.test.js
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const grab = (re, label) => { const m = src.match(re); if (!m) { console.error('FAIL: ' + label + ' not found'); process.exit(1); } return m[0]; };
const follow = grab(/ {4}_followGroupHole\(\) \{[\s\S]*?\n {4}\}/, '_followGroupHole');
const doneFor = grab(/ {4}_holeDoneForThisDevice\(hole\) \{[\s\S]*?\n {4}\}/, '_holeDoneForThisDevice');

let fails = 0; const bad = s => { console.log('  x ' + s); fails++; };
const ok = s => console.log('  OK ' + s);
const ORDER = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
const BACK9 = [10,11,12,13,14,15,16,17,18,1,2,3,4,5,6,7,8,9];

function make(opts) {
  const renders = [];
  const o = new Function('console', 'return ({ ' + follow.trim() + ',\n' + doneFor.trim() + ',\n' +
    'getPlayerScore(pid, h){ return (this.scoresCache[pid]||{})[h]; },\n' +
    '_ownsCard(pid){ return this._owned.includes(pid); },\n' +
    'renderHole(){ this._renders = (this._renders||0)+1; },\n' +
    'updateGoToCurrentButton(){ this._btn = this.currentHoleIndex < this.latestHoleIndex; },\n' +
    'saveRoundState(){ this._saved = (this._saved||0)+1; } })')({ log(){} });
  Object.assign(o, { holeOrder: ORDER, _owned: [], scoresCache: {}, currentHoleIndex: 0,
                     currentHole: 1, currentScore: '', latestHoleIndex: 0, _saving: false }, opts);
  return o;
}
const P = (...names) => names.map(n => ({ id: n, name: n }));

console.log('=== 1. the live case: follower is on hole 2, group finishes hole 3 ===');
{
  const o = make({ players: P('pete', 'joe', 'alan', 'tristan'), _owned: [],
                   currentHoleIndex: 1, currentHole: 2,
                   scoresCache: { pete: {1:4,2:4,3:4}, joe: {1:5,2:6,3:6}, alan: {1:5,2:5,3:4}, tristan: {1:5,2:5,3:4} } });
  const moved = o._followGroupHole();
  if (!moved) bad('did not move');
  else ok('moved');
  // everyone has hole 3, so the group is walking to 4
  if (o.currentHole !== 4) bad('landed on hole ' + o.currentHole + ', expected 4');
  else ok('landed on hole 4 (all four cards have hole 3)');
  if (!o._renders) bad('did not re-render'); else ok('re-rendered');
  if (o.latestHoleIndex !== 3) bad('latestHoleIndex not tracked: ' + o.latestHoleIndex);
  else ok('latestHoleIndex tracked, so the Current button can light');
}

console.log('\n=== 2. mid-hole: only some cards in, follower sits ON that hole ===');
{
  const o = make({ players: P('pete', 'joe'), currentHoleIndex: 0, currentHole: 1,
                   scoresCache: { pete: {1:4,2:5}, joe: {1:5} } });
  o._followGroupHole();
  if (o.currentHole !== 2) bad('expected to sit on hole 2, got ' + o.currentHole);
  else ok('sits on hole 2 while it is still being scored');
}

console.log('\n=== 3. it can NEVER march to 18 (the Bangpra failure) ===');
{
  const o = make({ players: P('pete', 'joe'), currentHoleIndex: 0, currentHole: 1, scoresCache: {} });
  if (o._followGroupHole()) bad('moved with no scores anywhere');
  else ok('no scores in the group -> does not move');
  if (o.currentHole !== 1) bad('drifted to ' + o.currentHole);
  else ok('still on hole 1');
  const o2 = make({ players: P('pete','joe'), currentHoleIndex: 0, currentHole: 1,
                    scoresCache: { pete: {1:4}, joe: {1:4} } });
  o2._followGroupHole();
  if (o2.currentHole > 2) bad('ran past the group to hole ' + o2.currentHole);
  else ok('never gets ahead of the group (hole ' + o2.currentHole + ')');
}

console.log('\n=== 4. a device that OWNS a card is untouched (owner rules still apply) ===');
{
  const o = make({ players: P('pete', 'joe'), _owned: ['joe'], currentHoleIndex: 0, currentHole: 1,
                   scoresCache: { pete: {1:4,2:4,3:4}, joe: {1:5} } });
  if (o._followGroupHole()) bad('follower rule hijacked a scoring device');
  else ok('a scoring device is left to the owner predicate');
  if (o.currentHole !== 1) bad('moved a scoring device to ' + o.currentHole);
  else ok('scoring device stays put');
  if (o._holeDoneForThisDevice(1) !== true) bad('owner predicate broke for hole 1');
  else ok('owner predicate intact (its own card has hole 1)');
  if (o._holeDoneForThisDevice(2) !== false) bad('owner predicate wrong for hole 2');
  else ok('owner predicate intact (its own card lacks hole 2)');
}

console.log('\n=== 5. never dragged backwards, and never mid-entry ===');
{
  const o = make({ players: P('pete','joe'), currentHoleIndex: 5, currentHole: 6,
                   scoresCache: { pete: {1:4,2:4}, joe: {1:4,2:4} } });
  o._followGroupHole();
  if (o.currentHole !== 6) bad('dragged backwards to ' + o.currentHole);
  else ok('a follower looking at a later hole is not dragged back');
  const typing = make({ players: P('pete','joe'), currentScore: '5', currentHoleIndex: 0, currentHole: 1,
                        scoresCache: { pete: {1:4,2:4,3:4}, joe: {1:4,2:4,3:4} } });
  if (typing._followGroupHole()) bad('moved while a score was half-typed');
  else ok('never moves mid-entry');
}

console.log('\n=== 6. back-nine start follows holeOrder, not hole number ===');
{
  const o = make({ holeOrder: BACK9, players: P('pete','joe'), currentHoleIndex: 0, currentHole: 10,
                   scoresCache: { pete: {10:4,11:4}, joe: {10:4,11:4} } });
  o._followGroupHole();
  if (o.currentHole !== 12) bad('expected hole 12 on a 10th-tee start, got ' + o.currentHole);
  else ok('10th-tee start advances 11 -> 12, not to hole 3');
}

console.log(fails ? '\n' + fails + ' CHECK(S) FAILED' : '\nFollower mode holds ✅');
process.exit(fails ? 1 : 0);
