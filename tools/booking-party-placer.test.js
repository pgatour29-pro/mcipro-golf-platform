#!/usr/bin/env node
// v1348 BOOKING PARTY PLACER — Pete (Green Valley 2026-09-25): "I have been put in a group by the
// organizer with 3 other people, but I just added a guest under my registration and selected Perry to
// be in my group … it put Perry in an unassigned position. It needs to take out the player from the
// group already assigned and create a new group on its own without the organizer's permission."
// Extracts window.BookingPartyPlacer from public/index.html and runs it on the REAL Green Valley
// groups (as saved 2026-09-24 09:08 Bangkok) plus the edge cases.
// Run: node tools/booking-party-placer.test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const m = html.match(/window\.BookingPartyPlacer = \{[\s\S]*?\n\};\n/);
if (!m) { console.error('FAIL: window.BookingPartyPlacer not found'); process.exit(1); }
const window = {};
new Function('window', m[0])(window);
const P = window.BookingPartyPlacer;

let pass = 0, fail = 0;
const ok = (name, cond, detail) => { if (cond) pass++; else { fail++; console.error('  ✗ ' + name + (detail ? '\n      ' + detail : '')); } };
const eq = (name, a, b) => ok(name, JSON.stringify(a) === JSON.stringify(b), 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));

const PETE = 'U2b6d976f19bca4b2f4374ae0e10ed873', PERRY = 'Ue2e8d0624f400d568cc6fe2e6342780b';
const g = (tee, names) => ({ teeTime: tee, teeFixed: true, startNine: null, secondNine: null,
  players: names.map(n => ({ playerId: n[1], playerName: n[0], handicap: 18 })) });
const empty = () => ({ players: [], teeTime: '', teeFixed: false });
// the real sheet: 8 full/partial groups 10:00–10:40 at 5 min, a 2-ball at 10:40, three empty cubes
const GV = () => [
  g('10:00', [['Willy Gourdin', 'U8d79efa1'], ['Facey, Alex', 'U50ec4f18'], ['teramura', 'MANUAL-1790161656182-damk48c']]),
  g('10:05', [['Bennett, Gary', 'TRGG-GUEST-0084'], ['Stan Spours', 'MANUAL-1790240625422-2cutda6'], ['Jones, Steve', 'TRGG-GUEST-0476']]),
  g('10:10', [['Moore, Richard', 'Uc42d4d26'], ['Pete Park', PETE], ['Calin Young', 'U88958890'], ['Davies, Peter', 'TRGG-GUEST-1129']]),
  g('10:15', [['Fast, Klaus', 'TRGG-GUEST-0270'], ['Smith, Allan', 'U40d7b60e'], ['Stace, Richard', 'TRGG-GUEST-0949'], ['Pornpimon, Anny', 'U5ff65cc6']]),
  g('10:20', [['Don Hawkins', 'Uba9e4012'], ['Hulen, Ron', 'TRGG-GUEST-0416'], ['Robertson, Paul', 'U8874b596'], ['Rogers, Mark', 'TRGG-GUEST-0874']]),
  g('10:25', [['Hyun Tack, Oh', 'TRGG-GUEST-0433'], ['Carroll, Justin', 'Ub1f0b7bf'], ['Gordon, Tyson', 'TRGG-GUEST-0331'], ['Mod, Miss', 'TRGG-GUEST-1168']]),
  g('10:30', [['Welch, John', 'TRGG-GUEST-1053'], ['Bush, Kenny', 'TRGG-GUEST-0132'], ['Moses, Bennie', 'TRGG-GUEST-0713'], ['Bonner, Joe', 'U12fe981f']]),
  g('10:35', [['cooper jackson', 'MANUAL-1789375583567-3yaza5m'], ['Christian, Brad', 'TRGG-HCP-20260629170837-4'], ['Dogge, Gerard', 'U8a78be35'], ['Macnoe, Peter', 'TRGG-GUEST-1157']]),
  g('10:40', [['Mr Tim', 'MANUAL-1790201318051-8ti0078'], ['Reece, Voulton', 'TRGG-GUEST-0862']]),
  empty(), empty(), empty()
];
const reg = (name, pid, sr) => ({ id: 'r-' + pid, player_id: pid, player_name: name, handicap: 12.3, special_requests: sr || {} });
const REGS = () => [
  reg('Pete Park', PETE, {}),
  reg('See-Hoe, Perry', PERRY, { hostId: PETE, addedBy: PETE, sameGroup: true, lateReg: '2026-09-24T09:00:57.479Z' }),
  reg('Moore, Richard', 'Uc42d4d26', {}), reg('Calin Young', 'U88958890', {}), reg('Davies, Peter', 'TRGG-GUEST-1129', {})
];
const names = grp => (grp.players || []).map(p => p.playerName);

// ---- helpers ----
eq('interval: the sheet\'s commonest gap = 5', P.interval(P.norm(GV())), 5);
eq('nextTee: after the last seated group (10:40) = 10:45', P.nextTee(P.norm(GV()), '10:00'), '10:45');
eq('toMin/fmt round trip', P.fmt(P.toMin('10:45')), '10:45');

// ---- THE case: Pete seated in a full 4-ball, Perry added with same group ----
{
  const out = P.plan({ groups: GV(), groupSize: 4, startTime: '10:00', regs: REGS(), newIds: [PERRY], now: 'T' });
  ok('changed', out.changed === true);
  eq('one change: moved', out.changes.map(c => c.kind), ['moved']);
  eq('Pete left group 3 (10:10) — the other three stay', names(out.groups[2]), ['Moore, Richard', 'Calin Young', 'Davies, Peter']);
  eq('group 3 keeps its pinned time', [out.groups[2].teeTime, out.groups[2].teeFixed], ['10:10', true]);
  eq('new group = first empty cube (index 9)', out.changes[0].group, 9);
  eq('new group = Pete + Perry, Pete first', names(out.groups[9]), ['Pete Park', 'See-Hoe, Perry']);
  eq('new group pinned at the next tee 10:45', [out.groups[9].teeTime, out.groups[9].teeFixed], ['10:45', true]);
  eq('Perry carries the late stamp', out.groups[9].players[1].lateAt, 'T');
  eq('Perry keeps his registration handicap', out.groups[9].players[1].handicap, 12.3);
  eq('cube count unchanged (used an empty one)', out.groups.length, 12);
  ok('nobody duplicated', out.groups.reduce((n, x) => n + x.players.length, 0) === GV().reduce((n, x) => n + x.players.length, 0) + 1);
}

// ---- room in the host's group → the guest just joins ----
{
  const gs = GV(); gs[2].players.pop();   // Davies out → Pete's group is a 3-ball
  const out = P.plan({ groups: gs, groupSize: 4, startTime: '10:00', regs: REGS(), newIds: [PERRY], now: 'T' });
  eq('joined, not moved', out.changes.map(c => c.kind), ['joined']);
  eq('Perry is the 4th in Pete\'s group', names(out.groups[2]), ['Moore, Richard', 'Pete Park', 'Calin Young', 'See-Hoe, Perry']);
  eq('no new group', out.groups.filter(x => x.players.length).length, 9);
}

// ---- host still in the pool → untouched (v847: the unit rides in under the organizer's tap) ----
{
  const gs = GV(); gs[2].players = gs[2].players.filter(p => p.playerId !== PETE);
  const out = P.plan({ groups: gs, groupSize: 4, startTime: '10:00', regs: REGS(), newIds: [PERRY], now: 'T' });
  ok('unchanged when the host is unseated', out.changed === false && out.changes.length === 0);
}

// ---- guest already seated by the organizer → untouched ----
{
  const gs = GV(); gs[8].players.push({ playerId: PERRY, playerName: 'See-Hoe, Perry', handicap: 12.3 });
  const out = P.plan({ groups: gs, groupSize: 4, startTime: '10:00', regs: REGS(), newIds: [PERRY], now: 'T' });
  ok('unchanged when the guest is already seated', out.changed === false);
}

// ---- "any group" guest → untouched ----
{
  const rs = REGS(); rs[1].special_requests.sameGroup = false;
  const out = P.plan({ groups: GV(), groupSize: 4, startTime: '10:00', regs: rs, newIds: [PERRY], now: 'T' });
  ok('unchanged for a different-group guest', out.changed === false);
}

// ---- the host's party already beside him moves WITH him; a second guest joins the new group ----
{
  const gs = GV(); gs[2].players = [gs[2].players[0], gs[2].players[1], { playerId: 'G1', playerName: 'Guest One', handicap: 20 }, gs[2].players[3]];
  const rs = REGS().concat([reg('Guest One', 'G1', { hostId: PETE, sameGroup: true }), reg('Guest Two', 'G2', { hostId: PETE, sameGroup: true })]);
  const out = P.plan({ groups: gs, groupSize: 4, startTime: '10:00', regs: rs, newIds: [PERRY, 'G2'], now: 'T' });
  eq('kinds: moved then joined', out.changes.map(c => c.kind), ['moved', 'joined']);
  eq('old group keeps the two outsiders', names(out.groups[2]), ['Moore, Richard', 'Davies, Peter']);
  eq('new group = Pete + Guest One + Perry + Guest Two', names(out.groups[9]), ['Pete Park', 'Guest One', 'See-Hoe, Perry', 'Guest Two']);
}

// ---- no empty cube → a new group is appended; no pinned times → cascade from the event start ----
{
  const gs = [ { players: [{ playerId: PETE, playerName: 'Pete Park' }, { playerId: 'A', playerName: 'A' }, { playerId: 'B', playerName: 'B' }, { playerId: 'C', playerName: 'C' }], teeTime: '', teeFixed: false },
               { players: [{ playerId: 'D', playerName: 'D' }], teeTime: '', teeFixed: false } ];
  const out = P.plan({ groups: gs, groupSize: 4, startTime: '07:30', regs: REGS(), newIds: [PERRY], now: 'T' });
  eq('appended as group 3', out.changes[0].group, 2);
  eq('cascade: last seated = index 1 → 07:35, next 07:40', out.groups[2].teeTime, '07:40');
}

// ---- legacy array-of-arrays shape still works ----
{
  const gs = [ [{ id: PETE, name: 'Pete Park' }, { id: 'A', name: 'A' }, { id: 'B', name: 'B' }, { id: 'C', name: 'C' }] ];
  const out = P.plan({ groups: gs, groupSize: 4, startTime: '09:00', regs: REGS(), newIds: [PERRY], now: 'T' });
  eq('legacy shape: Pete moved out, new group appended', names(out.groups[1]), ['Pete Park', 'See-Hoe, Perry']);
  eq('legacy shape: names carried over', names(out.groups[0]), ['A', 'B', 'C']);
}

// ---- group size 3 (Waltz-style cap) ----
{
  const gs = [ g('08:00', [['Pete Park', PETE], ['A', 'A'], ['B', 'B']]), empty() ];
  const out = P.plan({ groups: gs, groupSize: 3, startTime: '08:00', regs: REGS(), newIds: [PERRY], now: 'T' });
  eq('cap 3: a 3-ball is full → moved', out.changes[0].kind, 'moved');
}

console.log(`BookingPartyPlacer: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
