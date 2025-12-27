# Changes Log - December 27, 2025

## Summary
Fixed critical bug where wrong handicap was used when starting live scorecard rounds.

---

## 1. Society Handicap Not Applied at Round Start [CRITICAL BUG FIX]

**File:** `public/index.html` line ~51143-51157

### Problem
When starting a round, the system used the player's **universal handicap** instead of their **society-specific handicap**, even when a society was selected.

**Example (Pete Park):**
- Universal Handicap: 3.6 → `Math.round(3.6) = 4` strokes
- Travellers Rest Handicap: 2.5 → `Math.round(2.5) = 3` strokes
- System showed **-4 strokes** instead of **-3 strokes**

### Root Cause
When players are added to a round BEFORE the society is selected in the dropdown:
1. Player gets universal handicap (3.6)
2. User selects society (Travellers Rest)
3. `onSocietyChanged()` updates player handicaps
4. BUT if the user didn't add players AFTER selecting society, the original handicap was used
5. `startRound()` used `player.handicap` without verifying it matched selected society

### Fix Applied
Added handicap refresh in `startRound()` BEFORE creating scorecards:

```javascript
// CRITICAL FIX: Refresh all player handicaps to match selected society BEFORE creating scorecards
const selectedSociety = document.getElementById('roundSocietySelect')?.value;
console.log(`[LiveScorecard] Refreshing handicaps for selected society: "${selectedSociety || 'Casual'}"`);

for (const player of this.players) {
    if (player.societyHandicaps && player.societyHandicaps.length > 0) {
        const oldHcp = player.handicap;
        const newHcp = this.getHandicapForSociety(player.societyHandicaps, selectedSociety);
        if (oldHcp !== newHcp) {
            console.log(`[LiveScorecard] Updated ${player.name} handicap: ${oldHcp} → ${newHcp}`);
            player.handicap = newHcp;
        }
    }
}
```

---

## 2. Private Events Dropdown Option [FEATURE]

**File:** `public/index.html` line ~72771

Added "Private Events" option back to the society filter dropdown in the golfer's society dashboard.

---

## Key Functions Reference

### Handicap Selection Flow
| Step | Function | Line | Description |
|------|----------|------|-------------|
| 1 | `selectExistingPlayer()` | 50421 | Adds player with handicap based on current society selection |
| 2 | `getPlayerSocietyHandicaps()` | 48523 | Fetches all society handicaps for player from DB |
| 3 | `getHandicapForSociety()` | 48555 | Returns correct handicap for selected society |
| 4 | `onSocietyChanged()` | 48619 | Updates all player handicaps when society dropdown changes |
| 5 | `startRound()` | 50964 | **NOW FIXED:** Refreshes handicaps before creating scorecards |

### Handicap Stroke Allocation
| Function | Line | Description |
|----------|------|-------------|
| `allocHandicapShots()` | 48669 | Allocates strokes across 18 holes by stroke index |
| `getHandicapStrokesOnHole()` | 51448 | Returns strokes for specific hole |
| `Math.round(handicap)` | 48712 | Rounds handicap to playing handicap |

---

## Database Reference

### society_handicaps Table
Primary source of truth for all handicaps.

| Column | Type | Description |
|--------|------|-------------|
| golfer_id | TEXT | Player LINE ID |
| society_id | UUID | null for universal, UUID for society-specific |
| handicap_index | NUMERIC | The handicap value |
| calculation_method | TEXT | MANUAL, WHS-5, WHS-5-GPR, SYNC |
| last_calculated_at | TIMESTAMP | Last update timestamp |

### Example Data (Pete Park)
| society_id | handicap_index | Description |
|------------|----------------|-------------|
| null | 3.6 | Universal handicap |
| `<travellers-rest-uuid>` | 2.5 | Travellers Rest specific |

---

## Testing Checklist

- [ ] Add players BEFORE selecting society, then select society, then start round
- [ ] Verify console shows "Updated [name] handicap: X → Y"
- [ ] Verify correct strokes allocated based on society handicap
- [ ] Verify scorecard saves with correct `playing_handicap`

---

## Files Modified

1. `public/index.html` - Added handicap refresh in startRound() at line ~51143

---

## Deployment

```bash
# Committed and deployed
git commit -m "Fix: Refresh player handicaps before starting round to ensure correct society handicap is used"
vercel --prod --yes
```

Live at: https://mycaddipro.com
