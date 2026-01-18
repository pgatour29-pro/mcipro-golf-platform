# MciPro Deployment Rules & System Stability Guide

## CRITICAL: DO NOT DO THESE THINGS

### 1. NEVER Tell User to Clear Browser Cache
- Clearing cache during an active session causes AbortErrors
- The Service Worker will update naturally on next page load
- Just say "refresh the page" - NOT "clear cache"

### 2. NEVER Deploy While User Has OAuth Callback URL
- If URL contains `?code=...&state=...`, the OAuth is in progress
- Deploying/SW update will abort OAuth requests
- Wait for user to be on clean URL before testing

### 3. NEVER Use skipWaiting() + clients.claim() Aggressively
- These SW methods ABORT all in-flight fetch requests
- Removed in v166 - SW now updates gracefully on next navigation
- Old caches are cleaned up on activate, but SW waits to take control

### 4. NEVER Make Multiple Small Deploys
- Batch all changes into ONE deploy
- Each deploy = new SW version = potential disruption
- Test locally if possible, deploy once

---

## WHAT TO DO AFTER EVERY DEPLOYMENT

### 1. Verify Deployment
```bash
# Check the deployed file directly
curl https://mycaddipro.com/path/to/changed/file
```

### 2. Tell User to Simply Refresh
- "Refresh the page" or "Hit F5"
- DO NOT say "clear cache", "clear site data", "close browser"

### 3. If User Reports AbortErrors
- Tell them to go directly to `https://mycaddipro.com/` (clean URL)
- If they have `?code=...` in URL, that's OAuth callback - just refresh again
- AbortErrors during OAuth are temporary - refresh fixes it

### 4. Check Console for SW Version
- Should see: `[SW] Service Worker loaded: mcipro-cache-vXXX`
- If old version, user just needs to refresh (SW updates on navigation now)

---

## SESSION HISTORY: 2026-01-18

### What Was Done
1. Added total_yardage to all golf course YAML profiles
2. Fixed incorrect yardages for multiple courses
3. Fixed OAuth AbortError loop (v165) - URL now cleaned immediately
4. Removed aggressive SW takeover (v166) - no more skipWaiting/claim

### Courses Updated with Correct Yardages

| Course | Tees (Yardages) | Source |
|--------|-----------------|--------|
| Bangpakong | Black 7227, Blue 6700, White 6393, Yellow 5458, Red 5458 | YAML tee_boxes |
| Green Valley Rayong | Blue 7051, White 6738, Yellow 6276, Red 5561 | User corrected |
| Pattavia Century | Blue 7111, White 6639, Yellow 6069, Red 5376 | User corrected |
| Pattaya Country Club | Black 7054, Blue 6651, White 6274, Yellow 5954, Red 5536 | User provided |
| Hermes | Blue 6941, White 6435, Red 5524 | mScorecard |

### Courses Still Needing Verification
- Greenwood (currently: Blue 6969, White 6494, Yellow 5993, Red 5567)
- Mountain Shadow (currently: Black 6722, Blue 6276, White 5838, Red 5041)

### Version History This Session
- v160: Added yardages to all YAML profiles
- v161: Fixed Green Valley, Pattaya CC, Hermes yardages
- v162: Fixed Pattavia blue tee to 7111
- v163: Fixed bangpakong.yaml tees array (was missing total_yardage)
- v164: Fixed Green Valley tee order (White 2nd, Yellow 3rd)
- v165: Fixed OAuth AbortError loop - clean URL immediately on load
- v166: Removed aggressive SW skipWaiting/claim
- v167: Fixed Pattaya Country Club yardages (user provided)
- v168: Fixed game-specific handicap calculations (use getGameHandicap() instead of player.handicap)
- v169: Fixed getGameHandicap null safety check
- v170: Fixed game config initialization in startRound - ensure handicaps set for all formats
- v171: Added inline editable handicap badges to leaderboards (click to change)
- v172: Fixed Nassau method persistence - saves to gameConfigs at round start
- v173: Fixed plus handicaps (+1.6) - changed input min to -10, improved setGameHandicap
- v174: Safe setGameHandicap - prevents session state breaks with proper null checks
- v175: Round state persistence - saves active round to localStorage for crash recovery
- v176: Fixed plus handicap display in game config panel (formatHandicapDisplay + text input)
- v177: Fixed showLiveScorecard() - was looking for wrong section ID, now shows scorecardActiveSection

---

## ROOT CAUSE OF TODAY'S ISSUES

### The AbortError Loop
1. User logs in via LINE OAuth
2. Redirected back with `?code=...&state=...` in URL
3. SW updates and calls `clients.claim()` (v165 and earlier)
4. This ABORTS all in-flight Supabase requests
5. User sees AbortErrors, refreshes
6. URL still has OAuth params, loop continues

### The Fix (v165 + v166)
1. **v165**: Clean URL IMMEDIATELY on page load (before SW can claim)
   - Store OAuth params in sessionStorage
   - Clean URL with history.replaceState
   - DOMContentLoaded reads from sessionStorage

2. **v166**: Remove aggressive SW takeover
   - No more `skipWaiting()` in install event
   - No more `clients.claim()` in activate event
   - SW updates naturally on next navigation

---

## YAML Profile Structure

### Required Format for Tee Yardages to Display
```yaml
tees:
  - name: "Championship"
    color: "Black"
    course_rating: 72.0
    slope_rating: 130
    total_yardage: 7054  # <-- THIS IS REQUIRED
  - name: "Men"
    color: "Blue"
    course_rating: 71.0
    slope_rating: 127
    total_yardage: 6651  # <-- THIS IS REQUIRED
```

### Common Mistake
- Having `tee_boxes` object WITH total_yardage
- But `tees` array WITHOUT total_yardage
- Code checks `tees` array FIRST, ignores `tee_boxes`
- Fix: Add `total_yardage` to EVERY entry in `tees` array

---

## TESTING CHECKLIST

Before telling user to test:
- [ ] Deployed to Vercel production
- [ ] Verified changed files via WebFetch/curl
- [ ] User is on clean URL (no ?code= params)
- [ ] Just say "refresh" - not "clear cache"

If user reports issues:
- [ ] Check if URL has OAuth params
- [ ] Check console for SW version
- [ ] AbortErrors = tell user to refresh (not clear cache)
- [ ] If still broken, check actual code changes for bugs

---

## SCORE POSTING FLOW (Verified 2026-01-18)

### Database Relationships
```
event_registrations: event_id + player_id (who's registered)
         ↓
scorecards: event_id + player_id + scorecard_id (player's round)
         ↓
scores: scorecard_id + hole_number (individual hole scores)
```

### Player Identity
- **Existing players** (from directory): Use `line_user_id` as player ID
- **New players** (added on-the-fly): Use generated ID `player_${timestamp}`

### Scorecard Creation (startRound)
1. Each player gets unique scorecard with `event_id` + `player_id`
2. Stored in `this.scorecards[player.id] = scorecardId`
3. Duplicate prevention: checks if scorecard already exists

### Score Saving (saveCurrentScore)
1. Gets scorecard: `this.scorecards[this.currentPlayerId]`
2. Saves to `scores` table with `scorecard_id` + `hole_number`
3. Uses upsert with `onConflict: 'scorecard_id,hole_number'`

### Key Files
- `createScorecard()`: Line 50466 - creates scorecard with player_id
- `saveScore()`: Line 50627 - saves score to scorecard
- `saveCurrentScore()`: Line 55988 - UI score entry handler

---

## ROUND STATE PERSISTENCE (v175-v177)

### What Gets Saved (localStorage key: `mcipro_active_round`)
```javascript
{
    players: [],           // Array of player objects
    courseData: {},        // Course info with holes
    scoringFormats: [],    // ['stableford', 'matchplay', etc.]
    gameConfigs: {},       // Per-game settings and handicaps
    scoresCache: {},       // All entered scores by player/hole
    currentHole: 1,        // Current hole number
    currentHoleIndex: 0,   // Index in holeOrder array
    currentPlayerId: '',   // Active player for score entry
    selectedTeeMarker: '', // Tee marker selection
    holeOrder: [],         // Order of holes (for back 9 start)
    startingNine: 'front', // 'front' or 'back'
    scorecards: {},        // Map of playerId -> scorecardId
    groupId: '',           // Group identifier
    eventId: '',           // Event identifier
    isPrivateRound: false,
    matchPlayTeams: null,
    roundRobinMatches: null,
    savedAt: ''            // ISO timestamp
}
```

### When State is Saved
- `startRound()` - initial save
- `nextHole()` / `prevHole()` - navigation
- `saveCurrentScore()` - after each score entry

### Recovery Flow
1. On page load, `checkForActiveRound()` checks localStorage
2. If found (and < 24 hours old), shows modal:
   - "Continue Round" → restores state, shows scorecard
   - "Finish & Save Round" → restores and completes
   - "Discard Round" → clears localStorage
3. `showLiveScorecard()` switches to active section (v177 fix)

### Key Bug Fixed (v177)
- `showLiveScorecard()` was looking for `liveScorecardSection` (doesn't exist)
- Fixed to use `scorecardStartSection` (hide) and `scorecardActiveSection` (show)

---

## HANDICAP SYSTEM

### Internal Storage
- **Regular handicaps**: Stored as positive (e.g., 12.5)
- **Plus handicaps**: Stored as negative (e.g., -1.6 for +1.6)

### Display Format
- Use `formatHandicapDisplay(hcp)` to show +1.6 for -1.6

### Game-Specific Handicaps
- Stored in `gameConfigs[format].handicaps[playerId]`
- Use `getGameHandicap(format, playerId)` to retrieve
- Falls back to player.handicap if not set

### Input Parsing (setGameHandicap)
- Accepts "+1.6" input, converts to -1.6 internally
- Input type is "text" (not "number") to allow + prefix

---

## PENDING ITEMS

### To Verify at Chee Chan (2026-01-19)
- [ ] Round state persistence works in real session
- [ ] Scores post to correct players
- [ ] Handicaps display correctly
- [ ] Leaderboards update properly

### Courses Still Needing Yardage Verification
- Greenwood (currently: Blue 6969, White 6494, Yellow 5993, Red 5567)
- Mountain Shadow (currently: Black 6722, Blue 6276, White 5838, Red 5041)

### Future Enhancements (from plan file)
- Match Play 1v1 Leaderboard Redesign (see plan file)
- Show specific matchups instead of aggregate stats
- Display handicap strokes per matchup
