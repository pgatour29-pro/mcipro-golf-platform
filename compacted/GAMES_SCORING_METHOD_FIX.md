# Live Scorecard Games - Scoring Method Fix

**Updated:** 2026-01-02
**File:** `public/index.html`

## Summary

Added scoring method selection (Stroke vs Stableford) for Match Play and Skins games to match the existing Nassau format. Previously, match play and skins had hardcoded scoring methods causing confusion.

## Issues Fixed

### 1. Match Play Missing Scoring Method Selection
- **Problem:** Match Play had no UI to select stroke vs stableford scoring
- **Solution:** Added `matchPlayMethodSection` with radio buttons for Net Strokes vs Stableford Points
- **Location:** Lines 30070-30090

### 2. Skins Always Used Stableford
- **Problem:** Skins game was hardcoded to use Stableford points only
- **Solution:** Added `skinsMethodSection` with radio buttons for Stableford vs Net Strokes
- **Location:** Lines 29900-29920

### 3. Round Robin Match Play Only Used Net Strokes
- **Problem:** `calculateRoundRobinMatchPlay()` had no stableford option
- **Solution:** Added `useStableford` parameter with stableford point comparison
- **Function:** `GolfScoringEngine.calculateRoundRobinMatchPlay(allPlayerScores, roundRobinMatches, courseHoles, useNet = true, useStableford = false)`
- **Location:** Line 49580

### 4. Regular Match Play Only Used Net Strokes
- **Problem:** Both versions of `calculateMatchPlay()` had no stableford option
- **Solution:** Added `useStableford` parameter to both versions
- **Functions:**
  - `calculateMatchPlay(player1Scores, player2Scores, courseHoles, useNet, handicap1, handicap2, useStableford)` - 1v1 version (line 49161)
  - `calculateMatchPlay(playerScores, courseHoles, useNet, useStableford)` - Multi-player version (line 49306)

## UI Components Added

### Match Play Scoring Method
```html
<div id="matchPlayMethodSection">
    <input type="radio" name="matchPlayMethod" value="stroke" checked>
    <span>Net Strokes</span>

    <input type="radio" name="matchPlayMethod" value="stableford">
    <span>Stableford Points</span>
</div>
```

### Skins Scoring Method
```html
<div id="skinsMethodSection">
    <input type="radio" name="skinsMethod" value="stableford" checked>
    <span>Stableford Points</span>

    <input type="radio" name="skinsMethod" value="stroke">
    <span>Net Strokes</span>
</div>
```

## Scoring Logic

### Stroke Play Mode
- **Winner:** Lowest net score wins the hole
- **Comparison:** `playerNet < opponentNet`
- **Tie:** Same net score = halved hole

### Stableford Mode
- **Winner:** Highest stableford points wins the hole
- **Comparison:** `playerPts > opponentPts`
- **Tie:** Same points = halved hole
- **Points Scale:**
  - Albatross (net -3): 5 pts
  - Eagle (net -2): 4 pts
  - Birdie (net -1): 3 pts
  - Par (net 0): 2 pts
  - Bogey (net +1): 1 pt
  - Double+ (net +2+): 0 pts

## Files Modified

### public/index.html

1. **Lines 29900-29920**: Added `skinsMethodSection` UI
2. **Lines 30070-30090**: Added `matchPlayMethodSection` UI
3. **Line 49161**: Updated 1v1 `calculateMatchPlay()` with `useStableford` parameter
4. **Line 49306**: Updated multi-player `calculateMatchPlay()` with `useStableford` parameter
5. **Line 49580**: Updated `calculateRoundRobinMatchPlay()` with `useStableford` parameter
6. **Lines 52847-52858**: Updated team match play save call
7. **Lines 52910-52913**: Updated individual match play save call
8. **Lines 55033-55045**: Updated settlement team match play call
9. **Lines 57249-57253**: Updated skins leaderboard calculation call
10. **Lines 57301-57318**: Updated round robin leaderboard calculation call
11. **Lines 57360-57370**: Updated team match play leaderboard calculation call
12. **Lines 57454-57457**: Updated individual match play leaderboard calculation call
13. **Lines 59621-59632**: Added sections to visibility toggle array

## Visibility Toggle

Updated `updateFormatSections()` to show/hide new sections:
```javascript
const sections = [
    { id: 'skinsValueSection', formats: ['skins'] },
    { id: 'skinsMethodSection', formats: ['skins'] },      // NEW
    { id: 'nassauMethodSection', formats: ['nassau'] },
    { id: 'matchPlayConfig', formats: ['matchplay'] },
    { id: 'matchPlayMethodSection', formats: ['matchplay'] }, // NEW
    { id: 'matchPlayPointsSection', formats: ['matchplay'] },
    // ... other sections
];
```

## Plus Handicap Handling

Also improved plus handicap handling in round robin match play:
```javascript
const playerIsPlus = playerHcp < 0;
const playerStrokes = playerIsPlus
    ? -(playerBaseStrokes + (strokeIndex > (18 - playerExtraThreshold) ? 1 : 0))
    : (playerBaseStrokes + (strokeIndex <= playerExtraThreshold ? 1 : 0));
```

## Default Behaviors

| Game Type | Default Scoring Method |
|-----------|----------------------|
| Match Play | Net Strokes (traditional) |
| Round Robin | Net Strokes |
| Team Match Play | Net Strokes |
| Skins | Stableford Points (Thailand style) |
| Nassau | Net Strokes |

## Testing Recommendations

1. **Test Match Play Stroke Mode:**
   - Create 2+ player round
   - Select Match Play format
   - Keep "Net Strokes" selected
   - Verify lowest net wins each hole

2. **Test Match Play Stableford Mode:**
   - Same setup as above
   - Select "Stableford Points"
   - Verify highest points wins each hole

3. **Test Skins Both Modes:**
   - Select Skins format
   - Test Stableford mode (default)
   - Test Stroke mode
   - Verify correct winner determination

4. **Test Round Robin:**
   - Create 3+ player round
   - Select Match Play > Multiple 1v1
   - Test both scoring methods
