# Session Catalog - January 24, 2026
## SW Versions: v252 → v254

---

## ISSUES ADDRESSED THIS SESSION

### 1. Login Requiring Multiple Attempts (FIXED - v253)
### 2. Data Not Loading After Login (FIXED - v253)
### 3. Scorecard Upload Modal No Close Button (FIXED - v254)
### 4. Handicap Fixes for Alan, Ryan, Pluto (SQL CREATED)

---

## FIX #1: Login Flow - Multiple Attempts Required

**Problem:**
- Browser closed and reopened
- Login takes 2-3 attempts to succeed
- Data doesn't load on first login
- Total of 4-5 logins needed to get working state

**Root Cause:**
Session restore was waiting for LIFF init (up to 8 seconds) before checking localStorage for `line_user_id`. During this wait:
1. User sees login screen
2. User clicks login (thinking it's stuck)
3. Multiple OAuth flows start racing

**Fix Applied (v253):**
Added IMMEDIATE session restore BEFORE LIFF init at line 13604-13690:

```javascript
// ============================================================
// CRITICAL FIX: IMMEDIATE session restore from localStorage
// This runs BEFORE LIFF init to avoid 8+ second wait
// ============================================================
let sessionRestoredImmediately = false;
const savedLineUserIdImmediate = localStorage.getItem('line_user_id');

if (savedLineUserIdImmediate && !oauthProcessed) {
    console.log('[INIT] 🚀 IMMEDIATE session restore - found line_user_id in localStorage');

    try {
        // Wait for Supabase (max 1.5 seconds)
        if (window.SupabaseDB) {
            let attempts = 0;
            while (!window.SupabaseDB.ready && attempts < 15) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
            }
        }

        if (window.SupabaseDB?.ready) {
            const { data: userProfile, error } = await window.SupabaseDB.client
                .from('user_profiles')
                .select('*')
                .eq('line_user_id', savedLineUserIdImmediate)
                .single();

            if (userProfile && !error) {
                sessionRestoredImmediately = true;
                // Restore AppState...
                // Redirect to dashboard...
                // Load data after 500ms...
            }
        }
    } catch (err) {
        console.warn('[INIT] Immediate session restore error:', err);
    }
}

// Skip LIFF if session was already restored
if (sessionRestoredImmediately || AppState.session?.isAuthenticated) {
    console.log('[INIT] Session already restored - skipping LIFF init');
} else if (typeof liff !== 'undefined' && !oauthProcessed) {
    // Original LIFF init block...
}
```

**Key Points:**
- Checks localStorage for `line_user_id` IMMEDIATELY on page load
- Waits max 1.5 seconds for Supabase to be ready
- If profile found, restores session and goes to dashboard
- Skips LIFF init entirely (saves 8+ seconds)
- Explicitly triggers data load after session restore

**Console Output When Working:**
```
[INIT] 🚀 IMMEDIATE session restore - found line_user_id in localStorage
[INIT] Supabase ready after X ms
[INIT] ✅ IMMEDIATE session restore SUCCESS for: Pete Park
[INIT] Session already restored - skipping LIFF init
[INIT] Loading data after immediate session restore...
```

---

## FIX #2: Scorecard Upload Modal - No Close Button

**Problem:**
Photo Score Modal (Round History → "From Photo" button) had no way to close except uploading an image or refreshing browser.

**Root Cause:**
- Close button existed but used `window.PhotoScoreMgr?.closeModal()`
- If PhotoScoreMgr wasn't ready, the optional chaining would just return undefined
- No Cancel button at bottom
- No backdrop click handler

**Fix Applied (v254):**

1. **X Button - Direct handler:**
```html
<button onclick="document.getElementById('photoScoreModal').style.display='none'; if(window.PhotoScoreMgr) window.PhotoScoreMgr.stopCamera();"
        class="text-white hover:text-gray-200 p-1 rounded-full hover:bg-white/20 transition-colors">
    <span class="material-symbols-outlined text-2xl">close</span>
</button>
```

2. **Backdrop click to close:**
```html
<div id="photoScoreModal" class="..."
     onclick="if(event.target === this) { document.getElementById('photoScoreModal').style.display='none'; if(window.PhotoScoreMgr) window.PhotoScoreMgr.stopCamera(); }">
```

3. **Cancel button at bottom of Step 1:**
```html
<div class="text-center mt-6 pt-4 border-t border-gray-200">
    <button onclick="document.getElementById('photoScoreModal').style.display='none'; if(window.PhotoScoreMgr) window.PhotoScoreMgr.stopCamera();"
            class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100">
        Cancel
    </button>
</div>
```

**Location:** Lines 44107-44165 in index.html

---

## FIX #3: Handicap Corrections (SQL - NOT YET RUN)

**Problem:**
Duplicate round saves on Jan 23 corrupted handicap calculations for golfers who played.

**Affected Players:**

| Name | LINE User ID | Wrong Value | Correct Universal | Correct TRGG |
|------|--------------|-------------|-------------------|--------------|
| Alan Thomas | U214f2fe47e1681fbb26f0aba95930d64 | 14.7 | 8.5 | 8.5 |
| Ryan Thomas | TRGG-GUEST-1002 | 3.6 | 0 | +1.6 |
| Pluto | MANUAL-1768008205248-jvtubbk | 4.8 | 0 | +1.6 |

**SQL File Created:** `sql/fix_alan_ryan_pluto_handicaps.sql`

**To Run:**
1. Go to https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/sql/new
2. Paste contents of the SQL file
3. Click Run

**SQL Summary:**
```sql
-- Delete existing records
DELETE FROM society_handicaps WHERE golfer_id IN (...);

-- Insert correct records
-- Alan Thomas: Universal 8.5, TRGG 8.5
-- Ryan Thomas: Universal 0, TRGG -1.6 (stored as negative for plus handicap)
-- Pluto: Universal 0, TRGG -1.6

-- Update user_profiles
UPDATE user_profiles SET handicap_index = X, profile_data = jsonb_set(...) WHERE line_user_id = '...';
```

---

## FILES MODIFIED THIS SESSION

### public/index.html
- Lines 13604-13690: Added immediate session restore before LIFF init
- Lines 44107-44165: Fixed Photo Score Modal close functionality

### public/sw.js
- v252 → v253 → v254

### sql/fix_alan_ryan_pluto_handicaps.sql (NEW)
- Complete SQL to fix handicaps for Alan, Ryan, Pluto

---

## DEPLOYMENT HISTORY

| Version | Changes | Status |
|---------|---------|--------|
| v253 | Immediate session restore before LIFF init | Deployed |
| v254 | Scorecard modal close button + handicap SQL | Deployed |

---

## REMAINING TASKS

### 1. Run Handicap Fix SQL
**File:** `sql/fix_alan_ryan_pluto_handicaps.sql`
**Action:** Run in Supabase SQL Editor

### 2. Run Pete's Handicap Fix SQL (from previous session)
**File:** `sql/fix_pete_handicap_complete.sql`
**Action:** Run in Supabase SQL Editor if not already done

### 3. Delete Society Events (if needed)
**File:** `sql/delete_society_events_admin.sql`
**Action:** Run in Supabase SQL Editor, then `SELECT admin_delete_society_events('2026-01-23');`

---

## PATTERNS LEARNED

### 1. Session Restore Timing
- Don't wait for LIFF init to check localStorage
- LIFF init can take 8+ seconds on external browsers
- Check localStorage immediately, restore session, THEN skip LIFF

### 2. Modal Close Buttons
- Never rely solely on optional chaining (`?.`) for critical UI functions
- Always have direct onclick handlers that work even if JS objects aren't ready
- Multiple close methods: X button, Cancel button, backdrop click

### 3. Handicap Storage
- Primary source: `society_handicaps` table
- Universal handicap: `society_id = NULL`
- Plus handicaps stored as NEGATIVE numbers (e.g., +1.6 = -1.6 in DB)
- UPDATE statements don't work if records don't exist - use DELETE + INSERT

---

## QUICK REFERENCE

### Test Login Fix
1. Close browser completely
2. Open browser, go to mycaddipro.com
3. Should reach dashboard on first attempt
4. Console should show "IMMEDIATE session restore SUCCESS"

### Test Modal Close
1. Go to Round History tab
2. Click "From Photo" button
3. Modal opens
4. Click X, Cancel, or backdrop to close

### Fix Handicaps
1. Go to Supabase SQL Editor
2. Run `sql/fix_alan_ryan_pluto_handicaps.sql`
3. Refresh app and verify

---

**Session Date:** 2026-01-24
**Total Deployments:** 2 (v253, v254)
