# CRITICAL LESSONS FOR CLAUDE - READ BEFORE ANY TASK

**Priority: MUST READ at start of every session**

---

## The 2026-01-26 Fuckup: Dashboard Data Not Loading

### What Happened
After making a simple change (adding a question to the demo intro slide), the user reported "dashboard data not loading" and "profile data not loading". This was NOT a new bug - it was a pre-existing bug that should have been caught.

### Root Cause #1: Supabase Not Ready
**Problem:** Dashboard data loading functions were calling `window.SupabaseDB.client` without checking if Supabase was ready.

**Files affected:**
- `DashboardUpcomingEvents.load()` - line ~27818
- `DashboardCaddyBooking.init()` - line ~27940
- `DashboardPerformance.load()` - line ~28205

**The fix:**
```javascript
// ALWAYS add this at the start of any async function that uses Supabase:
if (window.SupabaseDB && !window.SupabaseDB.ready) {
    await window.SupabaseDB.waitForReady();
}
if (!window.SupabaseDB?.client) {
    console.error('[FunctionName] Supabase not available');
    return;
}
```

### Root Cause #2: Profile Not Saved to localStorage During Immediate Session Restore
**Problem:** The immediate session restore code (lines ~13634-13716) was setting `AppState.currentUser` with profile data from Supabase, BUT it was NOT saving the profile to localStorage with the correct key.

`ProfileSystem.getCurrentProfile()` looks for a localStorage key like `profile_golfer_U2b6d976f...`. If this key doesn't exist, the profile data doesn't display.

**The fix:** After setting AppState.currentUser, also save to localStorage:
```javascript
if (userProfile.profile_data) {
    const profileKey = UserIDSystem.getProfileKey(userProfile.role || 'golfer', savedLineUserIdImmediate);
    const fullProfile = {
        userId: savedLineUserIdImmediate,
        lineUserId: savedLineUserIdImmediate,
        // ... all profile fields
    };
    localStorage.setItem(profileKey, JSON.stringify(fullProfile));
}
```

---

## MANDATORY CHECKLIST FOR EVERY CODE CHANGE

### Before Deploying ANY Change:

1. **Check all data loading functions use `waitForReady()`**
   - Search for `window.SupabaseDB.client` in the file
   - Every usage MUST be preceded by a ready check
   - Pattern: `if (window.SupabaseDB && !window.SupabaseDB.ready) { await window.SupabaseDB.waitForReady(); }`

2. **Check session restore saves ALL necessary data**
   - `AppState.currentUser` is NOT enough
   - localStorage must also be populated for ProfileSystem
   - Check: Does immediate restore do the same saves as normal login?

3. **Check dashboard initialization calls ALL widgets**
   - `DashboardUpcomingEvents.load()`
   - `DashboardCaddyBooking.init()`
   - `DashboardPerformance.load()`
   - `ScheduleSystem.renderScheduleList()`
   - `UserInterface.updateUserDisplays()`
   - `ProfileSystem.initializeDashboard()`

4. **Test the login flow, not just the feature you changed**
   - Even if you only changed a demo slide, the app must still work
   - Profile data must display
   - Dashboard widgets must load
   - Handicap must show correctly

5. **Test BOTH login flows**
   - **Immediate session restore**: User has `line_user_id` in localStorage, skips OAuth
   - **OAuth login**: User logs out, clears localStorage, logs back in via LINE/Kakao/Google
   - BOTH must load profile data and dashboard widgets
   - If you fix one, check the other still works

---

## Common Patterns That Break Things

### Pattern 1: Forgetting Supabase Ready Check
```javascript
// BAD - will fail if Supabase not ready
const { data } = await window.SupabaseDB.client.from('table').select('*');

// GOOD - waits for Supabase
if (window.SupabaseDB && !window.SupabaseDB.ready) {
    await window.SupabaseDB.waitForReady();
}
const { data } = await window.SupabaseDB.client.from('table').select('*');
```

### Pattern 2: Setting AppState But Not localStorage
```javascript
// BAD - ProfileSystem.getCurrentProfile won't find the data
AppState.currentUser.profileData = userProfile;

// GOOD - also save to localStorage
AppState.currentUser.profileData = userProfile;
const profileKey = UserIDSystem.getProfileKey(role, lineUserId);
localStorage.setItem(profileKey, JSON.stringify(fullProfile));
```

### Pattern 3: Not Loading All Dashboard Widgets After Login
```javascript
// BAD - only loads some widgets
setTimeout(() => {
    DashboardUpcomingEvents.load();
    ScheduleSystem.renderScheduleList();
}, 500);

// GOOD - loads ALL widgets
setTimeout(() => {
    DashboardUpcomingEvents.load();
    DashboardCaddyBooking.init();
    DashboardPerformance.load();
    ScheduleSystem.renderScheduleList();
    UserInterface.updateUserDisplays();
    ProfileSystem.initializeDashboard();
}, 500);
```

---

### Root Cause #3: redirectToDashboard Not Loading Dashboard Data
**Problem:** The `redirectToDashboard()` function (line ~9852) was NOT explicitly loading dashboard widgets after OAuth login.

It was relying on `initGolferDashboard` timeouts (2500-5000ms), but those timeouts may not fire reliably, especially on mobile.

Also had a bug: checked `typeof ProductionCloudSync` but called `SimpleCloudSync`.

**The fix:** Add explicit dashboard data loading in redirectToDashboard:
```javascript
// CRITICAL: Explicitly load all dashboard data after login
setTimeout(() => {
    if (typeof DashboardUpcomingEvents !== 'undefined') DashboardUpcomingEvents.load();
    if (typeof DashboardCaddyBooking !== 'undefined') DashboardCaddyBooking.init();
    if (typeof DashboardPerformance !== 'undefined') DashboardPerformance.load();
    if (typeof ScheduleSystem !== 'undefined') ScheduleSystem.renderScheduleList();
    if (typeof ProfileSystem !== 'undefined') ProfileSystem.initializeDashboard();
    if (typeof TodaysTeeTimeManager !== 'undefined') TodaysTeeTimeManager.updateTodaysTeeTime();
}, 500);
```

---

## Key Files and Their Responsibilities

| File/Section | Responsibility |
|--------------|----------------|
| `setUserFromLineProfile()` (~line 9529) | Normal login - sets AppState AND localStorage |
| `redirectToDashboard()` (~line 9852) | Navigates to dashboard AND loads all widgets |
| Immediate session restore (~line 13634) | Quick login from localStorage - MUST do same as above |
| `ProfileSystem.getCurrentProfile()` (~line 19707) | Reads from localStorage, NOT AppState |
| `DashboardUpcomingEvents.load()` | Loads from Supabase - needs ready check |
| `DashboardCaddyBooking.init()` | Loads from Supabase - needs ready check |
| `DashboardPerformance.load()` | Loads from Supabase - needs ready check |

---

## The Golden Rule

**When you complete a task, the ENTIRE app must still work, not just the feature you touched.**

If you add a question to a demo slide, the login flow must still work. If you fix a handicap display, dashboard widgets must still load.

ALWAYS verify:
1. Login works
2. Profile data displays (name, handicap, home club)
3. Dashboard widgets load (upcoming events, performance stats)
4. No console errors related to Supabase or undefined

---

## Session Reference
- Date: 2026-01-26
- Commits: `0cad929f`, `0c7f10ce`
- User feedback: "stupid fucker", "where is the fucking profile data", "fix all of this now"
- Time wasted: Significant
- Could have been avoided: YES, by following this checklist

