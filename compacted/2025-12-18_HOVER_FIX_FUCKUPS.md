# CRITICAL FUCKUPS - December 18, 2025

## Session Summary: Hover Animation Removal Gone Wrong

**Task**: Remove hover/animation effects from hole-by-hole leaderboard in scoring page.

**Result**: Multiple catastrophic failures that broke the entire society page.

---

## FUCKUP #1: Using `background: inherit !important`

**What I did**:
```css
.metric-card.no-hover:hover div[class*='bg-'],
.metric-card.no-hover:hover td[class*='bg-'],
.metric-card.no-hover:hover th[class*='bg-'] {
    background: inherit !important;
    box-shadow: none !important;
    transform: none !important;
}
```

**Why it broke things**:
- `background: inherit` removed ALL background colors from elements
- Birdie/bogey/par color coding disappeared on hover
- Other parts of the page using `bg-*` classes lost their backgrounds

**Lesson**: NEVER use `inherit` for background when trying to preserve existing colors.

---

## FUCKUP #2: Using `*` selector with `!important`

**What I did**:
```css
.metric-card.no-hover *,
.metric-card.no-hover:hover * {
    transition: none !important;
    transform: none !important;
}
```

**Why it broke things**:
- `*` selector is too broad - affects EVERY child element
- Combined with `!important`, it overrode critical styles
- Broke the entire society page - nothing displayed

**Lesson**: NEVER use `*` selector with `!important` for targeted fixes.

---

## FUCKUP #3: Not testing changes before pushing

**What I did**:
- Made CSS changes
- Pushed immediately without local testing
- Broke production

**Lesson**: ALWAYS test CSS changes locally before pushing to production.

---

## FUCKUP #4: Cascading CSS changes affecting unrelated components

**What I did**:
- Added CSS rules targeting `.metric-card` children
- Didn't realize `.metric-card` is used throughout the entire app
- Society tabs, buttons, and other UI elements broke

**Lesson**: When modifying shared CSS classes, check ALL usages across the codebase first.

---

## FUCKUP #5: Reverting didn't fully clean up

**What I did**:
- Used `git revert` multiple times
- Reverts created a messy state where broken CSS persisted
- Had to manually remove all the broken CSS in the end

**Lesson**: When things go wrong, sometimes a clean manual removal is better than multiple reverts.

---

## FUCKUP #6: Missing null checks in JavaScript

**Pre-existing bug exposed**:
```javascript
document.getElementById('eventsViewHistoryContent').style.display = 'none';
```

**Why it broke**:
- `eventsViewHistoryContent` element doesn't exist in HTML
- Calling `.style` on `null` throws TypeError
- Society page tabs stopped working

**Fix applied**:
```javascript
const historyContent = document.getElementById('eventsViewHistoryContent');
if (historyContent) historyContent.style.display = 'none';
```

---

## FUCKUP #7: Untracked JS files not deployed

**What happened**:
- 5 JavaScript files existed locally but weren't tracked by git
- Files returned 404 in production
- Player Directory and other features broken

**Missing files**:
- `global-player-directory.js`
- `course-data-manager.js`
- `unified-player-service.js`
- `society-dashboard-enhanced.js`
- `tournament-series-manager.js`

**Fix**: Added files to git and pushed.

---

## Commits (Chronological)

| Commit | Description | Result |
|--------|-------------|--------|
| `b5ae18b1` | Remove hover:bg-gray-50 from table rows | Partial fix |
| `6f05983e` | Add no-hover CSS class | Partial fix |
| `2e6e94e1` | Add child element hover disable | **BROKE PAGE** |
| `84d1bf8f` | Revert above | Reverted |
| `8d8e7891` | Use `*` selector with !important | **BROKE PAGE WORSE** |
| `859ba470` | Revert above | Reverted |
| `f8cd9b7d` | Target only table cells | Still had issues |
| `d3e0228b` | Remove ALL broken CSS | **RESTORED PAGE** |
| `907008ea` | Add null checks to showEventsView | Fixed JS errors |
| `9eb5f2af` | Add missing JS files | Fixed 404s |

---

## RULES TO FOLLOW (BURN INTO MEMORY)

### CSS Rules:
1. **NEVER use `background: inherit`** - it removes colors
2. **NEVER use `*` selector with `!important`** - too broad
3. **ALWAYS check where CSS classes are used** before modifying
4. **TEST LOCALLY before pushing CSS changes**
5. **Use specific selectors** (table td, specific IDs) not broad ones

### JavaScript Rules:
1. **ALWAYS add null checks** for `getElementById()` results
2. **Verify elements exist in HTML** before referencing in JS

### Git Rules:
1. **Check `git status`** before deploying to ensure all files are tracked
2. **Look for 404 errors in console** - they indicate missing files
3. **Don't rapid-fire commits** when things break - stop and think

### General Rules:
1. **ONE TASK = ONE FOCUS** - don't break other parts of the app
2. **If a fix keeps failing, STOP and reconsider the approach**
3. **Revert COMPLETELY when things go wrong**, don't layer more fixes
4. **The hover animation issue was NOT FIXED** - left alone to avoid more damage

---

## Current State

- Society page: **WORKING**
- Tabs: **WORKING**
- Player Directory: **WORKING** (after adding missing JS files)
- Hover animations on leaderboard: **STILL PRESENT** (not fixed to avoid more breakage)

---

## If Hover Fix Is Attempted Again

The CORRECT approach would be to:
1. NOT use CSS at all for this
2. Modify the JavaScript that generates the table HTML
3. Add inline `style="pointer-events: none"` or similar to specific elements
4. OR create a completely separate CSS class that doesn't interact with `.metric-card`

**DO NOT** touch the global `.metric-card` CSS ever again for this purpose.
