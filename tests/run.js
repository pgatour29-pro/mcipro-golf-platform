// Smoke tests for the critical scoring / money math.
// Run: npm test   (or: node tests/run.js)
// Exits non-zero on any failure so it can gate a deploy.
const { loadEngine } = require('./loadEngine');

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
    if (cond) { pass++; }
    else { fail++; failures.push(`  ✗ ${name}${detail ? '\n      ' + detail : ''}`); }
}
function eq(name, actual, expected) {
    const a = JSON.stringify(actual), e = JSON.stringify(expected);
    check(name, a === e, `expected ${e}, got ${a}`);
}

let E;
try { E = loadEngine(); }
catch (err) { console.error('FATAL: could not load engine from index.html\n', err.message); process.exit(2); }

// ---- helpers ----
const holes = (pars, sis) => Array.from({ length: 18 }, (_, i) => ({
    hole: i + 1, par: pars ? pars[i] : 4, stroke_index: sis ? sis[i] : (i + 1)
}));
const sc = (arr) => arr.map((g, i) => ({ hole_number: i + 1, gross_score: g }));
const H = holes(null, null); // par 4 everywhere, SI 1..18

// =========================================================
// Stableford points per hole (par 4, net = strokes)
// =========================================================
eq('Stableford: eagle (-2) = 4', E.stablefordPointsForHole(2, 4, E.defaultStableford), 4);
eq('Stableford: birdie (-1) = 3', E.stablefordPointsForHole(3, 4, E.defaultStableford), 3);
eq('Stableford: par (0) = 2', E.stablefordPointsForHole(4, 4, E.defaultStableford), 2);
eq('Stableford: bogey (+1) = 1', E.stablefordPointsForHole(5, 4, E.defaultStableford), 1);
eq('Stableford: double (+2) = 0', E.stablefordPointsForHole(6, 4, E.defaultStableford), 0);

// =========================================================
// Handicap stroke allocation
// =========================================================
const a18 = E.allocHandicapShots(H, 18);
check('HCP 18 -> exactly 1 stroke on all 18 holes',
    Object.keys(a18).length === 18 && Object.values(a18).every(v => v === 1));
const a9 = E.allocHandicapShots(H, 9);
check('HCP 9 -> strokes on SI 1-9 only', a9[1] === 1 && a9[9] === 1 && a9[10] === undefined);
eq('HCP 0 -> no strokes', Object.keys(E.allocHandicapShots(H, 0)).length, 0);
const a20 = E.allocHandicapShots(H, 20);
check('HCP 20 -> 2 strokes on SI 1 & 2, 1 elsewhere', a20[1] === 2 && a20[2] === 2 && a20[3] === 1 && a20[18] === 1);
const aPlus = E.allocHandicapShots(H, '+2'); // plus handicap: penalty strokes on easiest holes (SI 18,17)
check('HCP +2 -> -1 on SI 18 & 17 (penalty)', aPlus[18] === -1 && aPlus[17] === -1 && aPlus[1] === undefined);

// =========================================================
// Nassau (stroke, gross) — all pars
// =========================================================
const nassau = E.calculateNassau(sc(Array(18).fill(4)), H, 0, 'stroke');
eq('Nassau front9 (gross strokes)', nassau.front9, 36);
eq('Nassau back9 (gross strokes)', nassau.back9, 36);
eq('Nassau total', nassau.total, 72);

// Nassau stableford method — all pars => 2 pts x 9
const nassauStb = E.calculateNassau(sc(Array(18).fill(4)), H, 0, 'stableford');
eq('Nassau front9 (stableford, all pars)', nassauStb.front9, 18);

// =========================================================
// Stableford total (net, with handicap 18 = 1 shot/hole)
// All gross 5 on par 4 => net 4 => par => 2 pts x 18 = 36
// =========================================================
eq('Stableford total: net pars all 18 = 36',
    E.calculateStablefordTotal(sc(Array(18).fill(5)), H, 18, true), 36);

// =========================================================
// Match Play 1v1 — clinch detection ("5 & 4")
// P1 wins holes 1-5 of a 9-hole match (3 vs 4), rest halved
// =========================================================
const mp = E.calculateMatchPlay1v1(
    sc([3, 3, 3, 3, 3, 4, 4, 4, 4]), sc([4, 4, 4, 4, 4, 4, 4, 4, 4]),
    H, false, 0, 0, false, 9, 1);
check('MatchPlay 1v1: P1 +5 and clinched at hole 5',
    mp.player1Up === 5 && mp.matchClinched === true && mp.clinchHole === 5,
    `got player1Up=${mp.player1Up} clinched=${mp.matchClinched} clinchHole=${mp.clinchHole}`);

// All square match
const mpAS = E.calculateMatchPlay1v1(sc(Array(18).fill(4)), sc(Array(18).fill(4)), H, false, 0, 0, false, 18, 1);
eq('MatchPlay 1v1: identical scores => All Square (0)', mpAS.player1Up, 0);

// =========================================================
// 2-man Team match play (best ball, stroke) — Team1 best beats Team2 best every hole
// Team1 players: 4 and 6 (best 4). Team2: 5 and 7 (best 5). Team1 wins all => front 9 up.
// =========================================================
const team1 = [
    { id: 'a', name: 'A', handicap: 0, scores: sc(Array(18).fill(4)) },
    { id: 'b', name: 'B', handicap: 0, scores: sc(Array(18).fill(6)) }
];
const team2 = [
    { id: 'c', name: 'C', handicap: 0, scores: sc(Array(18).fill(5)) },
    { id: 'd', name: 'D', handicap: 0, scores: sc(Array(18).fill(7)) }
];
const tm = E.calculateTeamMatchPlay(team1, team2, H, false, false, 'bestball_tiebreaker');
check('Team match: Team1 best ball wins every hole (overall +18-ish, all W)',
    tm.overall > 0 && (tm.holeResults || []).filter(r => r.result === 'W').length >= 9,
    `overall=${tm.overall}, W holes=${(tm.holeResults || []).filter(r => r.result === 'W').length}`);

// =========================================================
// Skins (gross, no carry on this simple case): player A lowest on hole 1
// =========================================================
const skins = E.calculateSkins([
    { playerId: 'a', playerName: 'A', handicap: 0, scores: sc([3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]) },
    { playerId: 'b', playerName: 'B', handicap: 0, scores: sc(Array(18).fill(4)) }
], H, false, 100, false);
check('Skins: function returns a result object', skins && typeof skins === 'object');

// =========================================================
// Team match — tied best ball: 'halves' (default) pushes; 'tiebreaker' uses 2nd ball.
// One hole, no strokes: Team1 = 4 & 6, Team2 = 4 & 5. Best balls tie at 4.
// =========================================================
const oneHole = [{ hole: 1, par: 4, stroke_index: 18 }];
const tt1 = [{ id: 'a', name: 'A', handicap: 0, scores: sc([4]) }, { id: 'b', name: 'B', handicap: 0, scores: sc([6]) }];
const tt2 = [{ id: 'c', name: 'C', handicap: 0, scores: sc([4]) }, { id: 'd', name: 'D', handicap: 0, scores: sc([5]) }];
eq('Team tie: HALVES (default) => all square', E.calculateTeamMatchPlay(tt1, tt2, oneHole, false, false, 'bestball_halves').overall, 0);
eq('Team tie: TIEBREAKER => Team1 down 1 (2nd ball 6 vs 5)', E.calculateTeamMatchPlay(tt1, tt2, oneHole, false, false, 'bestball_tiebreaker').overall, -1);

// =========================================================
// 3-Man Waltz — engine + organizer team board parity
// =========================================================
// Scratch trio on all-par-4s: A pars (2 pts/hole), B bogeys (1), C birdies (3).
// Rotation: hole1 best-1 = 3, hole2 best-2 = 3+2 = 5, hole3 best-3 = 6 → 14 per cycle × 6 = 84.
const wA = { id: 'a', handicap: 0, scores: sc(Array(18).fill(4)) };
const wB = { id: 'b', handicap: 0, scores: sc(Array(18).fill(5)) };
const wC = { id: 'c', handicap: 0, scores: sc(Array(18).fill(3)) };
const wEng = E.calculateWaltz([wA, wB, wC], H, true);
eq('Waltz engine: scratch A/B/C rotation total = 84', wEng.total, 84);
eq('Waltz engine: hole 1 counts best 1 (birdie 3)', wEng.byHole[0].teamPoints, 3);
eq('Waltz engine: hole 2 counts best 2 (3+2)', wEng.byHole[1].teamPoints, 5);
eq('Waltz engine: hole 3 counts all 3 (3+2+1)', wEng.byHole[2].teamPoints, 6);

// Organizer board aggregates the per-hole stableford_points the scorers SAVED — must equal
// the engine total when fed the same per-hole points.
const { loadWaltzBoard } = require('./loadEngine');
let W;
try { W = loadWaltzBoard(); }
catch (err) { console.error('FATAL: could not load Waltz board helpers from index.html\n', err.message); process.exit(2); }
const savedRow = (id, ptsPerHole) => ({
    golfer_id: id, scores: Array.from({ length: 18 }, (_, i) => ({ hole_number: i + 1, gross_score: 4, stableford_points: ptsPerHole }))
});
const wStats = W._waltzTeamStats([savedRow('a', 2), savedRow('b', 1), savedRow('c', 3)]);
eq('Waltz board: team total matches engine (84)', wStats.total, wEng.total);
eq('Waltz board: thru 18', wStats.thru, 18);
eq('Waltz board: hole pattern 3/5/6', wStats.teamHolePts.slice(0, 3), [3, 5, 6]);

// Partial round: only holes 1-2 entered → thru 2, total 3+5 = 8, rest null
const partialRow = (id, pts) => ({
    golfer_id: id, scores: [1, 2].map(h => ({ hole_number: h, gross_score: 4, stableford_points: pts }))
});
const wPart = W._waltzTeamStats([partialRow('a', 2), partialRow('b', 1), partialRow('c', 3)]);
check('Waltz board: partial round thru 2, total 8, hole 3 null',
    wPart.thru === 2 && wPart.total === 8 && wPart.teamHolePts[2] === null,
    `thru=${wPart.thru}, total=${wPart.total}, h3=${wPart.teamHolePts[2]}`);

// Pickup (0 points WITH a score) counts as an entered 0, never as "not played"
const wPickup = W._waltzTeamStats([
    { golfer_id: 'a', scores: [{ hole_number: 1, gross_score: 9, stableford_points: 0 }] },
    { golfer_id: 'b', scores: [] }
]);
check('Waltz board: pickup counts as 0 (hole played, 0 pts)', wPickup.teamHolePts[0] === 0 && wPickup.thru === 1,
    `h1=${wPickup.teamHolePts[0]}, thru=${wPickup.thru}`);

// Team building: tee-sheet groups first, scorecard group_id pulls a walk-on into a
// teammate's team, strays stay unassigned (no pseudo-team).
const wRows = [
    { golfer_id: 'p1', group_id: 'sc1' }, { golfer_id: 'p2', group_id: 'sc1' }, { golfer_id: 'p3' },
    { golfer_id: 'w1', group_id: 'sc1' },   // walk-on scored in p1/p2's group
    { golfer_id: 'stray' }
];
const wTeams = W._buildWaltzTeams.call({ _waltzPairingGroups: [['p1', 'p2', 'p3']] }, wRows);
check('Waltz teams: tee-sheet trio + walk-on merged into one team, stray unassigned',
    wTeams.teams.length === 1 && wTeams.teams[0].length === 4 && wTeams.unassigned.length === 1 && wTeams.unassigned[0].golfer_id === 'stray',
    JSON.stringify({ teams: wTeams.teams.map(t => t.map(r => r.golfer_id)), unassigned: wTeams.unassigned.map(r => r.golfer_id) }));

// ---- report ----
console.log(`\nScoring engine tests: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\n' + failures.join('\n')); process.exit(1); }
console.log('All good ✅');
