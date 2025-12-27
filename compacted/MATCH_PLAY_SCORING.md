# Match Play Scoring System

## Bug Fixed (Dec 26, 2025)

### Problem
The handicap stroke allocation formula was completely wrong:
```javascript
// BROKEN CODE (was at lines 49065-49066):
const playerStrokes = Math.floor(playerHcp) + (strokeIndex <= (playerHcp % 1) * 18 ? 1 : 0);
```

`playerHcp % 1` returns the decimal portion (e.g., 18.5 % 1 = 0.5), which is wrong.

### Fix
**Location:** `calculateRoundRobinMatchPlay()` lines 49270-49276

```javascript
// CORRECT handicap stroke allocation:
const playerBaseStrokes = Math.floor(playerHcp / 18);
const playerExtraThreshold = playerHcp % 18;
const playerStrokes = playerBaseStrokes + (strokeIndex <= playerExtraThreshold ? 1 : 0);
```

## How WHS Stroke Allocation Works

For a handicap of 23:
- `baseStrokes = Math.floor(23 / 18) = 1` (1 stroke on ALL holes)
- `extraThreshold = 23 % 18 = 5` (extra stroke on hardest 5 holes)
- Holes with SI 1-5: 2 strokes
- Holes with SI 6-18: 1 stroke

For a handicap of 8:
- `baseStrokes = Math.floor(8 / 18) = 0`
- `extraThreshold = 8 % 18 = 8`
- Holes with SI 1-8: 1 stroke
- Holes with SI 9-18: 0 strokes

## Match Play Formats Supported

### 1. Round Robin (3+ players)
Each player plays head-to-head against every other player simultaneously.
- Hole-by-hole comparison using net scores
- Results: holes won/lost/halved per match
- Overall: aggregate across all matches

### 2. 2-Man Teams (4 players)
Two teams of 2 players each.
- Best ball format: best net score per team per hole
- Or combined: both scores count

## Functions

### calculateRoundRobinMatchPlay()
**Location:** lines 49214-49350
- Parameters: `allPlayerScores`, `roundRobinMatches`, `courseHoles`, `useNet`
- Returns individual match results for each player

### calculate2ManTeamMatchPlay()
**Location:** lines 49100-49211
- Parameters: `team1Scores`, `team2Scores`, `courseHoles`, `team1Handicap`, `team2Handicap`
- Returns team vs team results

## Net Score Calculation
```javascript
const strokeIndex = hole.stroke_index;
const playerHcp = parseFloat(player.handicap || 0);

const baseStrokes = Math.floor(playerHcp / 18);
const extraThreshold = playerHcp % 18;
const strokesReceived = baseStrokes + (strokeIndex <= extraThreshold ? 1 : 0);

const netScore = grossScore - strokesReceived;
```
