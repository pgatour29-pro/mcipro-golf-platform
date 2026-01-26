# Session Catalog: 2026-01-27

## Summary
Fixed three critical bugs: OAuth login not saving to localStorage, mobile drawer close button too large, and 2-man match play calculations for front/back nine.

---

## Fix 1: Mobile Drawer Close Button Too Large

**Status:** Completed

### Problem
The hamburger menu close button (X) was too large, taking up nearly the top space and covering the "Menu" text.

### Solution
Reduced the close button from large `btn-secondary p-2` styling to a minimal transparent button with 20px icon.

### File Modified
`public/index.html` line ~95585

### Before
```html
<button class="btn-secondary p-2" onclick="closeMobileDrawer()" aria-label="Close Menu">
    <span class="material-symbols-outlined">close</span>
</button>
```

### After
```html
<button onclick="closeMobileDrawer()" aria-label="Close Menu" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
    <span class="material-symbols-outlined" style="font-size: 20px; color: var(--gray-600);">close</span>
</button>
```

### Commit
`eba9469c` - Make mobile drawer close button smaller - reduce from 24px to 20px icon

---

## Fix 2: OAuth (Google/Kakao) Login Not Saving to localStorage

**Status:** Completed

### Problem
After logging in with Google or Kakao:
- Dashboard data not loading
- Profile data not displaying
- Session not restoring on page refresh
- Required 2-3 login attempts

### Root Cause
`setUserFromOAuthProfile()` was NOT saving to localStorage like `setUserFromLineProfile()` does.

**What `setUserFromLineProfile` does (correctly):**
1. `localStorage.setItem('line_user_id', lineUserId)` - for session restore
2. `localStorage.setItem(profileKey, JSON.stringify(fullProfile))` - for ProfileSystem
3. `localStorage.setItem('mcipro_user_profiles', JSON.stringify(profiles))` - for consistency

**What `setUserFromOAuthProfile` was missing:**
All three of the above localStorage saves.

### Solution
Added all three localStorage saves to `setUserFromOAuthProfile()`:

```javascript
// CRITICAL: Store user ID in localStorage for session restore
if (existingUser.line_user_id) {
    localStorage.setItem('line_user_id', existingUser.line_user_id);
} else if (userId) {
    localStorage.setItem('line_user_id', userId);
}

// CRITICAL: Save full profile to localStorage for ProfileSystem.getCurrentProfile()
const profileKey = UserIDSystem.getProfileKey(existingUser.role || 'golfer', userId);
localStorage.setItem(profileKey, JSON.stringify(fullProfile));

// CRITICAL: Also update mcipro_user_profiles array
localStorage.setItem('mcipro_user_profiles', JSON.stringify(profiles));
```

### File Modified
`public/index.html` lines ~11319-11438

### Commit
`aaa6c20a` - Fix OAuth login not saving to localStorage - causes dashboard data not loading

### Also Updated
`CLAUDE_CRITICAL_LESSONS.md` - Added Root Cause #5 documentation

---

## Fix 3: 2-Man Match Play Front/Back Nine Calculations Off by 1-2 Holes

**Status:** Completed

### Problem
In Live Scorecard 2-man match play for Stableford and Stroke, the front nine or back nine was always off by 1-2 hole calculations.

### Root Cause
Two issues in `calculateHolesStatus()` and `calculateMatchupStatus()`:

**Issue 1: Missing Stableford Support**
- Function only compared net strokes (lower wins)
- Did NOT support Stableford points comparison (higher wins)
- When user selected "Stableford Points" in match play settings, it was ignored

**Issue 2: Incorrect Handicap Allocation**
- Old code: `si <= strokeDiff ? 1 : 0` (simple stroke difference)
- Didn't handle handicaps over 18 (should get 2 strokes on some holes)
- Didn't handle plus handicaps (should give strokes back)

### Solution
Rewrote both functions to:

1. **Check Stableford setting from UI:**
```javascript
const mpMethodRadio = document.querySelector('input[name="matchPlayMethod"]:checked');
const stablefordIsScoring = this.scoringFormats?.includes('stableford');
const useStableford = mpMethodRadio?.value === 'stableford' || stablefordIsScoring;
```

2. **Add proper handicap allocation (matches team match play):**
```javascript
const getStablefordPoints = (grossScore, playerHcp, strokeIndex, par) => {
    const baseStrokes = Math.floor(absHcp / 18);
    const extraStrokeThreshold = absHcp % 18;

    let shotsReceived;
    if (isPlus) {
        shotsReceived = -(baseStrokes + (strokeIndex > (18 - extraStrokeThreshold) ? 1 : 0));
    } else {
        shotsReceived = baseStrokes + (strokeIndex <= extraStrokeThreshold ? 1 : 0);
    }
    // ... calculate points
};
```

3. **Compare correctly based on scoring method:**
```javascript
if (useStableford) {
    // Stableford: compare points (higher wins)
    if (p1Pts > p2Pts) p1Wins++;
    else if (p2Pts > p1Pts) p2Wins++;
} else {
    // Strokes: compare net score (lower wins)
    if (p1Net < p2Net) p1Wins++;
    else if (p2Net < p1Net) p2Wins++;
}
```

### Files Modified
`public/index.html` lines ~55503-55602

### Functions Changed
- `calculateMatchupStatus()` - Added Stableford detection, passes to calculateHolesStatus
- `calculateHolesStatus()` - Complete rewrite with Stableford support and proper handicap allocation

### Commit
`9fbdb004` - Fix 2-man match play: add Stableford support and fix handicap allocation for front/back nine

---

## Testing Checklist for Today's Round

### OAuth Login (Google/Kakao)
- [ ] Login with Google works first time
- [ ] Dashboard data loads after login
- [ ] Profile data displays (name, handicap, home club)
- [ ] Page refresh keeps you logged in
- [ ] Logout and login again works

### Mobile Drawer
- [ ] Close button (X) is small and doesn't cover "Menu" text
- [ ] Close button still works

### 2-Man Match Play
- [ ] Create 2-man match play round
- [ ] Test with Stableford scoring method
- [ ] Test with Stroke scoring method
- [ ] Verify Front 9 count is correct
- [ ] Verify Back 9 count is correct
- [ ] Verify Total matches Front 9 + Back 9
- [ ] Test with players of different handicaps

---

## Git Commits This Session

| Commit | Description |
|--------|-------------|
| `eba9469c` | Make mobile drawer close button smaller |
| `aaa6c20a` | Fix OAuth login not saving to localStorage |
| `9fbdb004` | Fix 2-man match play front/back nine calculations |

---

## Files Changed This Session

| File | Changes |
|------|---------|
| `public/index.html` | Mobile drawer button, OAuth localStorage, match play calculations |
| `CLAUDE_CRITICAL_LESSONS.md` | Added Root Cause #5 (OAuth localStorage) |

---

## Session Date
**2026-01-27**

## Deployments
- 3 deployments to Vercel production
- All via `vercel --prod --yes`

## Production URL
https://mycaddipro.com
