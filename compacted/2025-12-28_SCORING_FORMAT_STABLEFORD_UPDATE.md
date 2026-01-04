# Session Catalog - December 28, 2025
## Scoring Format Stableford Update

---

## Overview

Updated all game formats to use **Stableford points as default** instead of stroke play, reflecting Thailand golf conventions where most games use Stableford scoring.

---

## Changes Made

### 1. calculateBetterBall (Best Ball)
**Location:** `public/index.html` lines 49467-49522

**Before:** Used gross strokes, lowest score wins
**After:** Uses Stableford points by default, highest points wins

```javascript
// New signature
calculateBetterBall(teamScores, courseHoles, scoresToCount = 1, useStableford = true)

// Key logic:
if (useStableford) {
    const shots = player.handicap ? this.allocHandicapShots(courseHoles, player.handicap) : {};
    const netStrokes = this.netStrokesForHole(grossStrokes, shots[hole] || 0);
    return this.stablefordPointsForHole(netStrokes, par, pointsMap);
}
// Sort: Stableford highest first, Strokes lowest first
.sort((a, b) => useStableford ? b - a : a - b);
```

---

### 2. calculateSkins
**Location:** `public/index.html` lines 48958-49052

**Before:** Lowest net strokes wins the skin
**After:** Highest Stableford points wins the skin (default)

```javascript
// New signature (5th parameter added)
calculateSkins(allPlayerScores, courseHoles, useNet = true, pointsPerHole = 100, useStableford = true)

// Key logic:
if (useStableford) {
    const shots = (useNet && handicap) ? this.allocHandicapShots(courseHoles, handicap) : {};
    const netStrokes = this.netStrokesForHole(strokes, shots[hole] || 0);
    compareValue = this.stablefordPointsForHole(netStrokes, par, stablefordMap);
}

// Find winner: Stableford = Math.max, Strokes = Math.min
const best = useStableford
    ? Math.max(...holeScores.map(s => s.compareValue))
    : Math.min(...holeScores.map(s => s.compareValue));
```

**New return fields:**
- `scoringMethod`: 'stableford' or 'strokes'
- `winningScore`: best score on each hole
- `tiedScore`: score when tie occurs

---

### 3. calculateScramble
**Location:** `public/index.html` lines 49524-49552

**Before:** Simple gross stroke sum
**After:** Stableford points with team handicap support

```javascript
// New signature
calculateScramble(teamScore, courseHoles = null, useStableford = true, teamHandicap = 0)

// Key logic:
if (useStableford && courseHoles) {
    const shots = teamHandicap ? this.allocHandicapShots(courseHoles, teamHandicap) : {};
    for (const score of teamScore) {
        const netStrokes = this.netStrokesForHole(grossStrokes, shots[hole] || 0);
        total += this.stablefordPointsForHole(netStrokes, par, stablefordMap);
    }
}
```

---

### 4. Nassau Tie Handling Fix
**Location:** `public/index.html` lines 54566-54604

**Before:** Ties resulted in NO payment (money disappeared)
**After:** Losers split payment evenly among all winners

```javascript
// When multiple winners tie:
if (winners.length > 1 && losers.length > 0) {
    const splitAmount = Math.floor(pointsPerLoser / winners.length);
    if (splitAmount > 0) {
        for (const loser of losers) {
            for (const winner of winners) {
                settlements.nassau.push({
                    from: loser.player.name,
                    to: winner.player.name,
                    amount: splitAmount,
                    reason: `Nassau ${segmentLabel} (Tie)`,
                    isTie: true
                });
            }
        }
    }
}
```

---

### 5. Scramble Min Drive Enforcement
**Location:** `public/index.html` lines 52270-52296

**Before:** Minimum drive requirements displayed but not enforced
**After:** Validation on round completion with user confirmation

```javascript
// In completeRound():
if (this.scrambleConfig?.trackDrives && this.scrambleConfig?.minDrivesPerPlayer > 0) {
    const minRequired = this.scrambleConfig.minDrivesPerPlayer;
    const violations = [];

    for (const player of this.players) {
        const driveCount = this.scrambleDriveCount?.[player.id] || 0;
        if (driveCount < minRequired) {
            violations.push(`${player.name}: ${driveCount}/${minRequired} drives`);
        }
    }

    if (violations.length > 0) {
        const proceed = confirm(`⚠️ Scramble Drive Requirement Not Met!...`);
        if (!proceed) return; // Cancel round completion
    }
}
```

---

## Line Number Reference

| Component | Lines |
|-----------|-------|
| calculateBetterBall | 49467-49522 |
| calculateSkins | 48958-49052 |
| calculateScramble | 49524-49552 |
| Nassau tie handling | 54566-54604 |
| Scramble drive validation | 52270-52296 |
| stablefordPointsForHole | 48839-48848 |
| allocHandicapShots | 48790-48829 |
| netStrokesForHole | 48833-48836 |

---

## Stableford Points Reference

| Score vs Par | Points |
|--------------|--------|
| Condor (-4) | 6 |
| Albatross (-3) | 5 |
| Eagle (-2) | 4 |
| Birdie (-1) | 3 |
| Par (0) | 2 |
| Bogey (+1) | 1 |
| Double Bogey+ (+2+) | 0 |

---

## Backward Compatibility

All functions maintain backward compatibility:
- `calculateBetterBall(teamScores, courseHoles)` - works as before but now uses Stableford
- `calculateBetterBall(teamScores, courseHoles, 1, false)` - uses stroke play
- `calculateSkins(allPlayerScores, courseHoles, true, 100)` - works as before but now uses Stableford
- `calculateSkins(allPlayerScores, courseHoles, true, 100, false)` - uses stroke play
- `calculateScramble(teamScore)` - works as before (falls back to stroke play without courseHoles)

---

## Deployment

- Deployed to Vercel production
- Live at: https://mycaddipro.com
- Deployment URL: https://mcipro-golf-platform-h4loruzv4-mcipros-projects.vercel.app

---

Generated: 2025-12-28
