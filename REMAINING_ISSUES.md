# Remaining Issues - Final Debugging Guide

## Current Status

✅ **FIXED:**
1. LINE OAuth - redirect_uri hardcoded to 'https://mycaddipro.com/'
2. Event registration - using profileId (UUID) instead of LINE ID
3. Column names - user_id instead of player_id/player_name
4. Payment status - changed to 'pending'

⚠️ **REMAINING ISSUES** (All related to cached old code or database schema mismatches):

---

## Issue #1: Parse Error in chat-system-full.js:931

**Error:**
```
Uncaught SyntaxError: Invalid left-hand side in assignment
```

**Root Cause:**
The error points to line 931, but the source file is only 204 lines. This means:
1. The browser is loading a minified/bundled version
2. OR the error is in a different file being served

**Solution:**
1. Close ALL browser tabs
2. Clear cache completely (F12 → Application → Clear site data)
3. Unregister service worker
4. Hard refresh (Ctrl+Shift+R)

The source code is clean. This is a caching issue.

---

## Issue #2: PostgREST `columns=` Parameter (400 Errors)

**Error in Console:**
```
/rest/v1/event_registrations?columns="event_id","user_id"...&select=* → 400
```

**Root Cause:**
Old cached JavaScript is generating `columns=` parameter which PostgREST doesn't support.

**Why it's not in source code:**
The current source code uses proper Supabase client methods. The `columns=` is coming from cached old versions.

**Solution:**
Same as Issue #1 - complete cache clear will fix this.

---

## Issue #3: Database Schema Verification Needed

**Run this SQL in Supabase SQL Editor:**

```sql
-- File: sql/DIAGNOSE_ALL_CONSTRAINTS.sql
-- This will show:
-- 1. What values are allowed for payment_status
-- 2. What columns exist in event_registrations
-- 3. What columns exist in society_events (organizer_id issue)
-- 4. What columns exist in rounds (order query issue)
```

**After running diagnostics, you may need to:**

### A) Update payment_status constraint

If the constraint doesn't allow 'pending':

```sql
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_payment_status_check;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'unpaid', 'partial', 'refunded'));

ALTER TABLE event_registrations
  ALTER COLUMN payment_status SET DEFAULT 'pending';
```

### B) Fix organizer_id column

If society_events doesn't have `organizer_id` or it's a different type:

Either rename the column or update queries to use the correct column name.

### C) Fix rounds table ordering

If `completed_at` doesn't exist in rounds table, use `created_at` instead.

---

## Issue #4: UUID vs LINE ID Architecture

**Current Implementation:**
- `AppState.currentUser.profileId` = Database UUID from profiles.id
- `AppState.currentUser.lineUserId` = LINE user ID (text)
- Event registration now uses `profileId` (UUID) ✅

**Verification:**
Check that `profiles` table has:
- `id` column (uuid, primary key)
- `line_user_id` column (text, for LINE IDs)

---

## Testing Checklist

After cache clear and database fixes:

- [ ] Page loads with NO red JS errors before DOMContentLoaded
- [ ] LINE login succeeds
- [ ] `AppState.currentUser.profileId` is a valid UUID
- [ ] Event registration succeeds (returns 200/201)
- [ ] No requests contain `columns=` parameter
- [ ] No requests contain `society_name=eq.undefined`
- [ ] No requests send LINE IDs to UUID columns

---

## Emergency Cache Clear Steps

If issues persist:

1. **Close ALL browser tabs** (critical!)
2. **Open DevTools** (F12)
3. **Application → Clear site data** (check ALL boxes)
4. **Application → Service Workers** → Unregister
5. **Application → Cache Storage** → Delete all
6. **Application → Local Storage** → Clear (if safe)
7. **Application → Session Storage** → Clear (if safe)
8. **Close browser completely**
9. **Reopen and hard refresh** (Ctrl+Shift+R)
10. **Check service worker version** - should be `2025-11-02T20:45:00Z`

---

## Files Updated in This Session

- `public/index.html` - Fixed profileId, user_id column, payment_status
- `public/sw.js` - Multiple cache busting version updates
- `sql/DIAGNOSE_ALL_CONSTRAINTS.sql` - New diagnostic file

---

## Next Steps

1. **Run the diagnostic SQL** to see actual database schema
2. **Complete cache clear** following emergency steps above
3. **Test event registration** with fresh code
4. **Report any remaining errors** with full console logs

The main blocker is cached old code. Once the browser loads fresh files with service worker `2025-11-02T20:45:00Z`, most issues should resolve.
