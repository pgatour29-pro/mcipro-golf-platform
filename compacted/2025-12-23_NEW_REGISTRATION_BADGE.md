# 2025-12-23 New Registration Badge Feature

## SESSION OVERVIEW

**Feature**: Badge notification on "My Registrations" tab when someone else registers you for an event

**Commits**:
- `f9cd84c6` - Initial badge implementation with real-time subscription
- `80a43028` - Added debug logging for real-time
- `9574a789` - Manual badge increment attempt (wrong approach)
- `5b7d6850` - Badge only increments for logged-in user
- `2d66a274` - Early badge subscription on page load
- `9d2ca6cf` - Debug notifications for real-time testing
- `ffb540d4` - Show connection status notification
- `fe9b2660` - Switch to polling instead of real-time
- `3bf57dd5` - Better polling debug output

---

## FINAL IMPLEMENTATION: Polling-Based Badge

### Why Polling Instead of Real-Time?
Supabase real-time WebSockets were not reliably broadcasting to mobile devices across different sessions. Polling every 10 seconds is more reliable.

### How It Works
1. On page load, `setupBadgeSubscription()` is called
2. Polls database every 10 seconds counting registrations for current user
3. Compares current count to last stored count
4. If count increased → increment badge + show notification

### Key Code Location
`public/index.html` lines 73069-73170

```javascript
setupBadgeSubscription() {
    // Wait for Supabase
    if (!window.SupabaseDB?.client) {
        setTimeout(() => this.setupBadgeSubscription(), 500);
        return;
    }

    // Get current user ID
    const getCurrentUserId = () => {
        return window.AppState?.currentUser?.lineUserId ||
               window.AppState?.currentUser?.userId ||
               localStorage.getItem('line_user_id');
    };

    const LAST_COUNT_KEY = 'mcipro_last_reg_count';

    const checkForNewRegistrations = async () => {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) return;

        const { count, error } = await window.SupabaseDB.client
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .eq('player_id', currentUserId);

        const lastCount = parseInt(localStorage.getItem(LAST_COUNT_KEY) || '-1');

        // First run - store baseline
        if (lastCount === -1) {
            localStorage.setItem(LAST_COUNT_KEY, count.toString());
            return;
        }

        if (count > lastCount) {
            const newCount = count - lastCount;
            for (let i = 0; i < newCount; i++) {
                this.incrementNewRegistrationBadge();
            }
            NotificationManager.show(`🎉 You were added to ${newCount} event(s)!`, 'success', 5000);
        }

        localStorage.setItem(LAST_COUNT_KEY, count.toString());
    };

    setTimeout(checkForNewRegistrations, 3000);
    this.badgePollingInterval = setInterval(checkForNewRegistrations, 10000);
    this.badgePollingActive = true;
}
```

---

## BADGE HTML

Location: `public/index.html` line 27360

```html
<button onclick="GolferEventsSystem.showEventsView('myevents')" id="eventsViewMyEvents" ...>
    <!-- New Registration Badge -->
    <span id="newRegistrationBadge"
          class="absolute -top-1 -right-1 text-[9px] font-bold text-white bg-red-500
                 min-w-[18px] h-[18px] flex items-center justify-center rounded-full
                 shadow-md animate-pulse z-10"
          style="display: none;">0</span>
    <span class="material-symbols-outlined">confirmation_number</span>
    <span class="hidden md:inline">My Registrations</span>
</button>
```

---

## BADGE MANAGEMENT FUNCTIONS

Location: `public/index.html` lines 73161-73207

### incrementNewRegistrationBadge()
- Increments count in localStorage (`mcipro_new_registration_count`)
- Updates badge UI

### clearNewRegistrationBadge()
- Resets count to 0
- Called when user views "My Registrations" tab

### updateNewRegistrationBadge()
- Syncs badge UI with localStorage count
- Shows badge if count > 0, hides if 0

### initNewRegistrationBadge()
- Restores badge from localStorage on page load

---

## BADGE CLEARING

When user clicks "My Registrations" tab, badge is cleared:

Location: `public/index.html` in `showEventsView()` method

```javascript
if (view === 'myevents') {
    this.clearNewRegistrationBadge();
}
```

---

## LOCALSTORAGE KEYS

| Key | Purpose |
|-----|---------|
| `mcipro_new_registration_count` | Badge counter (shown in UI) |
| `mcipro_last_reg_count` | Last known registration count (for polling comparison) |

---

## WHY REAL-TIME FAILED

### Attempted Approaches
1. **Supabase postgres_changes subscription** - Worked on same device but not across mobile/laptop
2. **Early subscription on page load** - Still didn't broadcast to mobile
3. **Manual increment when organizer adds player** - Wrong approach (only works same session)

### Root Cause
Supabase Realtime has limitations:
- Doesn't echo back to the client that made the change
- WebSocket connections can be unreliable on mobile browsers
- Network conditions affect real-time delivery

### Solution
Polling every 10 seconds directly queries the database - works 100% reliably regardless of WebSocket status.

---

## TESTING CHECKLIST

1. [ ] Login on mobile device
2. [ ] See "🔔 Badge polling active" notification
3. [ ] Have organizer (different device) add you to an event
4. [ ] Within 10 seconds, mobile shows notification + red badge
5. [ ] Badge shows count (1, 2, etc.)
6. [ ] Click "My Registrations" - badge clears
7. [ ] Badge stays cleared until new registration

---

## CONSOLE LOG PATTERNS

### Polling Active
```
[GolferEventsSystem] 🔔 Setting up badge polling...
[GolferEventsSystem] ✅ Badge polling ACTIVE (every 10s)
```

### Each Poll Cycle
```
[Badge Poll] Checking for user: U2b6d976f19bca4b2f4374ae0e10ed873
[Badge Poll] DB count: 5 | Stored count: 4
[Badge Poll] 🔔 NEW REGISTRATIONS: 1
```

### First Run (Baseline)
```
[Badge Poll] First run - storing baseline: 4
```

---

## FILES MODIFIED

1. **`public/index.html`**
   - Line 27360: Badge HTML element
   - Lines 73069-73207: Badge management in GolferEventsManager class
   - Line 73183: setupBadgeSubscription() called on class instantiation

2. **`public/sw.js`**
   - SW_VERSION updated through multiple iterations

---

## RELATED FIXES IN THIS SESSION

### Player Add/Delete from All Modals
- Fixed `RegistrationsManager.removePlayer()` - was calling non-existent `removeRegistration()`
- Changed to `deleteRegistration()` which exists

### Real-time Sync for My Registrations
- Registration subscription now calls `loadMyRegistrations()` when current user affected
- Works via polling now instead of real-time

---

**Session Date**: 2025-12-23
**Final Status**: WORKING - Badge appears on mobile when organizer adds player from laptop
**Key Lesson**: Polling > Real-time for cross-device reliability
