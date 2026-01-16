# BUGS CATALOG - January 16, 2026

## Critical Bugs Fixed This Session

---

### BUG #1: 2-Man Team Match Play Not Working
**Severity:** HIGH
**Version Fixed:** v123
**Affected Users:** Anyone using 2-man team match play or round robin

**Symptoms:**
- Team match play configured at round start
- Leaderboard shows no team results
- Individual scores work but team calculations missing

**Root Cause:**
When loading match play config from database in `getGroupLeaderboard()` (line 60800-60812), the code:
1. Loaded `this.matchPlayTeams` from database ✓
2. Restored `teamGameMode` radio button ✓
3. **DID NOT check the "teams" checkbox** ✗

Then `getMatchPlayTeamConfig()` at line 54177 checks:
```javascript
if (!selectedMatchPlayTypes.includes('teams') || !this.matchPlayTeams) {
    return null;
}
```
Since checkbox wasn't checked → returned null → team match play skipped entirely.

**Fix:**
Added auto-check of teams/roundrobin checkboxes when loading config from DB:
```javascript
const teamsCheckbox = document.querySelector('input[name="matchPlayType"][value="teams"]');
if (teamsCheckbox) teamsCheckbox.checked = true;
```

---

### BUG #2: Rounds Not Saving to Other Players' History
**Severity:** CRITICAL
**Version Fixed:** v124
**Affected Users:** ALL multi-player rounds - other players never got their rounds saved

**Symptoms:**
- Host finishes round, sees finalized scorecard
- Host's round appears in their history
- Other players in the group: NO round in their history
- Data permanently lost

**Root Cause:**
Race condition in `completeRound()`:

1. Line 55832: `distributeRoundScores()` scheduled with `setTimeout(..., 1000)` (1 second delay)
2. `showFinalizedScorecard()` displays immediately
3. If user closes modal before 1 second: `closeFinalizedScorecard()` → `actuallyEndRound()`
4. Line 58363: `this.scoresCache = {}` clears all cached scores
5. `distributeRoundScores()` finally runs but cache is empty
6. Line 56849: `if (this.scoresCache[player.id]?.[hole])` returns false for everyone
7. ALL players skipped with log: "Skipping [name] - no scores recorded"

**Impact:**
- Every multi-player round since this code was written
- Only the host got their round saved (their data was in cache when setTimeout fired)
- Other players' rounds permanently lost

**Fix:**
Changed `distributeRoundScores()` to check DATABASE for scores instead of volatile cache:
```javascript
// Check database for score count
const { count } = await window.SupabaseDB.client
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .eq('scorecard_id', scorecardId);

if (count > 0) holesPlayed = count;
```

---

### BUG #3: Pin Sheet Modal Not Displaying Locations (Not Fixed - Reverted)
**Severity:** MEDIUM
**Status:** Reverted to v119, needs investigation
**Version Affected:** v120, v121

**Symptoms:**
- Pins button added to live scorecard
- Modal opens showing date and green speed
- Pin location cards NOT rendered
- Data exists in console logs but not displayed

**Root Cause:**
Unknown - needs investigation. The `renderPinLocationsCards()` function exists but cards weren't appearing.

**Action Taken:**
Reverted to v119 stable code. Pin sheet feature deferred.

---

## Data Loss Impact

### Bangpakong Round - January 16, 2026
- Players affected: Unknown (all non-host players in the group)
- Rounds lost: All other players' rounds not saved to their history
- Recovery: Manual entry required via Profile > Round History > Add Round

---

## Lessons Learned

1. **Never use setTimeout for critical saves** - User can close/navigate before it fires
2. **Never rely on in-memory cache for data that exists in DB** - Cache can be cleared
3. **Test multi-player scenarios** - Single-player testing missed this entirely
4. **UI state (checkboxes) must be restored when loading saved config**

---

## Version History This Session

| Version | Changes |
|---------|---------|
| v122 | Reverted to v119 (pin sheet causing issues) |
| v123 | Fixed team match play checkbox not being checked |
| v124 | Fixed race condition - rounds not saving to all players |
