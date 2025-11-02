# Deploy Now - Both Fixes Ready

## ✅ Both Fires Extinguished

### 1. ✅ Parse Error FIXED
**File:** `public/chat/chat-system-full.js` (lines 404, 1128)

**Problem:** Comments merged with code statements
```javascript
// BAD (was causing parse error)
// Comment text    return (data || [])

// FIXED
// Comment text
return (data || [])
```

**Result:** No more "Invalid left-hand side in assignment" error

---

### 2. ✅ "Not authenticated" FIXED
**Files:**
- `supabase/functions/event-register/index.ts` (Edge Function)
- `public/index.html` (client sends id_token)

**How it works:**
1. LINE OAuth stores `id_token` in sessionStorage
2. Client sends `id_token` to Edge Function (not client-chosen profileId)
3. Edge Function validates `id_token` (audience + subject)
4. Edge Function maps LINE user ID → UUID via profiles table
5. Edge Function uses service-role to bypass RLS and insert

**Security:** Client can't spoof identity - server validates token

---

## 🚀 Deployment Steps (IN ORDER!)

### Step 1: Deploy Edge Function

```bash
cd C:\Users\pete\Documents\MciPro

# Deploy the function
supabase functions deploy event-register
```

**Verify deployment:**
```bash
supabase functions list
# Should show: event-register (version 1 or higher)
```

---

### Step 2: Clear Browser Cache

**OPTION A: Incognito (FASTEST)**
1. Close ALL regular browser windows
2. Open NEW incognito window (Ctrl+Shift+N)
3. Go to: `https://mycaddipro.com/`
4. Check console: `[ServiceWorker] Loaded - Version: 2025-11-02T22:15:00Z`

**OPTION B: Force Update URL**
1. Go to: `https://mycaddipro.com/?forceUpdate=1`
2. Wait 2 seconds for automatic reload
3. Check console: `[ServiceWorker] Loaded - Version: 2025-11-02T22:15:00Z`

**OPTION C: Manual Unregister**
1. F12 → Application → Service Workers → Unregister all
2. Close ALL tabs
3. Close browser completely
4. Reopen → Navigate to mycaddipro.com
5. Check console: `[ServiceWorker] Loaded - Version: 2025-11-02T22:15:00Z`

---

### Step 3: Test Event Registration

1. **Log in with LINE**
2. **Navigate to Society Events tab**
3. **Select an event**
4. **Click "Register"**
5. **Check DevTools:**
   - Network tab: `POST /functions/v1/event-register` → **201 Created**
   - Console: `[SocietyGolf] Using LINE id_token for authentication`
   - Console: `[SocietyGolf] ✅ Registration successful:`

---

## ✅ Success Criteria

### Console (BEFORE DOMContentLoaded):
- ✅ `[ServiceWorker] Loaded - Version: 2025-11-02T22:15:00Z`
- ❌ NO "Uncaught SyntaxError: Invalid left-hand side in assignment"
- ❌ NO "chat-system-full.js:931 Uncaught"
- ❌ NO red errors

### Network Tab:
- ❌ NO `organizer_id=eq.Utrgg...` (LINE ID format)
- ❌ NO `order=completed_at.desc` 400 errors
- ✅ `POST /functions/v1/event-register` → **201 Created**

### Event Registration:
- ✅ Request payload contains `id_token` (not profileId)
- ✅ Response: `{"ok":true,"id":"...","message":"Successfully registered..."}`
- ✅ Database row has UUIDs in both `event_id` and `user_id`
- ✅ `payment_status = 'pending'`
- ❌ NO "Not authenticated - please log in"

---

## 🔧 Troubleshooting

### "Function not found" (404)
**Problem:** Edge Function not deployed yet

**Fix:**
```bash
supabase functions deploy event-register
```

---

### Still seeing old service worker version
**Problem:** Cache clear didn't work

**Fix:** Use incognito mode (guaranteed fresh cache):
1. Close ALL regular windows
2. Ctrl+Shift+N (new incognito window)
3. Navigate to mycaddipro.com
4. Should load SW 2025-11-02T22:15:00Z

---

### "Invalid id_token" error
**Problem:** id_token expired or missing

**Fix:** Log out and log back in with LINE:
1. Clear sessionStorage: `sessionStorage.clear()`
2. Reload page
3. Log in with LINE again
4. Try registration again

---

### Still getting parse error
**Problem:** Browser still loading old cached file

**Steps to verify:**
1. F12 → Sources → `chat-system-full.js`
2. Check line 404 - should be properly formatted
3. If still broken, try Ctrl+F5 (hard refresh)
4. If STILL broken, use incognito mode

---

## 📊 What's Fixed

| Issue | Before | After |
|-------|--------|-------|
| **Parse error** | Comments merged with code | ✅ Properly formatted |
| **Auth error** | Client sends profileId, RLS blocks | ✅ Server validates id_token, bypasses RLS |
| **UUID type** | Client could send LINE ID | ✅ Server maps LINE → UUID |
| **Security** | Client controls identity | ✅ Server validates token |
| **Duplicates** | Could register twice | ✅ Server checks before insert |

---

## 📝 Files Changed

**Fixed:**
- `public/chat/chat-system-full.js` - Parse error fix
- `public/index.html` - Store and send id_token
- `public/sw.js` - Version 2025-11-02T22:15:00Z
- `supabase/functions/event-register/index.ts` - id_token validation

**Commits:**
- 8790bf2c - Parse error + id_token auth

---

## 🎯 Quick Test Command

After deployment and cache clear, run in console:

```javascript
// Check SW version
navigator.serviceWorker.getRegistrations()
  .then(r => console.log('SW version:', r[0]?.active?.scriptURL));
// Should show: ...sw.js (with 2025-11-02T22:15:00Z inside)

// Check id_token is stored
console.log('id_token:', sessionStorage.getItem('__line_id_token') ? 'PRESENT' : 'MISSING');
// Should show: id_token: PRESENT
```

---

## 🚨 Critical Note

**Deploy Edge Function FIRST, then clear cache.**

If you clear cache first, event registration will fail with 404 until Edge Function is deployed.

**Correct order:**
1. ✅ Deploy Edge Function
2. ✅ Clear cache
3. ✅ Test registration

---

**Last Updated:** 2025-11-02T22:15:00Z
**Commit:** 8790bf2c
**Status:** ✅ Ready to deploy and test!
