import { strokesReceived, stablefordPoints, countForHole, scoreWaltz, HoleInfo, PlayerRound } from './waltz';

let pass = 0, fail = 0;
function eq(label: string, got: any, want: any) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  ok ? pass++ : fail++;
}

// --- stroke allocation ---
eq('CH10 on SI1', strokesReceived(10, 1), 1);
eq('CH10 on SI11', strokesReceived(10, 11), 0);
eq('CH18 every hole', strokesReceived(18, 7), 1);
eq('CH24 on SI6 (2 strokes)', strokesReceived(24, 6), 2);
eq('CH24 on SI7 (1 stroke)', strokesReceived(24, 7), 1);
eq('scratch gets nothing', strokesReceived(0, 1), 0);
eq('+1 gives back on SI18', strokesReceived(-1, 18), -1);
eq('+1 gives nothing on SI17', strokesReceived(-1, 17), 0);
eq('+2 gives back on SI17', strokesReceived(-2, 17), -1);

// --- stableford ---
eq('net par', stablefordPoints(4, 4), 2);
eq('net birdie', stablefordPoints(3, 4), 3);
eq('net eagle', stablefordPoints(2, 4), 4);
eq('net bogey', stablefordPoints(5, 4), 1);
eq('net double = 0', stablefordPoints(6, 4), 0);
eq('blow-up capped at 0', stablefordPoints(9, 4), 0);
eq('null score = 0', stablefordPoints(null, 4), 0);

// --- waltz cycle ---
eq('cycle', [1,2,3,4,5,6,7].map(countForHole), [1,2,3,1,2,3,1]);

// --- worked 3-hole example ---
// Course: hole n has par 4 and SI n. Players A(CH10) B(CH18) C(CH24).
const holes: HoleInfo[] = [
  { hole: 1, par: 4, strokeIndex: 1 },  // count 1
  { hole: 2, par: 4, strokeIndex: 2 },  // count 2
  { hole: 3, par: 4, strokeIndex: 3 },  // count 3
];
const players: PlayerRound[] = [
  { playerId: 'A', courseHandicap: 10, gross: [5, 6, 4] },
  { playerId: 'B', courseHandicap: 18, gross: [6, 5, 7] },
  { playerId: 'C', courseHandicap: 24, gross: [7, 8, 6] },
];
// Hole1 SI1: A recv1 net4=2pts; B recv1 net5=1pt; C recv2 net5=1pt. count1 -> best=2
// Hole2 SI2: A recv1 net5=1; B recv1 net4=2; C recv2 net6=0. count2 -> 2+1=3
// Hole3 SI3: A recv1 net3=3; B recv1 net6=0; C recv2 net4=2. count3 -> 3+2+0=5
const r = scoreWaltz(holes, players);
eq('hole1 team pts', r.byHole[0].teamPoints, 2);
eq('hole1 contributor', r.byHole[0].contributing, ['A']);
eq('hole2 team pts', r.byHole[1].teamPoints, 3);
eq('hole3 team pts', r.byHole[2].teamPoints, 5);
eq('3-hole total', r.total, 10);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
