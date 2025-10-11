/* golfScoring.ts
   A compact, production-ready scoring engine for golf events.

   Capabilities:
   - Scoring formats: Strokeplay, Stableford (custom points), Matchplay
   - Team modes: Alternate Shot, Scramble, Greensomes, Pinehurst/Chapman, Better Ball (scores-to-count)
   - Run multiple formats simultaneously
   - Skins: per-hole winner detection with optional carry-over
   - Special contests: timed-entry or measured-entry with dedicated leaderboards
*/

///////////////////////////
// Domain Models & Types //
///////////////////////////

export type ID = string;

export type ScoringFormat = "strokeplay" | "stableford" | "custom_stableford" | "matchplay";
export type TeamMode =
  | "individual"
  | "alternate_shot"
  | "scramble"
  | "greensomes"
  | "pinehurst"
  | "better_ball";

export interface CourseHole {
  hole: number;        // 1..18
  par: number;         // 3/4/5 usually
  si?: number;         // stroke index (1..18), optional
  yards?: number;
}

export interface Course {
  name: string;
  holes: CourseHole[]; // ordered by hole number
}

export interface Player {
  id: ID;
  name: string;
  // optional handicap index or course handicap
  handicap?: number; // course handicap number (strokes for 18 holes)
  teamId?: ID;       // if assigned to a team
}

export interface Team {
  id: ID;
  name: string;
  playerIds: ID[];
}

export interface HoleScore {
  hole: number;       // 1..18
  strokes: number;    // gross strokes
  // Optional per-hole net adjustments if you already applied shots
  netStrokes?: number;
  // Optional secondary data
  putts?: number;
  penalties?: number;
  // For contests (e.g., measured entry like distance)
  measurements?: Record<string, number>;
}

export interface Round {
  playerId: ID;
  scores: HoleScore[]; // length equals course.holes.length ideally
  // Timestamp of each hole (optional; useful for “timed entry” contests)
  holeTimestamps?: Record<number, number>; // hole -> epoch ms
}

export type PointsMap = {
  doubleBogeyOrWorse: number;
  bogey: number;
  par: number;
  birdie: number;
  eagle: number;
  albatross: number;
  condor: number;
};

export interface StablefordConfig {
  // default “traditional” stableford
  points?: PointsMap;
  // If true, use net (with handicap shots allocated by stroke index)
  useNet?: boolean;
}

export interface BetterBallConfig {
  // how many best scores count per hole (e.g., 1 for “best ball of 2”)
  scoresToCount: number; // 1..team size
  useNet?: boolean;
}

export interface MatchPairing {
  id: ID;
  sideA: ID[]; // playerIds or teamIds depending on teamMode
  sideB: ID[];
  // Optional: if you want net matchplay
  useNet?: boolean;
}

export interface SkinsConfig {
  enabled: boolean;
  useNet?: boolean;            // net or gross
  metric?: "strokes" | "points"; // strokes (lower is better) or points (higher is better)
  carryOver?: boolean;         // if tie on a hole, pot carries over
  participants?: ID[];         // default: everyone with a round
}

export type ContestType = "timed" | "measured";
export type MeasuredAgg = "min" | "max"; // closest-to-pin (min), longest drive (max)

export interface SpecialContest {
  id: ID;
  hole: number;
  name: string;
  type: ContestType;
  // Timed: last entry wins. Measured: best value wins by agg
  measuredAgg?: MeasuredAgg;
  // If measured, the key in HoleScore.measurements to read (e.g., "ctp_distance_m")
  measurementKey?: string;
}

export interface EventConfig {
  scoringFormats: ScoringFormat[];  // can contain several simultaneously
  teamMode: TeamMode;               // how per-hole team score is produced
  stableford?: StablefordConfig;    // applies when using stableford/custom_stableford
  betterBall?: BetterBallConfig;    // for teamMode = better_ball
  matchPairings?: MatchPairing[];   // required for matchplay
  skins?: SkinsConfig;              // optional skins overlay
  specialContests?: SpecialContest[];
  // By default, better-ball also shows individual leaderboard
  betterBallHasIndividualBoard?: boolean;
}

export interface EventData {
  course: Course;
  players: Player[];
  teams?: Team[];
  rounds: Round[]; // one per player (or partial—engine is tolerant)
}

export interface LeaderboardRow {
  id: ID;          // playerId or teamId
  label: string;   // player or team name
  value: number;   // lower is better for strokes, higher for points; matchplay shows margin
  details?: Record<string, any>;
}

export interface Leaderboards {
  strokeplay?: LeaderboardRow[];
  stableford?: LeaderboardRow[];
  custom_stableford?: LeaderboardRow[];
  matchplay?: LeaderboardRow[]; // per pairing outcome rows
  // Optional companion boards
  individual?: LeaderboardRow[];
  team?: LeaderboardRow[];
}

export interface SkinsResult {
  potByHole: Record<number, number>; // if you choose to assign monetary values, you can map externally
  skinsWon: Array<{
    holes: number[]; // holes combined if carry-over
    winnerIds: ID[]; // owners of unique best metric
    metricValue: number; // winning metric for the group
  }>;
}

export interface ContestStanding {
  contestId: ID;
  name: string;
  hole: number;
  winnerId?: ID;
  winnerLabel?: string;
  winningValue?: number;
  lastEntryAt?: number; // for timed
}

export interface ComputeResult {
  leaderboards: Leaderboards;
  skins?: SkinsResult;
  contests?: ContestStanding[];
}

//////////////////////
// Utility Helpers  //
//////////////////////

const defaultStableford: PointsMap = {
  doubleBogeyOrWorse: 0,
  bogey: 1,
  par: 2,
  birdie: 3,
  eagle: 4,
  albatross: 5,
  condor: 6,
};

function byId<T extends { id: ID }>(arr: T[], id: ID): T | undefined {
  return arr.find((x) => x.id === id);
}

function holeLookup(course: Course): Record<number, CourseHole> {
  const map: Record<number, CourseHole> = {};
  course.holes.forEach((h) => (map[h.hole] = h));
  return map;
}

function allocHandicapShots(
  course: Course,
  handicap: number = 0
): Record<number, number> {
  // Distribute handicap shots across holes by stroke index SI.
  // If SI unavailable, spread evenly by hole order.
  const shots: Record<number, number> = {};
  if (!handicap || handicap <= 0) return shots;

  const holesSorted =
    course.holes.every((h) => typeof h.si === "number")
      ? [...course.holes].sort((a, b) => (a.si! - b.si!))
      : [...course.holes].sort((a, b) => a.hole - b.hole);

  let remaining = handicap;
  while (remaining > 0) {
    for (const h of holesSorted) {
      if (remaining <= 0) break;
      shots[h.hole] = (shots[h.hole] || 0) + 1;
      remaining--;
    }
  }
  return shots;
}

function netStrokesForHole(
  gross: number,
  bonusShots: number
): number {
  return Math.max(1, gross - bonusShots);
}

function stablefordPointsForHole(
  strokes: number,
  par: number,
  pointsMap: PointsMap
): number {
  const diff = strokes - par;
  if (diff <= -4) return pointsMap.condor ?? 6;
  if (diff === -3) return pointsMap.albatross ?? 5;
  if (diff === -2) return pointsMap.eagle ?? 4;
  if (diff === -1) return pointsMap.birdie ?? 3;
  if (diff === 0) return pointsMap.par ?? 2;
  if (diff === 1) return pointsMap.bogey ?? 1;
  return pointsMap.doubleBogeyOrWorse ?? 0;
}

/////////////////////////////
// Team Mode Hole Scorers  //
/////////////////////////////

type PlayerHoleResolver = (playerId: ID, hole: number) => number | undefined;

function bestNOfK(
  playerIds: ID[],
  hole: number,
  resolver: PlayerHoleResolver,
  n: number
): number | undefined {
  const vals = playerIds
    .map((pid) => resolver(pid, hole))
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);
  if (vals.length < n) return undefined;
  return vals.slice(0, n).reduce((a, b) => a + b, 0);
}

const TeamHoleScore = {
  individual: (playerId: ID, hole: number, r: PlayerHoleResolver) =>
    r(playerId, hole),

  alternate_shot: (teamPlayerIds: ID[], hole: number, r: PlayerHoleResolver) => {
    // Alternate shot: the team posts a single ball score.
    // Assume you provide the team’s ball score via the first player’s record.
    // (If you track per-team ball, store it on any one player consistently.)
    // This is a modeling choice; adjust if you store team-ball elsewhere.
    return r(teamPlayerIds[0], hole);
  },

  scramble: (teamPlayerIds: ID[], hole: number, r: PlayerHoleResolver) => {
    // Scramble: team plays best ball position; lowest strokes among players.
    const vals = teamPlayerIds
      .map((pid) => r(pid, hole))
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return undefined;
    return Math.min(...vals);
  },

  greensomes: (teamPlayerIds: ID[], hole: number, r: PlayerHoleResolver) => {
    // Greensomes: both tee off, choose best drive, then alternate shots.
    // Approximation: take min of players’ scores as the team’s hole score.
    const vals = teamPlayerIds
      .map((pid) => r(pid, hole))
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return undefined;
    return Math.min(...vals);
  },

  pinehurst: (teamPlayerIds: ID[], hole: number, r: PlayerHoleResolver) => {
    // Pinehurst/Chapman: each tees off, play partner’s ball, pick one, alternate in.
    // Approximation similar to greensomes for scoring outcome.
    const vals = teamPlayerIds
      .map((pid) => r(pid, hole))
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return undefined;
    return Math.min(...vals);
  },

  better_ball: (
    teamPlayerIds: ID[],
    hole: number,
    r: PlayerHoleResolver,
    scoresToCount: number
  ) => bestNOfK(teamPlayerIds, hole, r, scoresToCount),
};

////////////////////////////////////
// Core Aggregation & Leaderboards //
////////////////////////////////////

export function computeEventResults(
  data: EventData,
  config: EventConfig
): ComputeResult {
  const { course, players, teams = [], rounds } = data;
  const holes = holeLookup(course);

  // Make quick lookup maps
  const roundByPlayer: Record<ID, Round> = {};
  rounds.forEach((rd) => (roundByPlayer[rd.playerId] = rd));

  const playerById: Record<ID, Player> = {};
  players.forEach((p) => (playerById[p.id] = p));

  const teamById: Record<ID, Team> = {};
  teams.forEach((t) => (teamById[t.id] = t));

  // Build resolver for gross and net
  const grossResolver: PlayerHoleResolver = (pid, h) => {
    const rd = roundByPlayer[pid];
    const s = rd?.scores.find((x) => x.hole === h);
    return s?.strokes;
  };

  const netResolverFactory = (useNet: boolean) => {
    // Cache shots by player
    const shotsCache: Record<ID, Record<number, number>> = {};
    return (pid: ID, h: number): number | undefined => {
      const rd = roundByPlayer[pid];
      const s = rd?.scores.find((x) => x.hole === h);
      if (!s) return undefined;
      if (!useNet) return s.strokes;
      // If netStrokes already provided, prefer it
      if (typeof s.netStrokes === "number") return s.netStrokes;
      // Otherwise, allocate per-hole shots from handicap
      if (!shotsCache[pid]) {
        shotsCache[pid] = allocHandicapShots(course, playerById[pid]?.handicap);
      }
      const bonus = shotsCache[pid][h] || 0;
      return netStrokesForHole(s.strokes, bonus);
    };
  };

  // Helper: per-player totals
  function totalStrokes(pid: ID, useNet: boolean): number | undefined {
    const r = netResolverFactory(useNet);
    let sum = 0;
    for (const h of course.holes) {
      const v = r(pid, h.hole);
      if (typeof v !== "number") return undefined;
      sum += v;
    }
    return sum;
  }

  function totalStableford(pid: ID, useNet: boolean, points?: PointsMap): number | undefined {
    const r = netResolverFactory(useNet);
    const pts = points || defaultStableford;
    let sum = 0;
    for (const h of course.holes) {
      const v = r(pid, h.hole);
      if (typeof v !== "number") return undefined;
      sum += stablefordPointsForHole(v, holes[h.hole].par, pts);
    }
    return sum;
  }

  // Team per-hole scorer dispatcher
  function teamHole(
    mode: TeamMode,
    teamIdOrPlayerId: ID,
    hole: number
  ): number | undefined {
    if (mode === "individual") {
      const resolver = netResolverFactory(false);
      return TeamHoleScore.individual(teamIdOrPlayerId, hole, resolver);
    }
    const team = teamById[teamIdOrPlayerId];
    if (!team) return undefined;

    const useNetForBB = config.betterBall?.useNet ?? false;
    const resolver = netResolverFactory(mode === "better_ball" ? useNetForBB : false);

    switch (mode) {
      case "alternate_shot":
        return TeamHoleScore.alternate_shot(team.playerIds, hole, resolver);
      case "scramble":
        return TeamHoleScore.scramble(team.playerIds, hole, resolver);
      case "greensomes":
        return TeamHoleScore.greensomes(team.playerIds, hole, resolver);
      case "pinehurst":
        return TeamHoleScore.pinehurst(team.playerIds, hole, resolver);
      case "better_ball":
        return TeamHoleScore.better_ball(
          team.playerIds,
          hole,
          resolver,
          Math.max(1, config.betterBall?.scoresToCount ?? 1)
        );
      default:
        return undefined;
    }
  }

  //////////////////////////////
  // Build Leaderboards       //
  //////////////////////////////

  const leaderboards: Leaderboards = {};

  const includeIndividual =
    config.teamMode === "individual" ||
    (config.teamMode === "better_ball" && (config.betterBallHasIndividualBoard ?? true));

  // Individual boards (strokeplay & stableford variants)
  if (includeIndividual) {
    if (config.scoringFormats.includes("strokeplay")) {
      const rows: LeaderboardRow[] = players
        .map((p) => {
          const value = totalStrokes(p.id, /*useNet*/ false);
          return typeof value === "number"
            ? { id: p.id, label: p.name, value }
            : undefined;
        })
        .filter((x): x is LeaderboardRow => !!x)
        .sort((a, b) => a.value - b.value);
      leaderboards.strokeplay = rows;
      leaderboards.individual = rows;
    }

    const stableCfg = config.stableford || {};
    const ptsMap = stableCfg.points || defaultStableford;
    const useNet = stableCfg.useNet ?? false;

    if (config.scoringFormats.some((f) => f === "stableford" || f === "custom_stableford")) {
      const rows: LeaderboardRow[] = players
        .map((p) => {
          const value = totalStableford(p.id, useNet, ptsMap);
          return typeof value === "number"
            ? { id: p.id, label: p.name, value }
            : undefined;
        })
        .filter((x): x is LeaderboardRow => !!x)
        .sort((a, b) => b.value - a.value); // higher points wins
      if (config.scoringFormats.includes("stableford")) {
        leaderboards.stableford = rows;
      }
      if (config.scoringFormats.includes("custom_stableford")) {
        leaderboards.custom_stableford = rows;
      }
    }
  }

  // Team leaderboard (for team modes)
  if (config.teamMode !== "individual") {
    const teamRows: LeaderboardRow[] = teams.map((t) => {
      let sum = 0;
      for (const h of course.holes) {
        const v = teamHole(config.teamMode, t.id, h.hole);
        if (typeof v !== "number") return undefined;
        sum += v;
      }
      return { id: t.id, label: t.name, value: sum };
    }).filter((x): x is LeaderboardRow => !!x)
      .sort((a, b) => a.value - b.value);
    leaderboards.team = teamRows;

    if (config.scoringFormats.includes("strokeplay")) {
      leaderboards.strokeplay = teamRows;
    }
  }

  // Matchplay results (requires pairings)
  if (config.scoringFormats.includes("matchplay") && config.matchPairings?.length) {
    const rows: LeaderboardRow[] = [];
    for (const m of config.matchPairings) {
      let holesA = 0, holesB = 0;

      for (const h of course.holes) {
        const holeNo = h.hole;
        const aScore = sideScore(holeNo, m.sideA);
        const bScore = sideScore(holeNo, m.sideB);
        if (aScore == null || bScore == null) continue;
        if (aScore < bScore) holesA++;
        else if (bScore < aScore) holesB++;
      }

      const label = `${labelSide(m.sideA)} vs ${labelSide(m.sideB)}`;
      rows.push({
        id: m.id,
        label,
        value: holesA - holesB, // positive: A up; negative: B up
        details: { holesA, holesB },
      });

      function sideScore(hole: number, side: ID[]): number | undefined {
        // side can be players or a single team depending on teamMode
        if (config.teamMode === "individual") {
          // matchplay between individuals or pairs of individuals: best single ball
          const r = netResolverFactory(m.useNet ?? false);
          return bestNOfK(side, hole, r, 1);
        } else {
          // team vs team: compare team hole outcomes
          // Expect side as [teamId]
          const teamId = side[0];
          return teamHole(config.teamMode, teamId, hole);
        }
      }
      function labelSide(side: ID[]): string {
        if (config.teamMode === "individual") {
          return side.map((id) => playerById[id]?.name ?? id).join(" & ");
        }
        const teamId = side[0];
        return teamById[teamId]?.name ?? teamId;
        }
    }
    leaderboards.matchplay = rows;
  }

  //////////////////////////////////////
  // Skins (optional overlay)         //
  //////////////////////////////////////

  let skinsResult: SkinsResult | undefined;
  if (config.skins?.enabled) {
    skinsResult = computeSkins(data, config);
  }

  //////////////////////////////////////
  // Special Contests                 //
  //////////////////////////////////////

  let contestResults: ContestStanding[] | undefined;
  if (config.specialContests?.length) {
    contestResults = computeContests(data, config.specialContests);
  }

  return { leaderboards, skins: skinsResult, contests: contestResults };
}

/////////////////////
// Skins Engine    //
/////////////////////

function computeSkins(data: EventData, config: EventConfig): SkinsResult {
  const { course, players, rounds } = data;
  const sc = config.skins!;
  const participants = sc.participants?.length
    ? sc.participants
    : players.map((p) => p.id);

  const netResolver = (pid: ID, h: number) =>
    sc.useNet ? resolveNet(data, pid, h) : resolveGross(data, pid, h);

  // Metric selector
  const better = sc.metric === "points" ? higherBetter : lowerBetter;
  const valueOf = (pid: ID, hole: number) => {
    if (sc.metric === "points") {
      // If using points for skins, compute stableford with default map (gross or net)
      const strokes = resolveWithNetFlag(data, pid, hole, sc.useNet);
      if (strokes == null) return undefined;
      const par = data.course.holes.find((h) => h.hole === hole)?.par || 4;
      return stablefordPointsForHole(strokes, par, defaultStableford);
    }
    return netResolver(pid, hole);
  };

  const holes = course.holes.map((h) => h.hole);
  const pots: Record<number, number> = {};
  const wins: SkinsResult["skinsWon"] = [];
  let carry: number[] = []; // holes carrying

  for (const h of holes) {
    const values: Array<{ pid: ID; v: number }> = [];
    for (const pid of participants) {
      const v = valueOf(pid, h);
      if (typeof v === "number") values.push({ pid, v });
    }
    if (!values.length) continue;

    // compute unique best
    const best = values.sort((a, b) => better(a.v, b.v)).[0]?.v;
    const winners = values.filter((x) => x.v === best).map((x) => x.pid);

    if (winners.length === 1) {
      const holesWon = [...carry, h];
      wins.push({ holes: holesWon, winnerIds: winners, metricValue: best! });
      // reset carry
      carry = [];
      pots[h] = 1; // symbolic 1 “unit” per hole; scale externally if needed
    } else {
      if (sc.carryOver) {
        carry.push(h);
      }
      // else: no skin this hole, pot does not carry
    }
  }

  return { potByHole: pots, skinsWon: wins };

  // helpers
  function resolveGross(d: EventData, pid: ID, hole: number) {
    const rd = d.rounds.find((r) => r.playerId === pid);
    return rd?.scores.find((s) => s.hole === hole)?.strokes;
  }
  function resolveNet(d: EventData, pid: ID, hole: number) {
    const rd = d.rounds.find((r) => r.playerId === pid);
    const s = rd?.scores.find((x) => x.hole === hole);
    if (!s) return undefined;
    if (typeof s.netStrokes === "number") return s.netStrokes;
    const shots = allocHandicapShots(d.course, d.players.find((p) => p.id === pid)?.handicap);
    const bonus = shots[hole] || 0;
    return netStrokesForHole(s.strokes, bonus);
  }
  function resolveWithNetFlag(d: EventData, pid: ID, hole: number, useNet?: boolean) {
    return useNet ? resolveNet(d, pid, hole) : resolveGross(d, pid, hole);
  }
  function lowerBetter(a: number, b: number) { return a - b; }
  function higherBetter(a: number, b: number) { return b - a; }
}

/////////////////////////////
// Special Contests Logic  //
/////////////////////////////

function computeContests(
  data: EventData,
  contests: SpecialContest[]
): ContestStanding[] {
  const { players, rounds } = data;
  const playerMap = new Map(players.map(p => [p.id, p.name]));
  const roundByPlayer = new Map(rounds.map(r => [r.playerId, r]));

  const results: ContestStanding[] = [];

  for (const c of contests) {
    if (c.type === "timed") {
      // last valid entry on that hole wins
      let bestPid: ID | undefined;
      let latest: number = -1;
      for (const [pid, rd] of roundByPlayer.entries()) {
        const ts = rd.holeTimestamps?.[c.hole];
        if (typeof ts === "number" && ts > latest) {
          latest = ts;
          bestPid = pid;
        }
      }
      results.push({
        contestId: c.id,
        name: c.name,
        hole: c.hole,
        winnerId: bestPid,
        winnerLabel: bestPid ? playerMap.get(bestPid) : undefined,
        lastEntryAt: latest > 0 ? latest : undefined,
      });
    } else {
      // measured
      const key = c.measurementKey!;
      const agg = c.measuredAgg || "min";
      let bestPid: ID | undefined;
      let bestVal: number | undefined;
      for (const [pid, rd] of roundByPlayer.entries()) {
        const s = rd.scores.find((x) => x.hole === c.hole);
        const v = s?.measurements?.[key];
        if (typeof v !== "number") continue;
        if (bestVal == null) {
          bestVal = v; bestPid = pid;
        } else if ((agg === "min" && v < bestVal) || (agg === "max" && v > bestVal)) {
          bestVal = v; bestPid = pid;
        }
      }
      results.push({
        contestId: c.id,
        name: c.name,
        hole: c.hole,
        winnerId: bestPid,
        winnerLabel: bestPid ? playerMap.get(bestPid) : undefined,
        winningValue: bestVal,
      });
    }
  }
  return results;
}

/////////////////////////
// Public Convenience  //
/////////////////////////

export function makeCustomStableford(points: Partial<PointsMap> = {}, useNet: boolean = false): StablefordConfig {
  return {
    useNet,
    points: { ...defaultStableford, ...points },
  };
}

export function makeBetterBall(scoresToCount: number, useNet = false): BetterBallConfig {
  return { scoresToCount: Math.max(1, scoresToCount), useNet };
}

/////////////////////////
// Example Usage (doc) //
/////////////////////////

/*
import {
  computeEventResults,
  makeCustomStableford,
  makeBetterBall,
  type EventData,
  type EventConfig
} from "./golfScoring";

const data: EventData = {
  course: {
    name: "Sample GC",
    holes: Array.from({length: 18}, (_,i)=>({hole:i+1, par:[4,4,3,5,4,4,3,5,4,  4,5,3,4,4,5,3,4,4][i], si:i+1}))
  },
  players: [
    { id: "p1", name: "Alice", handicap: 10 },
    { id: "p2", name: "Bob", handicap: 18 },
    { id: "p3", name: "Cathy", handicap: 5 },
    { id: "p4", name: "Dan", handicap: 12 },
  ],
  teams: [
    { id: "t1", name: "Alice & Bob", playerIds: ["p1","p2"] },
    { id: "t2", name: "Cathy & Dan", playerIds: ["p3","p4"] },
  ],
  rounds: [
    { playerId: "p1", scores: [{hole:1,strokes:4}, /* ... */] },
    // provide all players' hole-by-hole gross (and optionally net) scores
  ]
};

const config: EventConfig = {
  scoringFormats: ["strokeplay","stableford","matchplay"],
  teamMode: "better_ball",
  betterBall: makeBetterBall(1, /*useNet=*/true),
  stableford: makeCustomStableford({ birdie: 4, eagle: 5 }, /*useNet=*/true),
  betterBallHasIndividualBoard: true,
  matchPairings: [
    { id:"m1", sideA:["t1"], sideB:["t2"], useNet:true }
  ],
  skins: {
    enabled: true,
    useNet: true,
    metric: "strokes",
    carryOver: true
  },
  specialContests: [
    { id:"c1", hole:8, name:"Closest to Pin", type:"measured", measurementKey:"ctp_m", measuredAgg:"min" },
    { id:"c2", hole:5, name:"Longest Drive", type:"measured", measurementKey:"drive_m", measuredAgg:"max" },
    { id:"c3", hole:18, name:"Lightning Round", type:"timed" }
  ]
};

const results = computeEventResults(data, config);
console.log(results.leaderboards);
console.log(results.skins);
console.log(results.contests);
*/
