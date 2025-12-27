# HANDICAP DISPLAY - Global Fix (2025-12-25)

## The Problem
Pete Park's handicap was showing as "-1.0" instead of "+1.0" on multiple dashboards because:
1. Multiple code locations were using raw `handicap.toFixed(1)` or `Math.round(handicap)` instead of `window.formatHandicapDisplay()`
2. Plus handicaps are stored as NEGATIVE numbers in the database (e.g., +2 scratch = -2.0)
3. The display must convert negative values to "+" format for users

## The Solution
ALL handicap displays must use `window.formatHandicapDisplay(handicap)` which:
- Converts -1.0 to "+1.0"
- Displays positive values normally (e.g., 15.2)
- Handles edge cases (null, undefined, etc.)

## Locations Fixed

### LiveScorecard System
- Line 49175: Player search results `HCP: ${handicap}` -> `HCP: ${window.formatHandicapDisplay(handicap)}`
- Line 49452: Player dropdown options
- Lines 49337-49382: renderPlayersList() inline formatting replaced
- Line 52800: Partner selection modal
- Line 53538: Player scorecard header
- Line 54119: Team scramble header
- Line 54474: Share message handicap

### Round History / Golfer Dashboard
- Line 40859: Round detail handicap
- Lines 41049, 41056, 41081: Handicap progression chart

### Playing Partners
- Line 41490: Partner search results
- Line 41549: Selected partner display

### Event System
- Lines 60683, 60994: Waitlist and player search
- Lines 61915, 61933, 61985: Pairing displays
- Lines 62007, 62097, 62119, 62150: 4-ball group displays
- Lines 62434, 62451, 62475: Print pairings
- Lines 72213, 72318, 72330, 72349, 72512: Event registration displays
- Lines 73934, 74810: Registration cards and requests
- Lines 75106, 75340: Join requests and golfer invites

### Leaderboard / Scoring
- Lines 81241, 81321: Leaderboard handicap columns
- Line 81583: Edit score modal
- Lines 82595, 82764: Organizer scoring displays

### Player Directory
- Lines 58469, 58518: Already using formatHandicapDisplay (verified correct)

## The Rule

**ALWAYS use `window.formatHandicapDisplay(handicap)` when displaying a handicap to users.**

NEVER use:
- `handicap.toFixed(1)` alone
- `Math.round(handicap)` alone
- Inline ternary like `handicap < 0 ? '+' + Math.abs(handicap) : handicap`

## Adding New Handicap Displays

When adding any new UI that shows a handicap:

```javascript
// CORRECT - Always use formatHandicapDisplay
const display = window.formatHandicapDisplay(player.handicap);
element.textContent = `HCP: ${display}`;

// WRONG - Raw number display
element.textContent = `HCP: ${player.handicap.toFixed(1)}`; // Will show -1.0 for plus handicaps
```

## How formatHandicapDisplay Works

```javascript
window.formatHandicapDisplay = function(handicap) {
    if (handicap === null || handicap === undefined) return 'N/A';
    const numValue = parseFloat(handicap);
    if (isNaN(numValue)) return 'N/A';

    // Negative = plus handicap (better than scratch)
    if (numValue < 0) {
        return `+${Math.abs(numValue).toFixed(1)}`;
    }
    return numValue.toFixed(1);
};
```

## Database Storage

Handicaps in `society_handicaps.handicap_index`:
- Regular handicap 15.2 -> stored as `15.2`
- Plus handicap +2.1 -> stored as `-2.1` (NEGATIVE)
- Scratch 0.0 -> stored as `0.0`

The negative storage convention allows proper sorting (lower = better).

## CRITICAL: Dual Table Sync

Handicaps are stored in TWO places:
1. `society_handicaps.handicap_index` - Canonical source
2. `user_profiles.profile_data.golfInfo.handicap` - Legacy field

**A database trigger (`sync_handicap_trigger`) now automatically syncs these.**

See: `2025-12-25_HANDICAP_DUAL_TABLE_SYNC_DISASTER.md` for details.
