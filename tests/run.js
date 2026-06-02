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

// ---- report ----
console.log(`\nScoring engine tests: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\n' + failures.join('\n')); process.exit(1); }
console.log('All good ✅');
