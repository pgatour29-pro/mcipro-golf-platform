# Notification System Sanity Check

**Date:** December 21, 2025
**Issue:** Some users not receiving LINE notifications for events and messages

---

## Issues Found & Fixed

### Issue 1: handleDirectMessage Not Falling Back (FIXED)

**Location:** `supabase/functions/line-push-notification/index.ts`

**Problem:**
```javascript
if (!recipient?.messaging_user_id) {
    console.log("[LINE Push] Recipient has no messaging_user_id:", recipientId);
    return { success: true, notified: 0, reason: "no_messaging_id" };  // EXIT WITHOUT FALLBACK!
}
```

**Impact:** Users without `messaging_user_id` in their profile were silently skipped for ALL direct messages.

**Fix:** Now falls back to `line_user_id`:
```javascript
const targetId = recipient?.messaging_user_id || recipientId;
```

---

### Issue 2: handleEventUpdate Multiple Problems (FIXED)

**Problems:**
1. Only notified registrations with `status = 'confirmed'` - too restrictive
2. No `messaging_user_id` lookup - used `player_id` directly (inconsistent)
3. No fallback for users without `user_profiles` rows

**Fix:**
- Removed status filter - now notifies ALL registrations
- Added `messaging_user_id` lookup from `user_profiles`
- Added fallback for users without profiles

---

### Issue 3: handleNewEvent Missing Fallback (FIXED)

**Problem:** Users with valid LINE IDs but no `user_profiles` row were silently dropped.

**Fix:** Added fallback to include LINE IDs without profiles:
```javascript
const profileLineIds = new Set(profiles.map(p => p.line_user_id));
const missingIds = golferIds.filter(id => !profileLineIds.has(id));
const lineUserIds = [...new Set([...messagingUserIds, ...missingIds])];
```

---

### Issue 4: system_alert Type Not Handled (FIXED EARLIER)

**Problem:** Frontend was sending `type: 'system_alert'` but edge function didn't handle it, returning 400 error.

**Fix:** Added `handleSystemAlert` function.

---

## Remaining Issues (Not Code Bugs)

### Issue 5: Guest Users Have Invalid LINE IDs

**Observation from database:**
```
line_user_id = "TRGG-GUEST-0001"  // Not a real LINE ID
line_user_id = "MANUAL-1764853842956-zp8kcj6"  // Not a real LINE ID
```

**Impact:** These users CAN NEVER receive LINE notifications because they didn't login via LINE.

**Who is affected:** All manually-added guest players.

**Solution:** These users need to login via LINE to get a valid LINE user ID.

---

### Issue 6: messaging_user_id vs line_user_id Mismatch

**Observation:**
```
Pete Park:
  line_user_id:      U2b6d976f19bca4b2f4374ae0e10ed873
  messaging_user_id: U3a1e201b64695f2bde2e72d97e8adc61  (DIFFERENT!)
```

**Explanation:**
- `line_user_id` = LIFF login context ID
- `messaging_user_id` = LINE Messaging API ID

These can be different depending on LINE channel configuration.

**Current behavior:** Code prefers `messaging_user_id` and falls back to `line_user_id`.

---

### Issue 7: Many Users Missing messaging_user_id

**Observation:**
```
Rocky Jones:  messaging_user_id = null
Willy Gourdin: messaging_user_id = null
Alex: messaging_user_id = null
강 동주: messaging_user_id = null
```

**Impact:** These users rely on `line_user_id` fallback. If `line_user_id` is a LIFF ID that's different from their Messaging API ID, notifications may fail silently at the LINE API level.

**Solution:** When users login and interact with LINE bot, capture their Messaging API user ID and store it in `messaging_user_id`.

---

## Summary of Fixes Deployed

| Handler | Issue | Status |
|---------|-------|--------|
| `handleDirectMessage` | No fallback when messaging_user_id null | FIXED |
| `handleEventUpdate` | status='confirmed' filter too strict | FIXED |
| `handleEventUpdate` | No messaging_user_id lookup | FIXED |
| `handleEventUpdate` | No fallback for users without profiles | FIXED |
| `handleNewEvent` | No fallback for users without profiles | FIXED |
| `handleSystemAlert` | Handler didn't exist | FIXED (earlier) |

---

## Testing Checklist

After fixes deployed:

- [ ] Send a direct message to a user - should receive LINE notification
- [ ] Create a new event - society members should receive notification
- [ ] Edit an event (change date/venue) - registered players should receive notification
- [ ] Delete an event - registered players should receive cancellation notice
- [ ] Check edge function logs in Supabase for detailed debug output

---

## How to Debug Notifications

1. Check Supabase Edge Function logs:
   - Dashboard > Functions > line-push-notification > Logs

2. Look for these log messages:
   - `[LINE Push] System alert to: Uxxxx` - recipient ID
   - `[LINE Push] Target ID: Uxxxx` - actual send target
   - `[LINE Push] ✅ Success for Uxxxx` - successful send
   - `[LINE Push] API Error for Uxxxx` - failed send with reason

3. Common failure reasons:
   - `not_line_user` - recipient_id doesn't start with 'U'
   - `invalid_line_id` - wrong format (not U + 32 hex chars)
   - `no_valid_target` - couldn't find valid messaging ID
   - `opted_out` - user disabled notifications
