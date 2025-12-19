# Hole-by-Hole Leaderboard & Score Display Implementation Guide

## Overview
This guide provides step-by-step instructions to add:
1. **Live score display** in the scoring input section showing running totals
2. **Hole-by-hole leaderboard** with detailed score breakdown per hole
3. **Real-time updates** as scores are entered during play

---

## Files Created

### 1. `hole-by-hole-leaderboard-enhancement.js`
**Location:** `C:/Users/pete/Documents/MciPro/hole-by-hole-leaderboard-enhancement.js`
**Size:** ~10KB
**Purpose:** Contains all JavaScript logic for score display and hole-by-hole leaderboard

### 2. `score-display-html-insert.html`
**Location:** `C:/Users/pete/Documents/MciPro/score-display-html-insert.html`
**Size:** ~1KB
**Purpose:** HTML snippet to insert into index.html for the score display card

---

## Implementation Steps

### Step 1: Add JavaScript File to index.html

**File to edit:** `C:/Users/pete/Documents/MciPro/index.html`

**Location:** Find line ~107 where native-push.js is loaded

**Insert after line 107:**
```html
<script type="module" src="native-push.js"></script>
<script src="hole-by-hole-leaderboard-enhancement.js"></script>
```

**Why:** This loads the enhancement JavaScript after the page structure is ready.

---

### Step 2: Insert Score Display HTML

**File to edit:** `C:/Users/pete/Documents/MciPro/index.html`

**Location:** Line ~21473, after the keypad closing `</div>` tag

**Find this code:**
```html
                                    </div>
                                </div>

                                <!-- Right Column: Scramble Tracking (shown only when scramble format active) -->
```

**Replace with:**
```html
                                    </div>

                                    <!-- Score Display Card -->
                                    <div id="currentPlayerScoreDisplay" class="mt-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 rounded-lg" style="display: none;">
                                        <div class="flex items-center justify-between mb-3">
                                            <div class="flex items-center gap-2">
                                                <span class="material-symbols-outlined text-green-600">leaderboard</span>
                                                <h4 class="font-bold text-gray-900 text-sm">Current Round</h4>
                                            </div>
                                            <div class="flex items-center gap-2 text-xs text-gray-600">
                                                <span class="material-symbols-outlined text-sm">update</span>
                                                <span>Live</span>
                                            </div>
                                        </div>

                                        <!-- Multi-Format Score Summary -->
                                        <div id="playerFormatScores" class="space-y-2 text-sm">
                                            <!-- Format scores will be dynamically inserted here -->
                                        </div>

                                        <!-- Progress Bar -->
                                        <div class="mt-3 pt-3 border-t border-green-200">
                                            <div class="flex justify-between text-xs text-gray-600 mb-1">
                                                <span>Round Progress</span>
                                                <span id="playerHolesCompleted">0/18 holes</span>
                                            </div>
                                            <div class="w-full bg-gray-200 rounded-full h-2">
                                                <div id="playerProgressBar" class="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Right Column: Scramble Tracking (shown only when scramble format active) -->
```

**Why:** This adds the score display card that shows the current player's running totals.

---

## Features Implemented

### 1. Live Score Display (Scoring Input Section)

**Location:** Appears below the keypad when a player is selected

**Features:**
- ✅ Shows real-time score totals for all selected formats
- ✅ Updates instantly when scores are entered
- ✅ Progress bar shows holes completed (0-18)
- ✅ Color-coded format indicators
- ✅ Mobile-responsive design

**Formats Supported:**
- **Thailand Stableford** - Shows points with green star icon
- **Stroke Play** - Shows total strokes with golf icon
- **Modified Stableford** - Shows modified points with sparkle icon
- **Nassau** - Shows +/- score with grid icon
- **Scramble** - Shows team score with groups icon
- **Best Ball** - Shows score with filter icon
- **Match Play** - Shows "vs opponent" with compare icon
- **Skins** - Shows skins won with fire icon

**How it works:**
1. When player selects a name from Group Scores, their score display appears
2. As they enter scores on each hole, totals update automatically
3. Progress bar fills from 0% to 100% as holes are completed
4. Multi-format scoring shows all selected formats simultaneously

---

### 2. Hole-by-Hole Leaderboard

**Location:** Live Leaderboard section (below Join Side Games button)

**Features:**
- ✅ Shows scores for each hole in a scrollable table
- ✅ Color-coded scores (Eagle, Birdie, Par, Bogey, Double+)
- ✅ Shows running totals and holes played
- ✅ Toggle between Summary and Hole-by-Hole views
- ✅ Mobile-responsive with horizontal scroll

**Color Coding:**
- **Yellow (with white text):** Eagle or better (< Par-1)
- **Red (with white text):** Birdie (Par-1)
- **Gray:** Par
- **Light Blue:** Bogey (Par+1)
- **Dark Blue:** Double bogey or worse (Par+2 or more)

**Table Structure:**
```
| Player | HCP | 1 | 2 | 3 | ... | 18 | Thru | Total |
|--------|-----|---|---|---|-----|----|----- |-------|
| John   | 12  | 4 | 5 | 3 | ... | -  | 3    | 12    |
```

**How it works:**
1. Click "My Group" tab in Live Leaderboard
2. Toggle between "Summary" and "Hole-by-Hole" views
3. Hole-by-hole table shows all players' scores for each hole
4. Updates in real-time as scores are entered
5. Scrolls horizontally on mobile devices

---

## Real-Time Updates

### Automatic Updates Triggered By:

1. **Score Entry** - When player enters score via keypad
2. **Player Selection** - When different player is selected
3. **Hole Navigation** - When moving to next/previous hole
4. **Leaderboard Refresh** - When refreshLeaderboard() is called

### Update Flow:

```
User enters score
    ↓
saveCurrentScore() called
    ↓
scoresCache updated
    ↓
updatePlayerScoreDisplay() triggered
    ↓
Score display updates instantly
    ↓
refreshLeaderboard() triggered
    ↓
Hole-by-hole table regenerated
    ↓
UI updates complete
```

---

## Integration with Existing System

### Hooks into LiveScorecardManager:

1. **renderHole()** - Extended to update score display
2. **selectPlayer()** - Extended to update score display for selected player
3. **saveCurrentScore()** - Extended to update score display after saving
4. **renderGroupLeaderboard()** - Enhanced to add hole-by-hole view toggle

### Data Sources:

- **scoresCache** - Player scores stored in memory
- **courseData** - Hole information (par, stroke index)
- **scoringFormats** - Selected formats (stableford, strokeplay, etc.)
- **players** - Player list with names and handicaps

### No Breaking Changes:
- ✅ All existing functionality preserved
- ✅ Original functions extended, not replaced
- ✅ Backward compatible with current code
- ✅ Gracefully handles missing data

---

## Mobile Responsiveness

### Design Considerations:

1. **Score Display Card:**
   - Responsive width (max-w-xs on mobile)
   - Centered on mobile, left-aligned on desktop
   - Compact icons and text sizing

2. **Hole-by-Hole Table:**
   - Horizontal scroll on mobile (overflow-x-auto)
   - Sticky player name column (stays visible while scrolling)
   - Minimum column widths (min-w-[50px]) prevent cramping
   - Touch-friendly hit targets

3. **Toggle Buttons:**
   - Stacked on mobile if needed
   - Clear icons for easy identification
   - Active state clearly visible

---

## Testing Checklist

### 1. Score Display Testing

- [ ] Start a new round
- [ ] Select a player from Group Scores
- [ ] **Verify:** Score display card appears below keypad
- [ ] Enter scores for holes 1-3
- [ ] **Verify:** Totals update for each selected format
- [ ] **Verify:** Progress bar increases (shows 3/18 = 16.67%)
- [ ] Select different player
- [ ] **Verify:** Score display updates to show new player's scores

### 2. Hole-by-Hole Leaderboard Testing

- [ ] Navigate to Live Leaderboard section
- [ ] Click "My Group" tab
- [ ] **Verify:** Toggle buttons appear (Summary / Hole-by-Hole)
- [ ] Click "Hole-by-Hole" button
- [ ] **Verify:** Table appears with columns for each hole
- [ ] **Verify:** Scores are color-coded correctly
- [ ] Enter more scores
- [ ] **Verify:** Table updates in real-time
- [ ] **Verify:** Running totals are correct

### 3. Multi-Format Testing

- [ ] Start round with multiple formats selected (e.g., Stableford + Stroke Play + Nassau)
- [ ] Enter scores for several holes
- [ ] **Verify:** Score display shows all three formats
- [ ] **Verify:** Calculations are correct for each format
- [ ] Navigate to leaderboard
- [ ] **Verify:** Summary view shows all format leaderboards
- [ ] **Verify:** Hole-by-hole view shows gross scores

### 4. Mobile Responsiveness Testing

- [ ] Open on mobile device (or use browser dev tools)
- [ ] **Verify:** Score display card fits on screen
- [ ] **Verify:** Hole-by-hole table scrolls horizontally
- [ ] **Verify:** Player name column stays visible (sticky)
- [ ] **Verify:** Toggle buttons are touch-friendly
- [ ] **Verify:** All text is readable (not too small)

### 5. Real-Time Update Testing

- [ ] Have two players enter scores
- [ ] **Verify:** Leaderboard updates immediately after each score
- [ ] Navigate between holes
- [ ] **Verify:** Score display persists and updates correctly
- [ ] Complete all 18 holes
- [ ] **Verify:** Progress bar reaches 100%
- [ ] **Verify:** Final scores match across all views

---

## Troubleshooting

### Issue: Score display doesn't appear

**Solution:**
1. Check browser console for errors
2. Verify HTML was inserted correctly (line ~21473)
3. Verify JavaScript file is loaded (`hole-by-hole-leaderboard-enhancement.js`)
4. Ensure player is selected from Group Scores

### Issue: Hole-by-hole table shows "-" for all holes

**Solution:**
1. Verify scores are being saved to `scoresCache`
2. Check `this.courseData.holes` is populated
3. Ensure at least one score has been entered

### Issue: Formats showing "-" instead of scores

**Solution:**
1. Verify `courseData` is loaded when round starts
2. Check `scoringFormats` array contains expected formats
3. Ensure `GolfScoringEngine` is loaded

### Issue: Updates not happening in real-time

**Solution:**
1. Check if `refreshLeaderboard()` is being called
2. Verify `updatePlayerScoreDisplay()` function is defined
3. Check console for JavaScript errors
4. Ensure hooks are properly attached (renderHole, selectPlayer, etc.)

---

## Performance Considerations

- **Lightweight:** ~10KB JavaScript file
- **No external dependencies** (uses existing LiveScorecardManager)
- **Efficient rendering:** Only updates when scores change
- **Mobile-optimized:** Minimal DOM manipulation
- **No database queries:** Uses in-memory cache (scoresCache)

---

## Future Enhancements (Optional)

1. **Export to PDF:** Add button to export hole-by-hole table as PDF
2. **Live Sync:** Use Supabase real-time to sync across devices
3. **Comparison Mode:** Compare current round to previous rounds
4. **Statistics:** Show average scores per hole, GIR, FIR, etc.
5. **Animations:** Add subtle animations when scores update
6. **Dark Mode:** Add dark mode support for night rounds

---

## Summary

This implementation adds two major features to the MciPro scoring system:

1. **Live Score Display** - Shows real-time running totals in the scoring input area
2. **Hole-by-Hole Leaderboard** - Detailed breakdown of scores per hole

Both features:
- ✅ Update in real-time as scores are entered
- ✅ Support all 8 scoring formats
- ✅ Are mobile-responsive
- ✅ Integrate seamlessly with existing code
- ✅ Require only 2 simple edits to index.html

The enhancement provides golfers with immediate feedback on their performance and allows them to track progress hole-by-hole throughout their round.

---

## Support

If you encounter any issues during implementation:

1. Check the browser console for errors
2. Verify all code was inserted at the correct line numbers
3. Test in Chrome/Firefox developer tools mobile view
4. Review the Testing Checklist above
5. Check that `LiveScorecardManager` is properly initialized

For questions or improvements, refer to the compacted documentation:
- `C:/Users/pete/Documents/MciPro/compacted/2025-10-17_SCORECARD_ENHANCEMENTS_SESSION.md`
- `C:/Users/pete/Documents/MciPro/compacted/MASTER_SYSTEM_INDEX.md`
