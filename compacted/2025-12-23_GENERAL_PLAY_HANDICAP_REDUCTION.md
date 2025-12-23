# 2025-12-23 General Play Handicap Reduction

## FEATURE OVERVIEW

Automatic 2-stroke handicap reduction for exceptional rounds. This applies **only to the universal handicap**, not society-specific handicaps.

---

## TRIGGER CONDITIONS

| Format | Condition | Threshold |
|--------|-----------|-----------|
| **Stableford** | 41+ points (18 holes) | 5+ above 36-point baseline |
| **Stroke Play** | Differential 5+ under handicap | `differential <= handicap - 5` |

**Reduction Amount**: -2.0 index strokes

---

## HOW IT WORKS

```
Player completes round
    ↓
Normal WHS adjustment calculated
    ↓
Check for exceptional performance:
    ├─ Stableford >= 41 points? OR
    └─ Differential <= (Handicap - 5)?
    ↓
If YES → Apply additional -2.0 to universal HCP only
    ↓
Save to society_handicaps with method: 'WHS-5-GPR'
    ↓
Show success notification
```

---

## EXAMPLE SCENARIOS

### Stableford Trigger
```
Player: John (HCP 18.0)
Score: 43 Stableford points

Normal adjustment: 18.0 → 17.8 (-0.2)
General Play Reduction: -2.0
Final Universal HCP: 15.8

Society HCP: Unchanged (normal adjustment only)
```

### Stroke Play Trigger
```
Player: Jane (HCP 15.0)
Gross Score: 78 (Course Rating 72, Slope 113)
Differential: (78 - 72) × (113/113) = 6.0

Is differential (6.0) <= handicap - 5 (10.0)? YES

Normal adjustment: 15.0 → 14.8 (-0.2)
General Play Reduction: -2.0
Final Universal HCP: 12.8
```

### No Trigger (Normal Round)
```
Player: Bob (HCP 20.0)
Score: 38 Stableford points

Is 38 >= 41? NO
Is differential <= 15? NO (differential is 18)

Normal adjustment only: 20.0 → 19.9 (-0.1)
No General Play Reduction
```

---

## CODE LOCATION

`public/index.html` lines 49849-49881

```javascript
// ========================================
// GENERAL PLAY HANDICAP REDUCTION (Universal Only)
// ========================================
let generalPlayReductionApplied = false;
const GENERAL_PLAY_REDUCTION = 2.0;
const STABLEFORD_BASELINE = 36;
const EXCEPTIONAL_THRESHOLD = 5;

// Check for exceptional Stableford score (41+ points for 18 holes)
const stablefordTriggered = adjustedStableford !== null &&
    adjustedStableford >= (STABLEFORD_BASELINE + EXCEPTIONAL_THRESHOLD);

// Check for exceptional stroke play (differential 5+ strokes better than handicap)
const strokePlayTriggered = differential <= (universalHcp - EXCEPTIONAL_THRESHOLD);

if (stablefordTriggered || strokePlayTriggered) {
    const beforeReduction = newUniversalHcp;
    newUniversalHcp = Math.max(-5, newUniversalHcp - GENERAL_PLAY_REDUCTION);
    generalPlayReductionApplied = true;
}
```

---

## FUNCTION SIGNATURE UPDATE

```javascript
// Before
async adjustHandicapAfterRound(player, totalGross, holesPlayed, courseRating, slopeRating, primarySocietyId)

// After - added totalStableford parameter
async adjustHandicapAfterRound(player, totalGross, holesPlayed, courseRating, slopeRating, primarySocietyId, totalStableford)
```

**Call site** (line 49617):
```javascript
await this.adjustHandicapAfterRound(
    player,
    totalGross,
    holesPlayed,
    round.course_rating || 72,
    round.slope_rating || 113,
    primarySocietyId,
    totalStableford  // NEW parameter
);
```

---

## DATABASE MARKING

When General Play Reduction is applied:

```javascript
{
    golfer_id: player.lineUserId,
    society_id: null,  // Universal only
    handicap_index: newUniversalHcp,
    calculation_method: 'WHS-5-GPR',  // GPR = General Play Reduction
    last_calculated_at: new Date().toISOString()
}
```

Normal rounds use `calculation_method: 'WHS-5'`

---

## CONSOLE LOG PATTERNS

**When triggered:**
```
[Handicap] ⚡ GENERAL PLAY REDUCTION TRIGGERED: Stableford 43 pts (41+ threshold)
[Handicap] ⚡ Universal HCP reduced by 2.0: 17.8 → 15.8
[Handicap] ✅ Universal HCP: 18.0 → 15.8 (incl. General Play Reduction -2.0)
```

**Stroke play trigger:**
```
[Handicap] ⚡ GENERAL PLAY REDUCTION TRIGGERED: Differential 8.5 vs HCP 15.0 (5+ under)
[Handicap] ⚡ Universal HCP reduced by 2.0: 14.7 → 12.7
```

**Normal round (no trigger):**
```
[Handicap] ✅ Universal HCP: 18.0 → 17.8
```

---

## USER NOTIFICATION

**Exceptional round:**
```
⚡ Exceptional round! Handicap: 15.8 (-2.2 incl. -2.0 General Play Reduction)
```

**Normal round:**
```
Handicap updated: 17.8 (-0.2)
```

---

## 9-HOLE SCALING

For 9-hole rounds, stableford points are scaled:
```javascript
if (holesPlayed === 9) {
    adjustedStableford = totalStableford * 2;
}
```

So 21+ points on 9 holes would trigger (scaled to 42).

---

## KEY DESIGN DECISIONS

1. **Universal Only**: Society handicaps are NOT affected by General Play Reduction
2. **After Normal Adjustment**: Applied after the standard WHS calculation
3. **Minimum Cap**: Cannot go below -5.0 (plus 5 handicap)
4. **Both Formats**: Works for both Stableford and Stroke Play
5. **Marked in DB**: `WHS-5-GPR` allows tracking of reduced handicaps

---

## WHY UNIVERSAL ONLY?

Society handicaps reflect performance within that specific society's events. The General Play Reduction is designed for the universal/casual handicap system where:

- Players may "sandbag" in casual rounds
- Exceptional casual performance should quickly adjust their base handicap
- Society events have their own adjustment rules

---

## COMMIT

- `ea359343` - feat: Add General Play Handicap Reduction for universal handicap

---

**Session Date**: 2025-12-23
**Status**: DEPLOYED
