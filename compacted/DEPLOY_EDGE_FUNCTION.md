# Deploy Edge Function - Event Registration Fix

## 🚨 Critical Deployment Steps

The event registration fix requires deploying a new Edge Function **before** cache clearing.

---

## 1. Deploy the Edge Function

```bash
cd C:\Users\pete\Documents\MciPro

# Deploy the function
supabase functions deploy event-register

# Verify deployment
supabase functions list
```

**Expected output:**
```
┌──────────────────────┬─────────┬──────────────────┐
│ NAME                 │ VERSION │ CREATED AT       │
├──────────────────────┼─────────┼──────────────────┤
│ event-register       │ 1       │ 2025-11-02...    │
│ line-oauth-exchange  │ ...     │ ...              │
│ ...                  │ ...     │ ...              │
└──────────────────────┴─────────┴──────────────────┘
```

---

## 2. Test the Edge Function

```bash
# Test with curl
curl -X POST https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/event-register \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "YOUR-PROFILE-UUID-HERE",
    "eventId": "YOUR-EVENT-UUID-HERE",
    "wantTransport": false,
    "wantCompetition": false,
    "totalFee": 1500,
    "paymentStatus": "pending"
  }'
```

**Expected success response:**
```json
{
  "ok": true,
  "id": "registration-uuid",
  "created_at": "2025-11-02T...",
  "message": "Successfully registered Pete Park for Event Name"
}
```

**Expected error responses:**

Missing fields:
```json
{
  "error": "Missing required fields: profileId and eventId"
}
```

Invalid UUID:
```json
{
  "error": "Invalid UUID format for profileId or eventId"
}
```

Profile not found:
```json
{
  "error": "Profile not found"
}
```

Already registered:
```json
{
  "error": "Already registered for this event"
}
```

---

## 3. Clear Browser Cache

**IMPORTANT:** Only do this AFTER the Edge Function is deployed!

1. Close ALL browser tabs for mycaddipro.com
2. Open ONE new tab to mycaddipro.com
3. Press F12 to open DevTools
4. Go to Application tab
5. Clear site data (check ALL boxes)
6. Service Workers → Unregister all
7. Close browser completely
8. Reopen → Hard refresh (Ctrl+Shift+R)
9. Verify console: `[ServiceWorker] Loaded - Version: 2025-11-02T21:45:00Z`

---

## 4. Test Event Registration

1. Log in with LINE
2. Navigate to Society Events
3. Select an event
4. Click "Register"
5. Check DevTools Network tab:
   - Should see: `POST /functions/v1/event-register`
   - Status: `201 Created`
   - Response: `{"ok":true,"id":"...","message":"Successfully registered..."}`
6. Check Console:
   - Should see: `[SocietyGolf] ✅ Registration successful:`
   - Should NOT see: "Not authenticated - please log in"

---

## 5. Verify Database

```sql
-- Check the registration was inserted
SELECT
  id,
  event_id,
  user_id,
  want_transport,
  want_competition,
  total_fee,
  payment_status,
  status,
  created_at
FROM event_registrations
ORDER BY created_at DESC
LIMIT 5;
```

**Verify:**
- ✅ `user_id` is a valid UUID (not LINE ID string)
- ✅ `event_id` is a valid UUID
- ✅ `payment_status` is 'pending'
- ✅ `status` is 'confirmed'

---

## 🔧 Troubleshooting

### Function deployment fails

```bash
# Check Supabase CLI is logged in
supabase login

# Check project is linked
supabase link

# Try deploying with verbose output
supabase functions deploy event-register --debug
```

### Function returns 500 error

Check function logs:
```bash
supabase functions logs event-register
```

Or in Supabase Dashboard:
1. Go to Edge Functions
2. Click on `event-register`
3. View Logs tab

Common issues:
- Missing environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- RLS policies blocking service role (shouldn't happen with service-role key)
- Invalid UUIDs in request

### Still getting "Not authenticated" error

This means the cached old code is still running:

1. Check service worker version in console
2. If not `2025-11-02T21:45:00Z`, cache clear didn't work
3. Try incognito/private window
4. Or manually delete cache:
   - Chrome: chrome://settings/clearBrowserData
   - Check "Cached images and files"
   - Time range: "All time"

### Registration succeeds but row has wrong data

Check the request payload in Network tab → event-register → Payload

Should be:
```json
{
  "profileId": "uuid-format",  // NOT LINE ID
  "eventId": "uuid-format",
  "wantTransport": boolean,
  "wantCompetition": boolean,
  "totalFee": number,
  "paymentStatus": "pending"
}
```

---

## 📊 Success Criteria

After deployment and cache clear:

- [ ] Edge Function deployed (`supabase functions list` shows it)
- [ ] Service Worker version: `2025-11-02T21:45:00Z`
- [ ] No red errors in console before DOMContentLoaded
- [ ] Event registration POST → 201 Created
- [ ] Database row inserted with UUIDs
- [ ] No "Not authenticated" error
- [ ] No parse error in chat-system-full.js
- [ ] No 400 errors on society_events or rounds queries

---

## 🎯 What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| **Auth error** | RLS blocks insert (no session) | Service role bypasses RLS ✅ |
| **UUID type** | Might send LINE ID | Validates UUID format ✅ |
| **Duplicate reg** | Could insert duplicates | Checks before insert ✅ |
| **Invalid status** | DB rejects invalid values | Validates allowed values ✅ |
| **Error messages** | Generic DB errors | Specific user-friendly errors ✅ |

---

**Last Updated:** 2025-11-02T21:45:00Z
**Commit:** e7d62011
**Status:** Ready to deploy
