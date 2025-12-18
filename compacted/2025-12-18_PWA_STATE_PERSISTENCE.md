# PWA State Persistence - December 18, 2025

## Summary
Added state persistence for the PWA so users resume where they left off when reopening the app from the home screen icon, instead of being forced back to login/overview.

---

## Problem
1. When opening the PWA from home screen icon, app would restart from login
2. User would lose their place (which tab/page they were on)
3. Had to navigate back to where they were every time
4. Frustrating user experience especially for frequent app users

---

## Solution

### 1. Added PWAStateManager
**Location:** `public/index.html` line ~5569

```javascript
window.PWAStateManager = {
    STORAGE_KEY: 'mcipro_pwa_state',

    save() {
        const state = {
            screen: AppState.navigation.currentScreen,
            tab: AppState.navigation.activeTab,
            dashboard: this._currentDashboard,
            timestamp: Date.now(),
            userId: AppState.currentUser?.userId || AppState.currentUser?.lineId
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    },

    load() {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (!saved) return null;
        const state = JSON.parse(saved);

        // Expire after 24 hours
        if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
            this.clear();
            return null;
        }

        // Don't restore login screen
        if (state.screen === 'loginScreen') return null;

        return state;
    },

    restore() {
        const state = this.load();
        if (!state) return false;

        // Verify same user
        const currentUserId = AppState.currentUser?.userId;
        if (state.userId && state.userId !== currentUserId) {
            this.clear();
            return false;
        }

        // Restore screen and tab
        ScreenManager.showScreen(state.screen, true); // skip save
        if (state.dashboard && state.tab) {
            setTimeout(() => {
                TabManager.showTab(state.dashboard, state.tab);
            }, 100);
        }
        return true;
    }
};
```

### 2. Auto-Save on App Background
**Location:** `public/index.html` line ~5667

```javascript
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        PWAStateManager.save();
    }
});

window.addEventListener('beforeunload', () => {
    PWAStateManager.save();
});
```

### 3. Save State on Tab Switch
**Location:** `TabManager.showTab()` line ~7555

```javascript
// Save PWA state for resume
if (window.PWAStateManager) {
    PWAStateManager.setDashboard(dashboardId);
}
```

### 4. Save State on Screen Change
**Location:** `ScreenManager.showScreen()` line ~7224

```javascript
// Save PWA state for resume (skip during restore)
if (!skipSave && window.PWAStateManager && screenId !== 'loginScreen') {
    PWAStateManager.save();
}
```

### 5. Restore on Login
**Location:** `LineAuthentication.redirectToDashboard()` line ~8223

```javascript
// Try to restore PWA state (resume where user left off)
let restored = false;
if (window.PWAStateManager) {
    try {
        restored = await PWAStateManager.restore();
    } catch (e) {
        console.warn('[redirectToDashboard] PWA restore failed:', e);
    }
}

// If not restored, go to default dashboard for role
if (!restored) {
    ScreenManager.showScreen(targetDashboard);
}
```

---

## State Structure

```javascript
{
    screen: 'golferDashboard',      // Current screen ID
    dashboard: 'golferDashboard',   // Active dashboard
    tab: 'schedule',                // Active tab within dashboard
    timestamp: 1734567890123,       // When state was saved
    userId: 'U2b6d976f...'         // User ID to prevent cross-user restore
}
```

---

## Behavior

| Scenario | Result |
|----------|--------|
| App backgrounded | State saved automatically |
| App closed | State saved via beforeunload |
| App reopened (same user) | Resumes to saved screen/tab |
| App reopened (different user) | Goes to default dashboard |
| State older than 24 hours | Cleared, goes to default |
| Login screen was last | Not restored (goes to dashboard) |

---

## Manifest Configuration

The `manifest.json` already has proper PWA resume settings:

```json
{
    "display": "standalone",
    "launch_handler": {
        "client_mode": "navigate-existing"
    }
}
```

The `navigate-existing` setting tells the browser to reuse existing app windows rather than opening new ones.

---

## Commits

| Commit | Message |
|--------|---------|
| `dc8becf5` | feat: Add PWA state persistence to resume where user left off |

---

## Files Modified

- `public/index.html` - Added PWAStateManager, modified ScreenManager, TabManager, and redirectToDashboard

---

## Testing

1. Open PWA from home screen
2. Navigate to any tab (e.g., Schedule, Messages, Round History)
3. Switch to another app or close PWA
4. Reopen PWA from home screen
5. Should resume to exact same page/tab

---

## Limitations

1. State expires after 24 hours (security)
2. State is user-specific (won't restore if different user logs in)
3. Login screen is never restored (always goes to dashboard)
4. Requires localStorage (works in all modern browsers)
