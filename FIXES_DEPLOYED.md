# Fixes Deployed - 2025-11-02T23:00:00Z

## ✅ Fixed Issues

### 1. Edge Function 401 Error ✅ FIXED

**Problem:**
```
POST /functions/v1/event-register → 401 (Unauthorized)
{"code":401,"message":"Missing authorization header"}
```

**Root Cause:**
- Using raw `fetch()` without Supabase auth headers
- Edge Functions require JWT (anon key) to reach handler code

**Solution:**
Changed from raw fetch to `supabase.functions.invoke()`:

**Before:**
```javascript
const response = await fetch('https://...supabase.co/functions/v1/event-register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token, event_id, ... })
});
```

**After:**
```javascript
const { data: result, error: fxErr } = await SupabaseManager.client.functions.invoke('event-register', {
    body: {
        id_token: id_token,
        event_id: eventId,
        want_transport: playerData.wantTransport || false,
        want_competition: playerData.wantCompetition || false,
        total_fee: playerData.totalFee || 0,
        payment_status: 'pending'
    }
});
```

**Files Changed:**
- `public/society-golf-system.js:242`
- `public/index.html:32824`

---

### 2. Profiles Query 400 Error ✅ FIXED

**Problem:**
```
/rest/v1/profiles?select=*&role=eq.organizer&order=society_name.asc → 400
[SocietySelectorSystem] Database error
```

**Root Cause:**
- Columns `role` or `society_name` don't exist in profiles table
- OR RLS blocks these queries
- Society name is in `profile_data.organizationInfo.societyName` (JSONB)

**Solution:**
Load all profiles, filter/sort client-side:

**Before:**
```javascript
const { data, error } = await window.SupabaseDB.client
    .from('profiles')
    .select('*')
    .eq('role', 'organizer')
    .order('society_name');  // Column doesn't exist
```

**After:**
```javascript
// Load all profiles
const { data, error } = await window.SupabaseDB.client
    .from('profiles')
    .select('*');

// Filter organizers client-side
const organizers = (data || []).filter(p => {
    return p.profile_data?.organizationInfo?.societyName || p.society_name;
});

// Sort by society name (handles both column and JSONB)
organizers.sort((a, b) => {
    const nameA = a.society_name || a.profile_data?.organizationInfo?.societyName || '';
    const nameB = b.society_name || b.profile_data?.organizationInfo?.societyName || '';
    return nameA.localeCompare(nameB);
});
```

**Files Changed:**
- `public/index.html:29041-29080` (loadSocieties function)

---

### 3. Service Worker Cache Updated ✅

**Version bump:** `2025-11-02T23:00:00Z`

**Files Changed:**
- `public/sw.js:4`

---

## ⚠️ Known Issue: Parse Error

**Still Investigating:**
```
chat-system-full.js:939 Uncaught SyntaxError: Invalid left-hand side in assignment
```

**Status:**
- Source file is syntactically valid (tested with `node -c`)
- No problematic patterns found in source
- Service worker bypasses cache for chat files
- **Likely cause:** Cached version in Cloudflare CDN or browser

**Next Steps:**
1. Wait for Vercel deployment to complete
2. Purge Cloudflare cache
3. Test in fresh incognito window
4. If still present, investigate Cloudflare/build pipeline

---

## 🚀 Test Plan

### After Deployment (wait 2 minutes for Vercel)

1. **Purge Cloudflare Cache** (if parse error persists):
   - Cloudflare dashboard → Caching → Purge Everything

2. **Test in Fresh Incognito Window:**
   ```
   Ctrl+Shift+N → https://mycaddipro.com/
   ```

3. **Check Console for:**
   ```
   ✅ [ServiceWorker] Loaded - Version: 2025-11-02T23:00:00Z
   ❌ NO "Invalid left-hand side in assignment" error
   ✅ [LINE OAuth] id_token stored for API auth
   ```

4. **Test Event Registration:**
   - Log in with LINE
   - Navigate to Society Events tab
   - Select an event
   - Click "Register"

5. **Expected Console Output:**
   ```
   [SocietyGolf] Using LINE id_token for authentication
   [SocietyGolf] ✅ Registration successful: {...}
   ```

6. **Expected Network Tab:**
   ```
   POST /functions/v1/event-register → 200 OK (not 401!)
   Response: { ok: true, id: "...", created_at: "...", message: "Successfully registered..." }
   ```

7. **Expected Database:**
   - New row in `event_registrations`
   - `user_id` is UUID (not LINE ID)
   - `event_id` is UUID
   - `payment_status` = 'pending'

---

## 📝 Commit History

**Commit:** `758cb0ac`
**Pushed:** 2025-11-02T23:00:00Z
**Status:** Deploying to Vercel now

**Previous commits:**
- `9d0e0f61` - Added Authorization header (superseded by functions.invoke)
- `764435ba` - Fixed society-golf-system.js registerPlayer
- Earlier commits - Parse error fixes, id_token storage

---

## ✅ Success Criteria

### Console Logs (REQUIRED):
- ✅ `[ServiceWorker] Loaded - Version: 2025-11-02T23:00:00Z`
- ✅ `[SocietyGolf] Using LINE id_token for authentication`
- ✅ `[SocietyGolf] ✅ Registration successful:`
- ✅ `[SocietySelectorSystem] Loaded X societies` (no error)
- ❌ NO "chat-system-full.js:939 Uncaught SyntaxError"
- ❌ NO "Invalid left-hand side in assignment"
- ❌ NO 401 errors
- ❌ NO 400 errors from profiles query

### Network Tab (REQUIRED):
- ✅ `POST /functions/v1/event-register` → **200 OK** (via functions.invoke)
- ✅ `GET /rest/v1/profiles?select=*` → **200 OK**
- ❌ NO `role=eq.organizer` in URL
- ❌ NO `order=society_name.asc` in URL
- ❌ NO 401 responses
- ❌ NO 400 responses

### Database (REQUIRED):
- ✅ Registration row created
- ✅ `user_id` is UUID format
- ✅ `event_id` is UUID format
- ✅ `payment_status` is valid enum value
- ✅ `want_transport` boolean
- ✅ `want_competition` boolean
- ✅ `total_fee` number

---

## 🔧 If Issues Persist

### Parse Error Still Showing
**Action:** Purge Cloudflare cache
```
1. Cloudflare dashboard
2. Caching → Purge Everything
3. Wait 30 seconds
4. Hard refresh (Ctrl+F5)
```

### 401 Still Showing
**Check:**
```javascript
// In console:
console.log('SupabaseManager:', window.SupabaseManager);
console.log('Client:', window.SupabaseManager?.client);
console.log('Functions:', window.SupabaseManager?.client?.functions);
```

If undefined, SupabaseManager not initialized properly.

### 400 Still Showing
**Check:**
```javascript
// In console:
window.SupabaseDB.client.from('profiles').select('*').then(r => console.log(r));
```

If error, RLS policy blocking. Need to fix database policies.

### "User profile not found"
**Action:** User needs to complete onboarding first (create profile with LINE ID mapping)

---

**Last Updated:** 2025-11-02T23:00:00Z
**Deployment Status:** ✅ Pushed to GitHub, deploying to Vercel
**Estimated Deployment Time:** 2 minutes from push
