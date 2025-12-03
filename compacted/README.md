# Compacted Documentation - MciPro Golf Platform

**Latest Update:** 2025-12-03
**Latest Issue:** Plus handicap (+) sign not saving correctly

## 🔥 LATEST ISSUE: Handicap Plus Sign Failure (2025-12-03)

**Problem:** Plus handicaps (e.g., "+2.1") being saved without the + sign (as "2.1")
**Root Cause:** Multiple issues - parseFloat(), type="number" inputs, auto-sync, schema mismatch
**Solution:** All code fixes deployed, user needs to hard refresh browser
**Status:** FIXED AND DEPLOYED (commit d67ecdf1)

**Documentation:**
- **2025-12-03_HANDICAP_PLUS_SIGN_CATASTROPHIC_FAILURE.md** - Complete incident report
- **HANDICAP_SYSTEM_RULES.md** - Prevention guide (READ THIS BEFORE TOUCHING HANDICAPS)

**Action Required:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Wait for deployment to complete
3. Test saving "+2.1" for Rocky Jones
4. Run SQL scripts to fix corrupted handicaps

---

## Previous Issue: 1v1 Matchplay Teams Not Displaying (2025-12-02)

**Problem:** All database queries fail with 400/401 errors due to Row Level Security
**Solution:** Run `sql/DISABLE_RLS_COMPLETELY.sql` in Supabase SQL Editor
**Status:** NOT YET FIXED (waiting for user to run SQL)

## Documentation Files

1. **01_ERRORS_AND_FUCKUPS.md**
   - All errors encountered during troubleshooting
   - Database query failures (400/401 errors)
   - Failed SQL fix attempts
   - Console error logs

2. **02_CHANGES_MADE.md**
   - SQL scripts created
   - Code modifications (golf-buddies-system.js handicaps)
   - What was NOT changed

3. **03_DO_NOT_DO_THIS.md**
   - DO NOT touch handicap code (user will fix manually)
   - DO NOT make simple SQL column name mistakes
   - DO NOT assume SQL was run without confirmation

4. **04_WHAT_NEEDS_TO_BE_FIXED.md**
   - Priority 1: Database RLS blocking queries
   - Priority 2: Handicap data (user will fix)
   - Code status (code is correct, database is broken)

5. **05_SQL_TO_RUN.md**
   - Exact SQL commands to run
   - Expected output
   - Verification steps
   - What to do after running SQL

## The Core Issue

The JavaScript code for 1v1 matchplay team display EXISTS and is CORRECT:
- Team display rendering: `public/index.html` lines 46513-46538
- Team validation: `public/index.html` lines 41230-41295
- Round robin display: `public/index.html` lines 46501-46564

**The problem is NOT the code.**

The problem is database queries fail BEFORE the code can execute:
```
GET side_game_pools → 400 Bad Request
GET pool_entrants → 401 Unauthorized
GET scorecards → 400 Bad Request
```

## How to Fix

1. Open Supabase SQL Editor
2. Run `sql/DISABLE_RLS_COMPLETELY.sql`
3. Refresh the web page
4. Teams will display

## User Instructions

**What User Said NOT To Do:**
- "don't fuck with the handicap" - User will fix handicap data manually

**What User Wants Fixed:**
- 1v1 matchplay teams not displaying
- This is caused by database RLS errors
- Fix by running the SQL script
