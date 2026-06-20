# MyCaddiPro — Fuck-ups Ledger

> A running catalog of bugs, broken features, dead code, and anti-patterns found in the platform.
> Each entry: what it is, the evidence, root cause, status, and the lesson. Newest incidents on top.
> Line numbers are approximate anchors into `public/index.html` — search the named symbol if drifted.

---

## #1 — Phantom "active users" from handicap writes (User Activity panel)
**Found:** 2026-06-20 · **Status:** ✅ FIXED & DEPLOYED (commit `69ef2ddb`) · **Severity:** High (admin metrics were lies)

### Symptom
The Admin → **User Activity & Engagement** panel showed users as **"Online / active today"** when they had done nothing. "9 Today" was reported when nobody logged in.

### Evidence (from live DB)
9 users all had `user_profiles.updated_at = 2026-06-20 02:12 UTC` (09:12 Bangkok) — the **exact same instant**. That is one batch write (a **global handicap update**), not 9 logins. It produced precisely the "9 Today" figure and the cluster of "33m ago / Online" rows.

### Root cause
`AdminSystem.loadUserActivityData()` (index.html) used **`user_profiles.updated_at` as the "last active" signal**. `updated_at` is bumped by **ANY** profile write — global/bulk handicap updates, admin edits, background syncs — none of which are user activity. The core mistake: **conflating "row last modified" with "user last active."**

### The deeper fuck-up underneath it
There was **no real login tracking at all**. `last_login_at` did not exist on `user_profiles` and was never written. "Activity" had *always* been a guess via `updated_at`. So every handicap recalc, every admin edit, every sync had been silently inflating the activity numbers — this just made it visible.

### Fix
- Added `user_profiles.last_login_at timestamptz` (migration `sql/add_last_login_at.sql`).
- `recordUserLogin()` (defined above `class ScreenManager`, ~line 12853) stamps `last_login_at = now()` **once per browser session** (sessionStorage guard `mcipro_login_recorded`) when an authenticated `U%` user lands on a `*Dashboard`. Hooked into `ScreenManager.showScreen` right after `initializeScreen` — the single funnel every auth path routes through.
- "True last active" now = max(`last_login_at`, last round played, last event registered), fallback `created_at`. **`updated_at` is no longer used as an activity signal anywhere** in that panel (computation, filter, sort, render, CSV export — all switched to `created_at` fallback).

### Lesson
`updated_at` is a row-mutation timestamp, never a user-activity timestamp. Any metric that means "the user did something" must be driven by an event the *user* actually triggered (login, round, registration) — never by a column the *system* touches.

---

## Related fuck-ups surfaced by the same audit (2026-06-20)

### #1a — Course-admin "Last Login" field is permanently "Never"  · Status: ⚠️ LATENT (not fixed)
`CourseAdminSystem.loadCourseInfo()` (~line 97005) reads `course_admins.last_login_at` and renders it into `#courseInfoLastLogin`. The **column exists** but **nothing in the codebase ever writes it** → the Settings "Last Login" field always shows **"Never."** A dead read backing a dead UI field. (My fix wrote `user_profiles.last_login_at`, a *different* table — this one is still unwired.)
**Fix if wanted:** have `recordUserLogin()` (or a course-admin equivalent) also stamp `course_admins.last_login_at` when a course admin authenticates.

### #1b — Secondary "Active Today" tile counts scorecard *rows*, not people · Status: ⚠️ LATENT (minor)
The main Admin dashboard tile `#admin-active-today` (~line 62251) counts `scorecards` rows with `created_at >= today` via `{ count: 'exact', head: true }`. This is **real** activity (good — not the `updated_at` bug), but it counts **rows, not distinct players** — a golfer with 2 scorecards today counts as 2 "active users." Inflates the number.
**Fix if wanted:** count distinct `player_id`, or rename the tile to "Scorecards Today."

### #1c — Two different "Active Today" definitions in the same admin UI · Status: ℹ️ NOTE
`#admin-active-today` (overview tile) = scorecards-created-today; `#statActiveToday` (User Activity modal) = true-last-active ≥ midnight. Same label, different math. Not a bug, but they will disagree — know which is which.

### #1d — `.order('updated_at')` left on the analytics fetch · Status: ✅ HARMLESS (left as-is)
The User Activity query still does `.order('updated_at', {ascending:false})` (~line 63171). The result is immediately re-sorted by true-last-active in `filterActivityTable`, so it has no visible effect. Left to keep the change surgical.

### Verified NOT affected (checked, clean)
- `gm-analytics-engine.js` "Low Customer Retention" insight and `reports-system.js` `generateCustomerRetention()` compute retention from repeat-customer ratios, **not** from `updated_at`. No phantom-activity bug there.

---

## Standing lessons from this episode
1. **`updated_at` ≠ activity.** Never use a row-modification timestamp to mean "user did something."
2. **A read with no writer is a lie.** `last_login_at` was read in the UI for ages while the column either didn't exist (user_profiles) or was never populated (course_admins). Grep for the *writer* before trusting a displayed value.
3. **Same label, different math = future confusion.** Two "Active Today" numbers with different definitions will eventually be reported as a "bug" when they disagree.
4. **Prove it in the data first.** The 9-users-at-09:12 cluster query turned a hunch into a certainty before a line of code changed.
