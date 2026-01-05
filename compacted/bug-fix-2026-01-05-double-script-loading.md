# Bug Fix: Double Script Loading Causing Infinite Recursion

**Date:** 2026-01-05
**Severity:** Critical
**Symptom:** Live scorecard summary not displaying, RangeError: Maximum call stack size exceeded

## Root Cause

Code splitting sub-agent added scripts to `DashboardLazyLoader` that were ALREADY loaded on the page with `defer` attribute.

**File:** `public/js/dashboard-lazy-loader.js`

```javascript
// BROKEN - scripts already loaded on page
'golferDashboard': {
    scripts: [
        'golf-buddies-system.js',
        'hole-by-hole-leaderboard-enhancement.js'
    ],
    init: null
}
```

When `DashboardLazyLoader.initialize('golferDashboard')` ran, it loaded these scripts a SECOND time.

## The Infinite Recursion

**File:** `public/hole-by-hole-leaderboard-enhancement.js` (lines 371-397)

```javascript
// First load: Saves original function
LiveScorecardManager.renderGroupLeaderboardEnhanced = LiveScorecardManager.renderGroupLeaderboard;

// Overrides with enhanced version
LiveScorecardManager.renderGroupLeaderboard = function(leaderboard) {
    // ... calls renderGroupLeaderboardEnhanced inside template
};

// SECOND load: Now saves the ALREADY ENHANCED function
// renderGroupLeaderboardEnhanced = enhanced version (not original)
// Calling renderGroupLeaderboardEnhanced now calls itself = INFINITE LOOP
```

## Console Errors

```
[Leaderboard Enhancement] Initializing...
[Leaderboard Enhancement] Initializing...  <-- TWICE = problem
Identifier 'BUDDIES_ENABLED' has already been declared
RangeError: Maximum call stack size exceeded
    at renderGroupLeaderboard (hole-by-hole-leaderboard-enhancement.js:397)
```

## Fixes Applied

### Fix 1: Remove duplicate scripts from lazy loader
**File:** `public/js/dashboard-lazy-loader.js`

```javascript
// FIXED - don't reload scripts already on page
'golferDashboard': {
    scripts: [],  // Empty - scripts loaded with defer
    init: null
}
```

### Fix 2: Add initialization guard
**File:** `public/hole-by-hole-leaderboard-enhancement.js`

```javascript
if (LiveScorecardManager._leaderboardEnhancementLoaded) {
    console.log('[Leaderboard Enhancement] Already initialized, skipping');
    return;
}
LiveScorecardManager._leaderboardEnhancementLoaded = true;
```

### Fix 3: Bump service worker version to clear cache
**File:** `public/sw.js`

```javascript
const SW_VERSION = 'mcipro-cache-v2';  // Was v1
```

## Commits

1. `dbb38ce3` - Fix: Add missing Current Round summary display during gameplay
2. `0906f6b1` - CRITICAL FIX: Prevent double-initialization of leaderboard enhancement
3. `84ba5d5b` - FIX: Remove duplicate script loading that caused infinite recursion
4. `9df6355e` - Bump service worker to v2 - force cache clear

## Prevention

1. Never add scripts to lazy loader if they're already in index.html with defer
2. Always add initialization guards to scripts that override functions
3. Test after code splitting changes
