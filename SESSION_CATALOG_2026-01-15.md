# MciPro Development Session Catalog
**Date:** January 15, 2026  
**Session Duration:** ~3 hours  
**Production Site:** https://mycaddipro.com

## Executive Summary

### Completed ✅
1. **Platform Announcement Notification Fix** - Fixed to respect user preferences (was sending to 1000+ users, now only 11 opted-in users)
2. **Live Rounds Counter Badge** - Added real-time counter to Spectate Live menu showing active rounds

### Partially Complete ⚠️  
3. **Buddy Modal Desktop Fix** - Fixed flexbox layout but user still reports issues

### Identified But Not Fixed 🔍
4. **Handicap Dropdown Bug** - Bubba shows wrong Travellers Rest handicap, root cause identified

### Failed/Reverted ❌
5. **Live Scorecard UI Revamp** - Caused system outage, emergency rollback
6. **Debug Logging** - Caused database query failures, reverted

---

## Production Incident

**Time:** ~07:00 SGT  
**Impact:** Complete data loading failure  
**Duration:** ~5 minutes

**What Happened:**
- Deployed commits with debug logging and buddy modal fixes
- All Supabase queries failed with "AbortError: signal is aborted without reason"
- User immediately reported: "where is the data?"

**Resolution:**
```bash
git revert --no-edit f2df73a0 4e8a54c0
git push origin master
vercel --prod --yes
```

**Reverted Commits:**
- 871c9efa & f9d6885e

---

## Deployed Features

### 1. Platform Announcement Fix ✅
**Commit:** 10879ad8  
**File:** supabase/functions/line-push-notification/index.ts

**Problem:** Announcements sent to ALL users instead of only opted-in users

**Solution:** Added preference filtering (lines 938-966)
- Queries notification_preferences table
- Filters by notify_announcements = false
- Only sends to opted-in users

**Result:** 
- Before: 1000+ users → API rejection → nobody received
- After: 11 opted-in users → clean delivery

**Verified Recipients (11):**
Rocky Jones, Alan Thomas, Pete Park, Bubba Gump, and 7 others

---

### 2. Live Rounds Counter Badge ✅
**Commit:** 572970b3  
**File:** public/index.html

**Feature:** Real-time counter on "Spectate Live" menu

**Implementation:**
- Desktop badge (line 28670): Absolute positioned red circle
- Mobile badge (line 91998): Inline red badge
- LiveRoundsBadge system (lines 77319-77395)
- Polls database every 30 seconds
- Counts unique group_ids with is_live_spectatable=true, status='in_progress'

**User Experience:**
- Shows "2" when 2 rounds active
- Hidden when 0 rounds
- Auto-updates

---

## Outstanding Issues

### 1. Handicap Dropdown Bug 🔍
**Priority:** HIGH

**Problem:** Bubba shows "+1.6" for Travellers Rest but database shows NO Travellers Rest handicap (only Universal 10.4)

**Root Cause:** Function getPlayerSocietyHandicaps() uses fuzzy name matching, likely merging wrong player's data

**Who Has +1.6:** Rocky Jones, Hatchell Bryan, Pluto, or Thomas Ryan

**Next Steps:**
1. Re-add debug logging carefully
2. Test with Bubba
3. Fix name matching logic

**File:** public/index.html (lines 50950-51038)

---

### 2. Buddy Modal Overflow ⚠️
**Priority:** MEDIUM

**Problem:** Modal overflows screen on desktop

**Last Fix:** Commit 71907aa5 (flexbox layout)  
**User Says:** Still broken

**Next Steps:**
1. Get screenshot
2. Test on desktop
3. Consider z-index reduction (currently 99999)

**File:** public/golf-buddies-system.js

---

### 3. Missing Notification Preferences
**Priority:** HIGH

**Problem:** 989 of 1000 users have NO notification preferences

**Impact:** Only 1.1% of users can receive platform announcements

**Next Steps:**
1. Create migration for 989 users
2. Update settings UI to save to notification_preferences table
3. Remove boolean from profile_data

---

## Database State

### notification_preferences
- 11 users with preferences (1.1%)
- 989 users without (98.9%)
- Default = opted out

### scorecards  
- is_live_spectatable column exists
- status: 'in_progress' or 'completed'
- group_id groups players
- Current active rounds: 0

### society_handicaps
- Bubba: Universal 10.4 ✅, Travellers Rest NONE ❌
- Travellers Rest +1.6: Belongs to 4 other players

---

## Git History

### Active Commits
```
71907aa5  Buddy modal flexbox fix
10879ad8  Platform announcements preference filtering ✅
572970b3  Live rounds counter badge ✅
```

### Reverted
```
4e8a54c0  Debug logging (broke queries)
f2df73a0  Buddy modal z-index fix (broke queries)
```

---

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| public/index.html | +102, -10 | Live rounds badge system |
| supabase/.../line-push-notification/index.ts | +31, -1 | Preference filtering |
| public/golf-buddies-system.js | +5, -2 | Modal flexbox |
| public/sw.js | version bumps | v98→v99 |

---

## Production URLs

- **Main:** https://mycaddipro.com
- **Vercel:** https://mcipro-golf-platform-1l5mkznlt-mcipros-projects.vercel.app
- **Supabase:** https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs
- **GitHub:** https://github.com/pgatour29-pro/mcipro-golf-platform

---

## Next Session Priorities

### High Priority
1. Fix handicap dropdown bug (re-add debug logging carefully)
2. Verify buddy modal fix (get screenshot, test)
3. Migrate notification preferences (989 users need backfill)

### Medium Priority
4. Add notification filtering to society announcements and event updates
5. Set up staging environment

### Low Priority
6. Live Scorecard UI revamp (postponed until failure understood)
7. Add production monitoring

---

## Statistics

- **Deployments:** 6 (4 successful, 2 reverted)
- **Net Code Change:** +165 lines
- **Files Modified:** 4
- **Features Deployed:** 2
- **Outstanding Issues:** 3
- **Production Status:** ✅ STABLE

---

**Session End:** January 15, 2026  
**Final Commit:** 572970b3
