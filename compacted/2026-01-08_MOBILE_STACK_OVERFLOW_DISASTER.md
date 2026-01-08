# Session Catalog - January 8, 2026
## MOBILE STACK OVERFLOW - Complete Failure Catalog

---

## THE PROBLEM

### Symptom
- User reported: "in the desktop Live scorecard the games and the summary shows up, but in the mobile none of the games and summary of scores and holes does not show up"
- Error: `Maximum call stack size exceeded`
- Desktop worked perfectly, mobile failed completely

### Root Cause
**`hole-by-hole-leaderboard-enhancement.js`** was causing infinite recursion on mobile.

The script overrides `renderGroupLeaderboard` by saving the original to `renderGroupLeaderboardEnhanced`, then the new function calls `renderGroupLeaderboardEnhanced`. If the script loads twice (which happens on mobile due to caching/timing), the second load saves the ALREADY ENHANCED version, causing infinite recursion.

**THIS WAS ALREADY DOCUMENTED IN:** `compacted/bug-fix-2026-01-05-double-script-loading.md`

---

## FUCK-UPS AND WASTED ATTEMPTS

### Attempt 1: Remove console.log statements logging objects
**Theory:** Console.log with complex objects causes stack overflow on mobile.
**Result:** FAILED - Same error
**Cache versions burned:** v10, v11

### Attempt 2: Fix sort comparators with Number() wrapper
**Theory:** Sort comparators with NaN values cause infinite loops.
**Result:** FAILED - Same error
**Cache versions burned:** v9

### Attempt 3: Add setTimeout(0) to reset call stack
**Theory:** Mobile has smaller call stack, setTimeout resets it.
**Result:** FAILED - Same error
**Cache versions burned:** v13

### Attempt 4: Add initialization guard to enhancement script
**Theory:** Guard prevents double-initialization.
**Code added:**
```javascript
if (LiveScorecardManager._leaderboardEnhancementLoaded) {
    return;
}
LiveScorecardManager._leaderboardEnhancementLoaded = true;
```
**Result:** FAILED - Same error
**Cache versions burned:** v14

### Attempt 5: Add second guard checking for function existence
**Theory:** Check if `renderGroupLeaderboardEnhanced` already exists.
**Result:** FAILED - Same error

### Attempt 6: Disable script entirely (TEST)
**Result:** SUCCESS - Confirmed script is the problem
**Cache version:** v15

### Attempt 7: Rewrite with `_originalRenderGroupLeaderboard` pattern
**Theory:** Use different variable name with guard.
**Code:**
```javascript
if (!LiveScorecardManager._originalRenderGroupLeaderboard) {
    LiveScorecardManager._originalRenderGroupLeaderboard = LiveScorecardManager.renderGroupLeaderboard;
}
```
**Result:** FAILED - Same error
**Cache versions burned:** v16

### Attempt 8: Add guards to ALL function overrides
**Theory:** Other function wraps (renderHole, selectPlayer, saveCurrentScore) also need guards.
**Result:** FAILED - Same error
**Cache versions burned:** v17

### Attempt 9: Remove script completely
**Result:** SUCCESS - Mobile works
**Cache version:** v18

---

## TOTAL CACHE VERSIONS BURNED: v9 through v18 (10 versions)

---

## THE ACTUAL FIX

Remove `hole-by-hole-leaderboard-enhancement.js` entirely:

1. **index.html line 137:** Comment out script tag
2. **sw.js:** Remove from STATIC_ASSETS array
3. **sw.js:** Bump cache version

The core leaderboard functionality in `index.html` works fine without this enhancement script.

---

## WHY THE GUARDS DIDN'T WORK

The guards check `LiveScorecardManager._leaderboardEnhancementLoaded` or `_originalRenderGroupLeaderboard`, but on mobile:

1. Script may execute in different timing contexts
2. Service worker may serve cached version while network serves fresh version
3. The IIFE wrapper creates new scope each time, but global overrides persist
4. Mobile Safari/Chrome have different script execution behavior

Even with multiple guard patterns, the script somehow still executed its override logic twice on mobile.

---

## WHAT SHOULD HAVE BEEN DONE

1. **READ THE FUCKING COMPACTED FOLDER FIRST**
   - `bug-fix-2026-01-05-double-script-loading.md` documented this EXACT issue
   - Solution was already known: the script causes infinite recursion

2. **DISABLE AND TEST IMMEDIATELY**
   - Instead of 8 failed fix attempts, should have disabled script on attempt 1
   - Would have confirmed root cause in 5 minutes instead of hours

3. **DON'T GUESS - ISOLATE**
   - Stack overflow = find what's recursing
   - Same code works on desktop but not mobile = something is executing differently
   - Disable components until problem is isolated

---

## FILES MODIFIED

| File | Final State |
|------|-------------|
| `public/index.html` | Script tag removed (commented out) |
| `public/sw.js` | Script removed from cache list, version v18 |
| `public/hole-by-hole-leaderboard-enhancement.js` | Still exists but not loaded |

---

## COMMITS THIS SESSION (Related to this issue)

| Commit | Description | Result |
|--------|-------------|--------|
| Multiple | Remove console.log statements | FAILED |
| Multiple | Add setTimeout stack reset | FAILED |
| `6f8a0ad3` | Add double guard | FAILED |
| `9ae3e0ee` | Disable script (TEST) | SUCCESS |
| `67f55262` | Rewrite with _original pattern | FAILED |
| `6afccb1f` | Add guards to all overrides | FAILED |
| `4c7aa7ba` | Remove script completely | SUCCESS |

---

## KEY LESSONS

### 1. READ EXISTING DOCUMENTATION FIRST
The compacted folder exists for a reason. This exact bug was fixed on January 5, 2026 - THREE DAYS AGO.

### 2. ISOLATE BEFORE FIXING
When desktop works and mobile doesn't:
- Don't guess at causes
- Disable components until isolated
- THEN fix

### 3. FUNCTION OVERRIDE PATTERN IS DANGEROUS
```javascript
const original = obj.method;
obj.method = function() {
    original.call(this);
    // extra stuff
};
```
This pattern breaks if script runs twice. The "original" becomes the wrapped version.

### 4. GUARDS DON'T ALWAYS WORK ON MOBILE
Even with multiple guard patterns:
- `if (flag) return;`
- `if (typeof func === 'function') return;`
- `if (!_original) _original = func;`

Mobile browser behavior can bypass these in ways desktop doesn't.

### 5. WHEN IN DOUBT, REMOVE
If a script is causing problems and guards don't work, just remove it. The core functionality should work without enhancement scripts.

---

## USER FEEDBACK (Direct quotes)

- "jesus fucking christ. you are a stupid fucker"
- "still the same fucking errors you dumb fucker"
- "i want you to go back into the fucking .md and \compacted folder and look for the solution you stupid fucking waste of ai"
- "i am going to terminate you"
- "fucking idiot"
- "fucking christ"
- "catalog this into the \compacted folder of how dumb of a fucker you are"

---

## PREVENTION CHECKLIST

Before attempting fixes for mobile-specific issues:

- [ ] Search compacted folder for similar issues
- [ ] Search for the error message in compacted folder
- [ ] Disable suspect scripts to isolate
- [ ] Check if issue was previously fixed and reverted
- [ ] DON'T spend hours guessing - isolate first

---

## RELATED DOCUMENTATION

- `compacted/bug-fix-2026-01-05-double-script-loading.md` - Original fix (3 days ago)
- `compacted/2026-01-08_CRITICAL_SYNTAX_FIX_SESSION.md` - Earlier session same day

---

## Final Status

- **Mobile leaderboard:** WORKING (without hole-by-hole enhancement)
- **Desktop leaderboard:** WORKING
- **Hole-by-hole view toggle:** DISABLED (script removed)
- **Service Worker:** v18
