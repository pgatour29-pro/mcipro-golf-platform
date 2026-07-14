// waltz.ts — 3-man Waltz (1-2-3) Stableford scoring engine
// Pure functions, no side effects. Safe to drop into the monolith or a Supabase Edge Function.

export interface HoleInfo {
  hole: number;        // 1..18
  par: number;
  strokeIndex: number; // 1..18 (SI 1 = hardest)
}

export interface PlayerRound {
  playerId: string;
  courseHandicap: number;   // already allowance-adjusted (e.g. 90%). May be negative (plus handicap).
  gross: (number | null)[]; // 18 entries; null = no score / picked up (scores 0 pts)
}

// --- Handicap stroke allocation ---------------------------------------------
// Strokes a player receives on ONE hole given their course handicap and the hole's SI.
export function strokesReceived(courseHandicap: number, strokeIndex: number): number {
  const ch = Math.round(courseHandicap);
  if (ch >= 0) {
    const base = Math.floor(ch / 18);
    const remainder = ch % 18;
    return base + (strokeIndex <= remainder ? 1 : 0);
  }
  // Plus handicap: strokes are given BACK starting from the easiest hole (SI 18, 17, ...)
  const give = Math.abs(ch);
  const base = Math.floor(give / 18);
  const remainder = give % 18;
  return -(base + (strokeIndex > 18 - remainder ? 1 : 0));
}

// --- Stableford points ------------------------------------------------------
// Net par = 2, birdie = 3, eagle = 4, albatross = 5; bogey = 1; net double+ = 0.
export function stablefordPoints(net: number | null, par: number): number {
  if (net == null) return 0;
  return Math.max(0, 2 - (net - par));
}

// --- Waltz count ------------------------------------------------------------
// Hole 1,4,7,10,13,16 -> 1 ; Hole 2,5,8,11,14,17 -> 2 ; Hole 3,6,9,12,15,18 -> 3
export function countForHole(hole: number): 1 | 2 | 3 {
  return (((hole - 1) % 3) + 1) as 1 | 2 | 3;
}

// --- Score a full round -----------------------------------------------------
export function scoreWaltz(holes: HoleInfo[], players: PlayerRound[]) {
  const byHole = holes.map((h, i) => {
    const perPlayer = players.map((p) => {
      const gross = p.gross[i];
      const recv = strokesReceived(p.courseHandicap, h.strokeIndex);
      const net = gross == null ? null : gross - recv;
      const points = stablefordPoints(net, h.par);
      return { playerId: p.playerId, gross, strokesReceived: recv, net, points };
    });
    const count = countForHole(h.hole);
    const ranked = [...perPlayer].sort((a, b) => b.points - a.points);
    const contributing = ranked.slice(0, count);
    const teamPoints = contributing.reduce((s, x) => s + x.points, 0);
    return {
      hole: h.hole,
      count,
      perPlayer,
      contributing: contributing.map((c) => c.playerId),
      teamPoints,
    };
  });
  const total = byHole.reduce((s, h) => s + h.teamPoints, 0);
  return { byHole, total };
}
