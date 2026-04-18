# Session Catalog: 2026-02-07

## Summary
Separated End Round and Finish Round button logic so they behave differently based on round completion status. Changed auto-save timer from 90 minutes to 2 hours and made it only trigger for complete 18-hole rounds.

---

## Change 1: End Round Button - Only Saves Complete Rounds
**Type:** Feature change
**Status:** Completed

### Previous Behavior
The red "End Round" button called `completeRound()` which always saved the round to history and triggered handicap calculation, regardless of how many holes were played.

### New Behavior
End Round now passes `'end'` source to `completeRound('end')`:
- If ANY player has < 18 holes scored: shows confirmation dialog listing incomplete players, then **abandons without saving** if confirmed
- If ALL players have ALL 18 holes scored: saves to history + calculates handicap (same as before)

### Confirmation Dialog Text
```
⚠️ Round Incomplete

PlayerName: X/18 holes

Incomplete rounds are NOT saved to history and will NOT affect handicaps.

Abandon this round without saving?
```

### File Modified
`public/index.html`
- Line ~32869: Button onclick changed from `completeRound()` to `completeRound('end')`
- Lines ~58172-58203 (inside `completeRound()`): Added 18-hole completion check block

### Commit
`97ecd850` - Separate End Round from Finish Round logic

---

## Change 2: Finish Round Button - Always Saves (Unchanged Behavior)
**Type:** Explicit wiring
**Status:** Completed

### Details
The green "Finish Round & Post Score" button now explicitly passes `'finish'` source: `completeRound('finish')`. This is the default parameter value, so behavior is identical to before — always saves to round history and calculates handicap regardless of holes played.

### File Modified
`public/index.html`
- Line ~33033: Button onclick changed from `completeRound()` to `completeRound('finish')`

### Commit
`97ecd850` - Separate End Round from Finish Round logic

---

## Change 3: completeRound() Now Accepts Source Parameter
**Type:** Function modification
**Status:** Completed

### Function Signature
```javascript
async completeRound(source = 'finish')
```

### Source Values
| Source | When Used | < 18 Holes | 18 Holes Complete |
|--------|-----------|------------|-------------------|
| `'finish'` | Green button | Saves + calculates | Saves + calculates |
| `'end'` | Red button | Confirm abandon, no save | Saves + calculates |
| `'auto'` | Auto-save timer | Silently skips | Saves + calculates |

### Logic Added (after existing "no scores" check, before save block)
For `'end'` and `'auto'` sources:
1. Loop through all players
2. Count holes scored per player (keys in `scoresCache[player.id]` where value is truthy)
3. If ANY player has < 18 holes:
   - `'auto'`: return silently (skip save)
   - `'end'`: show abandon confirmation dialog; if confirmed, clear round state and navigate back to setup; if declined, return to scoring

### File Modified
`public/index.html` - Line ~58107: `completeRound()` function

### Commit
`97ecd850` - Separate End Round from Finish Round logic

---

## Change 4: Auto-Save Timer Changed from 90 Minutes to 2 Hours
**Type:** Configuration change
**Status:** Completed

### Previous Value
```javascript
this.AUTO_SAVE_DELAY_MS = 90 * 60 * 1000; // 90 minutes (1.5 hours)
```

### New Value
```javascript
this.AUTO_SAVE_DELAY_MS = 120 * 60 * 1000; // 2 hours
```

### File Modified
`public/index.html` - Line ~52055

### Commit
`97ecd850` - Separate End Round from Finish Round logic

---

## Change 5: Auto-Save Only Triggers for Complete 18-Hole Rounds
**Type:** Feature change
**Status:** Completed

### Previous Behavior
`checkAutoSave()` would save any round with scores after 90 minutes of inactivity, regardless of completion.

### New Behavior
`checkAutoSave()` now checks that ALL players have ALL 18 holes scored before auto-saving. If any player is incomplete, it logs the skip and returns without saving.

### Logic Added (after "has scores" check, before save)
```javascript
// Check if ALL players have ALL 18 holes completed
let allComplete = true;
for (const player of this.players) {
    const cache = this.scoresCache[player.id] || {};
    const holesScored = Object.keys(cache).filter(h => cache[h]).length;
    if (holesScored < 18) {
        allComplete = false;
        break;
    }
}
if (!allComplete) return;
```

### File Modified
`public/index.html` - Lines ~52112-52167: `checkAutoSave()` function

### Commit
`97ecd850` - Separate End Round from Finish Round logic

---

## Testing Checklist
- [ ] End Round with < 18 holes: should show abandon dialog, NOT save to history
- [ ] End Round with 18 holes complete: should save and calculate handicap
- [ ] Finish Round with < 18 holes: should still save and calculate handicap
- [ ] Finish Round with 18 holes complete: should save and calculate (unchanged)
- [ ] Auto-save should NOT trigger for incomplete rounds
- [ ] Auto-save timer should be 2 hours (not 90 min)
