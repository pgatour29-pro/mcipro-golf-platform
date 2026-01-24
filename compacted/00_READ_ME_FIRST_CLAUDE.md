# READ ME FIRST - EVERY NEW SESSION

**Date Updated:** 2026-01-24

---

## CRITICAL RULES - NEVER BREAK THESE

### Rule 1: SURGICAL CHANGES ONLY
- User directive: "always implement changes surgically and not to disrupt any other features, functions and data"
- MAX 50 lines per change
- ONE element at a time
- Test after EVERY change
- NEVER mass changes

### Rule 2: READ DOCUMENTATION BEFORE CODING
- Check `\compacted` folder FIRST for existing solutions
- The answer is probably already documented
- Don't reinvent the wheel

### Rule 3: ASK BEFORE ASSUMING
- If unclear, ASK the user
- Don't guess values (like handicap 4.2 vs 3.2)
- Don't assume what's correct

### Rule 4: ONE DEPLOYMENT
- Get it right the FIRST time
- Don't deploy broken code
- Test locally/mentally before deploying

---

## LOGIN FLOW - CRITICAL KNOWLEDGE (2026-01-24)

**NEVER wait for LIFF init to restore session!**

LIFF init can take 8+ seconds on external browsers. The correct flow:

1. Check `localStorage.getItem('line_user_id')` IMMEDIATELY
2. If found, query Supabase for profile (max 1.5s wait for Supabase ready)
3. If profile found, restore AppState and redirect to dashboard
4. Skip LIFF init entirely
5. Only fall back to LIFF if localStorage session restore fails

**Location:** Lines 13604-13690 in index.html

**Read:** `00_SESSION_2026-01-24_LOGIN_AND_FIXES.md`

---

## HANDICAP SYSTEM - 4 STORAGE LOCATIONS

**ALL 4 must be in sync:**
```
1. user_profiles.handicap_index (numeric column)
2. user_profiles.profile_data.handicap (string in JSON)
3. user_profiles.profile_data.golfInfo.handicap (string in JSON)
4. society_handicaps.handicap_index (universal where society_id IS NULL)
5. society_handicaps.handicap_index (society-specific)
```

**Read:** `session-catalog-2026-01-11-handicap-comprehensive-fix.md`

**Key IDs:**
- Pete Park: `U2b6d976f19bca4b2f4374ae0e10ed873`
- TRGG Society: `7c0e4b72-d925-44bc-afda-38259a7ba346`

---

## GIT RULES - PRODUCTION

- NEVER `git reset --hard` on production
- NEVER `git push --force` on production
- Use `git revert` for individual commits
- If something breaks, STOP and diagnose

---

## DEPLOYMENT FLOW

```bash
git add <files>
git commit -m "Description"
git push origin master
vercel --prod --yes
```

**Production URL:** https://mycaddipro.com

---

## WHEN SOMETHING BREAKS

1. STOP making changes
2. Check browser console for errors
3. Identify the SPECIFIC line causing the issue
4. Fix that ONE thing
5. Do NOT do mass reverts

---

## KEY DOCUMENTATION FILES

| File | Purpose |
|------|---------|
| `00_SESSION_2026-01-24_LOGIN_AND_FIXES.md` | Login fix, modal close, handicap SQL |
| `00_SESSION_FAILURES_2026-01-23.md` | 9 failed deployments catalog |
| `00_HANDICAP_ISSUE_INDEX.md` | Handicap issue master index |
| `HANDICAP_SYSTEM_RULES.md` | Rules for handicap code |
| `session-catalog-2026-01-11-handicap-comprehensive-fix.md` | Handicap fix patterns |
| `SESSION_FAILURE_2026-01-12.md` | ProShop disaster |
| `SESSION_FAILURE_2026-01-13_HANDICAP.md` | Handicap fix disaster |

---

## PREVIOUS DISASTERS - LEARN FROM THESE

### 2026-01-23: Login & Data Loading (9 failed deployments!)
- Society event deletion didn't work (RLS blocks DELETE)
- OAuth delays yo-yo'd between too long and too short
- Variable typo (`now` vs `cacheNow`) broke app
- Login debounce never reset
- Duplicate rounds posted 7+ times
- Handicaps stored in 4+ places, SQL updated wrong ones
- **Lesson:** Understand FULL data model, verify code matches comments

### 2026-01-24: Login Multiple Attempts
- Session restore waited for LIFF init (8 seconds!)
- Users clicking login multiple times during wait
- **Lesson:** Check localStorage IMMEDIATELY, skip LIFF if session found

### 2026-01-12: ProShop Redesign
- Made 700+ line changes at once
- Broke authentication
- Panic reverts made it worse
- **Lesson:** Small changes, test after each

### 2026-01-13: Handicap Fix
- Didn't read existing documentation
- Assumed wrong values
- Multiple failed deployments
- **Lesson:** Read docs first, ask for correct values

---

## BEFORE STARTING ANY TASK

1. Read this document
2. Check `\compacted` folder for related documentation
3. Understand the existing code/data structure
4. ASK if anything is unclear
5. Plan small, incremental changes
6. Test after each change

---

## SUPABASE CREDENTIALS

**Production:**
- URL: `https://pyeeplwsnupmhgbguwqs.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDM2NjksImV4cCI6MjA3NTQxOTY2OX0.KVQ6WvDKz9s77lxn3AhSA_YTMCN6rsht9kDkMIDhngk`

**DO NOT USE:** `bptodqfwmnbmprqqyrcc.supabase.co` (OLD/WRONG)

---

## SERVICE WORKER

File: `public/sw.js`
Current Version: Check `SW_VERSION` constant
Bump version to force cache clear after changes

---

**END OF READ ME FIRST**

*If you're Claude starting a new session, READ THIS ENTIRE DOCUMENT before doing anything.*
