# Session Catalog: 2026-01-25

## Summary
Handicap system review, "every 3 rounds" fix for universal handicaps, and player data cleanup.

---

## Task 1: Project Catchup

**Status:** Completed

Reviewed entire MciPro project state:
- Current version: v255
- Tech stack: React 19 + Vite, Supabase, Tailwind, Capacitor
- Recent fixes: Login (v253), AbortErrors (v251), Duplicate rounds (v249)

### Key Findings
- Handicap system 90% working (society handicaps correct, universal too aggressive)
- Promise.all() cascade bug documented but not fixed
- Clean git working tree

---

## Task 2: Handicap System Analysis

**Status:** Completed

### What's Working
| Component | Status |
|-----------|--------|
| Society handicaps (WHS 8/20) | ✅ Working |
| Multi-society tracking | ✅ Working |
| Auto-triggers on round complete | ✅ Working |
| society_handicaps table | ✅ Working |

### What Was NOT Working
| Component | Issue |
|-----------|-------|
| Universal handicaps | Updated on EVERY round instead of every 3 |
| `rounds_since_adjustment` | Column didn't exist |

---

## Task 3: "Every 3 Rounds" Fix for Universal Handicaps

**Status:** SQL Created, Needs Manual Deploy

### File Created
`sql/fix_universal_handicap_every_3_rounds.sql`

### Changes
1. Added `rounds_since_adjustment` column to `society_handicaps` table
2. Modified `auto_update_society_handicaps_on_round()` trigger:
   - Society rounds: Still update immediately (WHS 8/20) ✅
   - Private/non-society rounds: Increment counter, only recalculate at 3

### Behavior After Fix
```
Private Round 1 → counter = 1, no handicap change
Private Round 2 → counter = 2, no handicap change
Private Round 3 → counter = 3, HANDICAP RECALCULATED, counter resets to 0
```

### Deploy Instructions
1. Go to: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/sql/new
2. Copy contents of `sql/fix_universal_handicap_every_3_rounds.sql`
3. Click Run

### Git Commit
```
d5932a9c - Add every-3-rounds logic for universal handicaps
```

---

## Task 4: Check Alan Thomas, Ryan Thomas, Pluto

**Status:** Completed

### Scripts Created
- `scripts/check_alan_ryan_pluto.js` - Verify handicaps and find duplicates
- `scripts/delete_duplicates_now.js` - Delete duplicates via Supabase API
- `sql/delete_alan_pluto_duplicates_2026-01-25.sql` - SQL backup

### Handicap Verification

| Player | ID | Profile | Universal | TRGG |
|--------|-----|---------|-----------|------|
| Alan Thomas | U214f2fe47e1681fbb26f0aba95930d64 | 8.5 | 8.5 | 8.5 |
| Ryan Thomas | TRGG-GUEST-1002 | 0 | 0 | +1.6 |
| Pluto | MANUAL-1768008205248-jvtubbk | 0 | 0 | +1.6 |

**Result:** All handicaps correct ✅

### Duplicates Found and Deleted

| Player | Date | Duplicates | Action |
|--------|------|------------|--------|
| Alan Thomas | 2025-12-14 | 5 extra rounds | Deleted, kept BRC (76) |
| Pluto | 2026-01-13 | 1 extra round | Deleted, kept Green Valley (65) |

**Total deleted:** 6 duplicate rounds

### Deleted Round IDs
```
df939097-b347-4a9e-a3a6-c813ebc7cfd5  -- Alan, Mountain Shadow, 87
07b76190-7f95-44d9-baa2-c5f92789933a  -- Alan, BRC, 79
66118e91-2c17-4890-80da-505fda24185c  -- Alan, Eastern Star, 86
6f4e47ac-1ea0-4975-9aca-55d24e385449  -- Alan, Treasure Hill, 84
4f1fab12-d3eb-4b65-a549-3c70ef6f881a  -- Alan, Greenwood, 86
2dadc418-c1d1-4d98-ab8d-6e99d0d5ce49  -- Pluto, Green Valley, 7
```

### Round Counts After Cleanup
| Player | Before | After |
|--------|--------|-------|
| Alan Thomas | 17 | 12 |
| Ryan Thomas | 3 | 3 |
| Pluto | 4 | 3 |

### Git Commit
```
16f6fdd4 - Add scripts to check and clean up player duplicates
```

---

## Files Changed This Session

### New Files
| File | Purpose |
|------|---------|
| `sql/fix_universal_handicap_every_3_rounds.sql` | Every 3 rounds logic |
| `scripts/check_alan_ryan_pluto.js` | Player verification script |
| `scripts/delete_duplicates_now.js` | Duplicate deletion script |
| `sql/delete_alan_pluto_duplicates_2026-01-25.sql` | SQL backup |
| `compacted/00_SESSION_2026-01-25_HANDICAP_AND_CLEANUP.md` | This catalog |

### Database Changes
| Table | Change |
|-------|--------|
| `rounds` | Deleted 6 duplicate rounds |
| `society_handicaps` | (Pending) Add `rounds_since_adjustment` column |

---

## Pending Actions

### 1. Deploy "Every 3 Rounds" SQL
**Priority:** High
**Action:** Run `sql/fix_universal_handicap_every_3_rounds.sql` in Supabase dashboard

### 2. Promise.allSettled Fix
**Priority:** Medium
**File:** `public/index.html` lines 47704-47767
**Issue:** `getAllPublicEvents()` uses `Promise.all()` - if one query fails, all fail
**Fix:** Replace with `Promise.allSettled()`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v255 | 2026-01-24 | Handicap 0 showing as 36 fix |
| v254 | 2026-01-24 | Modal close button fix |
| v253 | 2026-01-24 | Login fix - immediate session restore |

---

## Key Player IDs Reference

| Player | Line User ID |
|--------|--------------|
| Pete | U2b6d976f19bca4b2f4374ae0e10ed873 |
| Alan Thomas | U214f2fe47e1681fbb26f0aba95930d64 |
| Ryan Thomas | TRGG-GUEST-1002 |
| Pluto | MANUAL-1768008205248-jvtubbk |

## Society IDs Reference

| Society | ID |
|---------|-----|
| TRGG | 7c0e4b72-d925-44bc-afda-38259a7ba346 |

---

## Supabase Project

- **Project:** pyeeplwsnupmhgbguwqs
- **Region:** Southeast Asia (Singapore)
- **Dashboard:** https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs
- **SQL Editor:** https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/sql/new
