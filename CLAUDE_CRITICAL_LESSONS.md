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

### Root Cause #3: Auto-Logout After Deploy
**Problem:** After deploying, users got automatically logged out. The page reloads on new build, and immediate session restore was:
1. Only waiting 1.5 seconds for Supabase (not enough after cold start)
2. Clearing `line_user_id` from localStorage if profile not found
3. Falling through to LIFF which timed out, showing login screen

**The fix:**
```javascript
// Increased timeout from 1.5s to 3s
while (!window.SupabaseDB.ready && attempts < 30) { // Max 3 seconds
    await new Promise(r => setTimeout(r, 100));
    attempts++;
}

// DON'T clear line_user_id if profile not found
// Let LIFF retry instead
console.warn('[INIT] Immediate restore failed - profile not found in Supabase');
console.log('[INIT] NOT clearing line_user_id - will retry via LIFF');
```

---

### Root Cause #4: redirectToDashboard Not Loading Dashboard Data
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

### Root Cause #5: OAuth (Google/Kakao) Login Not Saving to localStorage
**Problem:** `setUserFromOAuthProfile()` was NOT saving to localStorage like `setUserFromLineProfile()` does.

`setUserFromLineProfile` does these critical things:
1. `localStorage.setItem('line_user_id', lineUserId)` - for session restore
2. `localStorage.setItem(profileKey, JSON.stringify(fullProfile))` - for ProfileSystem
3. `localStorage.setItem('mcipro_user_profiles', JSON.stringify(profiles))` - for consistency

`setUserFromOAuthProfile` did NONE of these, causing:
- Dashboard data not loading (ProfileSystem.getCurrentProfile returns null)
- Session not restoring on page refresh
- Profile data not displaying

**The fix:** Added all three localStorage saves to `setUserFromOAuthProfile()`:
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

---

### Root Cause #6: AbortError Flooding All Supabase Queries After OAuth Login
**Problem:** After OAuth login (LINE/Kakao/Google), every Supabase database query fails with `AbortError: signal is aborted without reason`. Login succeeds but all data loading fails. Works on second login.

**Root Cause:** Supabase JS v2's GoTrue module has `detectSessionInUrl: true` by default. Script loading order:
1. `@supabase/supabase-js@2` CDN loads (line 32 of index.html)
2. `supabase-config.js` runs `createClient()` — **while `?code=` is still in the URL**
3. GoTrue sees `?code=` and tries to exchange it as a Supabase PKCE auth code
4. It's actually a LINE/Kakao/Google OAuth code → exchange fails → internal AbortController fires
5. Every subsequent `.from().select()` inherits the aborted signal

**The fix:** Disable GoTrue since the app doesn't use Supabase Auth:
```javascript
this.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: {
        detectSessionInUrl: false,
        autoRefreshToken: false,
        persistSession: false
    }
});
```

**Key rule:** When using Supabase JS v2 as a database-only client (no Supabase Auth), ALWAYS disable GoTrue's URL detection. Otherwise any `?code=` query parameter from external OAuth will corrupt the client.

---

---

## The 2026-02-02 Clusterfuck: Entire Scorecard Dead for 5 Days

### What Happened
The Jan 28 session committed escaped backticks (`\``) in anchor matchplay template literals. This is a **SyntaxError** — the browser cannot parse the script at all. `LiveScorecardManager` was never created. The entire scorecard tab was non-functional for 5 days until the user discovered it at the golf course on Feb 2.

**Full catalog:** `CLUSTERFUCK_CATALOG_2026-02-02.md`

### Root Cause: Escaped Backticks in Nested Template Literals
```javascript
// BAD — causes SyntaxError
${matchDetails.map((match, idx) => {
    return \`<tr>...</tr>\`;   // ← WRONG: \` is invalid
}).join('')}

// GOOD — nested backticks inside ${} are fine
${matchDetails.map((match, idx) => {
    return `<tr>...</tr>`;     // ← CORRECT: no escaping needed
}).join('')}
```

### Additional Failures Found
1. **init() cascade crash** — zero try/catch, one failed await killed all subsequent setup
2. **Tee marker null crash** — `.value` called on null querySelector result
3. **Silent error swallowing** — `console.error` with no user-visible notification in 6+ locations

### MANDATORY: Post-Deploy Verification (added Feb 2)

**After ANY commit that touches JavaScript:**

1. Open browser console — look for red `SyntaxError` or `TypeError`
2. Navigate to the **Scorecard tab** specifically
3. Verify `[LiveScorecard] Initializing...` appears in console
4. Verify events load in dropdown
5. Verify you can tap "Add Player" and the modal opens
6. Select a course, verify tee markers appear
7. If you see `LiveScorecardManager not found or init() missing` — **YOU BROKE IT, DO NOT DEPLOY**

### MANDATORY: Defensive Coding Rules (added Feb 2)

1. **NEVER use `\`` in template literals** — nested backticks inside `${}` don't need escaping
2. **Every `await` in an init chain MUST have its own try/catch** — one failure cannot cascade
3. **Never leave a UI container empty on failure** — always provide fallback content
4. **Never `console.error` without `NotificationManager.show()`** — users don't have console open
5. **Never call `.value` on querySelector without null check**

### Session Reference
- Date: 2026-02-02
- Breaking commit: `52345eb8` (Jan 28)
- Fix commits: `061de948`, `46f8aeff`, `01256eaf`
- Days broken in production: 5
- User feedback: "the sheer incompetence", "stupid fucker", "i hate fucking Claude code"

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

