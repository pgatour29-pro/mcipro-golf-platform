# SESSION CATALOG — May 27, 2026

## Summary
Course additions (Siam Waterside, Rolling Hills, Bangkok, Old Course update), POY fixes, SOS enhancements, matchplay team bug, score dedup bug, player card overflow fix. Multiple fuckups with dedup logic and matchplay validation.

---

## NEW COURSES ADDED

### Siam Waterside (NEW)
- ID: `siam_waterside`, 18 holes, Par 72
- 5 tees: Black 7,439y, Blue 6,569y, White 6,049y, Yellow 5,664y, Red 5,301y
- Course ratings stored

### Siam Rolling Hills (NEW)
- ID: `siam_rolling_hills`, 18 holes, Par 72, Designer: Brian Curley
- 5 tees: Black 7,267y, Blue 6,651y, White 6,032y, Yellow 5,757y, Red 5,416y
- Each hole has unique name (Get Away, Wall of Death, Postage Stamp, etc.)

### Siam Bangkok (NEW)
- ID: `siam_bangkok`, 18 holes, Par 72
- 4 tees only (NO BLACK): Blue 6,753y, White 6,310y, Yellow 5,830y, Red 5,291y

### Siam Old Course (UPDATED)
- ID: `siam_cc_old` — deleted old data, replaced with new scorecard
- 18 holes, Par 72, 5 tees
- Hole 2 black tee corrected to 401y (was wrong in old data)

### Siam Plantation (UPDATED — from May 26)
- 3-nine picker: Sugar Cane, Tapioca, Pineapple
- All 27 holes with 5 tees and combination stroke indices
- Real scorecard data from Pete's uploaded files

---

## FIXES

### FUCKUP #1: POY Update RPC Error
**Issue:** "Error: sb.rpc(...).catch is not a function" when updating POY data
**Root Cause:** Supabase JS v2 `rpc()` doesn't return a standard promise with `.catch()`. Used `.catch()` directly on the return value.
**Fix:** Changed to `try/catch` with `await` and destructured `{ error }` check.
**Lesson:** Supabase JS v2 returns `{ data, error }` from all methods including `rpc()`. Never use `.catch()` directly — always use `try/catch` or check the `error` property.

### FUCKUP #2: POY Back Button Not Working
**Issue:** Back button on POY page did nothing
**Root Cause:** Page opens in new tab, `window.history.back()` has no history to go back to.
**Fix:** First tried fallback to `href="/"`, then Pete said remove it entirely. Users use browser X to close.
**Lesson:** Pages that open in new tabs have no history. Don't use `history.back()` — either link to a specific URL or remove the button.

### FUCKUP #3: Score Dedup Rejecting 3rd/4th Player's Bogey Scores
**Issue:** 3rd AND 4th player's scores wouldn't save when it was a bogey (par+1), but other scores worked.
**Root Cause:** Time-based dedup in `saveCurrentScore()` was rejecting scores within 300ms of the same `player+hole+score` combo. When entering scores quickly for all 4 players, and multiple players scored bogey (same numeric value), the dedup window was too aggressive.
**Fix:** First reduced from 300ms to 150ms, then REMOVED the dedup entirely. The `_inputLocked` guard in `enterDigit()` already prevents double-taps — the additional dedup in `saveCurrentScore()` was redundant and harmful.
**Lesson:** Don't stack multiple dedup mechanisms. One guard is enough. Extra guards create silent rejection bugs that are hard to diagnose. The comment in the code even said "Previous cache-value approach silently rejected legitimate scores for players 3/4" — this was a REPEAT of the same class of bug.

### FUCKUP #4: Matchplay 2-Man Teams Won't Start
**Issue:** Games section stayed RED even with teams correctly configured, blocking Start Round.
**Root Cause:** `ScorecardStatus.update()` checked `scrambleConfig?.teams?.teamA?.length > 0` for ALL team games (scramble, bestball, matchplay). Matchplay doesn't use scramble teams, so the check always failed → RED border → Start Round blocked.
**Fix:** Only check scramble team config when scramble format is selected. Matchplay and bestball get GREEN without team pre-configuration.
**Lesson:** When adding validation for a specific format, don't apply it to all formats. Check which format is actually selected before validating format-specific config.

### FUCKUP #5: Player Cards Cut Off on Right Edge
**Issue:** With 2 or 4 players, the right-side player cards were cut off past the screen edge.
**Root Cause:** Grid used `repeat(2, 1fr)` which can blow out if card content is too wide. Combined with negative margins on the scorecard container.
**Fix:** Changed to `minmax(0, 1fr)`, added `min-width:0` and `overflow:hidden` on player cards, reduced wrapper padding.
**Lesson:** Always use `minmax(0, 1fr)` instead of `1fr` in CSS Grid when content might overflow. The `0` minimum prevents grid blowout.

### FUCKUP #6: Add 3rd/4th Player Lag
**Issue:** Adding the 3rd and 4th player to a group was slow/unresponsive.
**Root Cause:** `selectExistingPlayer()` awaited `getPlayerSocietyHandicaps()` (DB call) BEFORE rendering the player list. This blocked the UI.
**Fix:** Render immediately with profile handicap, fetch society handicap in background, re-render when ready.
**Lesson:** Never block UI rendering on async DB calls. Render optimistically first, update when data arrives.

### Alert History for Organizers
**Issue:** Alert History was only visible to Pete, not other organizers.
**Fix:** Show Alert History button for any user detected as organizer by RoleSwitcher.

### Desktop Admin Menu
**Issue:** No admin section in desktop More dropdown, only mobile drawer had it.
**Fix:** Added Admin header with all admin buttons (Sync Schedule, Update Handicaps, Update POY, View POY, Alert History) to desktop More dropdown.

---

## COMMITS

1. `89424c3c` — Fix POY rpc error
2. `c0da4573` — Fix POY back button (fallback to home)
3. `3745d3bd` — Remove POY back button entirely
4. `990e66e3` — Add Admin section to desktop More dropdown
5. `8f375b57` — Show Alert History for all organizers
6. `a461cef8` — Fix add player lag (render before async fetch)
7. `ed62a48b` — Fix player cards cut off on right edge
8. `4894d632` — Reduce score dedup to 150ms
9. `6d3ff94c` — Remove score dedup entirely (fix bogey rejection)
10. `39a43a8d` — Fix matchplay teams not starting (Games section wrongly RED)
11. `127b9856` — Add Siam Waterside course
12. `5db2a0cb` — Add Siam Rolling Hills course
13. `fcd05d9c` — Add Siam Bangkok course
14. Siam Old Course data updated via SQL

---

## KEY RULES REINFORCED

1. **No stacked dedup** — One guard per action. Multiple dedup mechanisms silently reject legitimate input.
2. **Render before async** — Never block UI on DB calls. Show something immediately, update when data arrives.
3. **Format-specific validation** — Don't apply scramble checks to matchplay. Check which format is selected first.
4. **minmax(0, 1fr)** — Always use this instead of plain `1fr` in CSS Grid to prevent content blowout.
5. **Supabase rpc()** — Returns `{ data, error }`, not a promise with `.catch()`. Use try/catch with await.
6. **New tab pages** — `history.back()` doesn't work. Link to specific URL or let user close the tab.
7. **Test with 4 players** — Always test score entry with 3-4 players entering the SAME score value on the same hole.

---

## SHIT CODE: User Activity Status System

The User Activity & Engagement module status labels (Online/Recent/Idle/Inactive) are confusing and not useful. The entire status concept needs to be rethought:

- "Idle" is meaningless - a golfer who played 8 days ago isn't idle, they're just not playing every day
- "Online" implies real-time presence tracking which doesn't exist - it just means "did something today"
- "Inactive" labels active players who happen to not have logged in recently
- The thresholds (today/7d/30d) are arbitrary and don't match golf patterns (people play weekly or bi-weekly)
- The whole system was based on profile update timestamps which had NOTHING to do with actual activity

**Status:** Partially fixed to use real round/event dates, but the labels and concept still need complete rethinking. Pete called it shit. Needs redesign with Pete's input on what labels/thresholds actually make sense for a golf platform.

**What it should probably be:**
- Based on actual rounds played frequency, not login times
- Labels like "Active" (played this month), "Regular" (plays weekly), "Occasional" (plays monthly), "Dormant" (hasn't played in 60+ days)
- Or just remove status entirely and show "Last Played: May 25" which is actually useful
