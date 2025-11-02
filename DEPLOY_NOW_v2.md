# Deploy Now v2 - Found the Real Problem

## 🎯 The Real Issue

The error was coming from **`society-golf-system.js`** line 230-250, NOT index.html!

The `registerPlayer()` function in this file was trying to do a direct insert to `event_registrations`, which failed because LINE OAuth users don't have Supabase Auth sessions (RLS blocks).

## ✅ What I Fixed

**File:** `public/society-golf-system.js`

**Before (lines 230-250):**
```javascript
async registerPlayer(eventId, playerData) {
    await this.waitForSupabase();
    const { data, error } = await SupabaseManager.client
        .from('event_registrations')
        .insert([{
            event_id: eventId,
            player_name: playerData.name,
            player_id: playerData.playerId,
            want_transport: playerData.wantTransport || false,
            want_competition: playerData.wantCompetition || false
        }])
        .select()
        .single();

    if (error) {
        console.error('[SocietyGolf] Error registering player:', error);
        throw error;
    }

    return data;
}
```

**After (using Edge Function):**
```javascript
async registerPlayer(eventId, playerData) {
    await this.waitForSupabase();

    // Get LINE id_token for secure authentication
    const id_token = sessionStorage.getItem('__line_id_token');
    if (!id_token) {
        throw new Error('Not authenticated - please log in with LINE');
    }

    console.log('[SocietyGolf] Using LINE id_token for authentication');

    // Use Edge Function to bypass RLS (validates id_token server-side)
    const response = await fetch('https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/event-register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            id_token: id_token,
            event_id: eventId,
            want_transport: playerData.wantTransport || false,
            want_competition: playerData.wantCompetition || false,
            total_fee: playerData.totalFee || 0,
            payment_status: 'pending'
        })
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
        const error = new Error(result.error || 'Registration failed');
        console.error('[SocietyGolf] Error registering player:', error);
        throw error;
    }

    console.log('[SocietyGolf] ✅ Registration successful:', result);
    return result;
}
```

---

## 🚀 Deployment Steps

### Step 1: Verify Edge Function is Deployed ✅

```bash
cd C:\Users\pete\Documents\MciPro
npx supabase functions list --project-ref pyeeplwsnupmhgbguwqs
```

**Expected:** You should see `event-register` with STATUS: ACTIVE

**Already done** - Edge Function is deployed and active (VERSION 1)

---

### Step 2: Clear Browser Cache (REQUIRED!)

**The cache is still serving old code from `society-golf-system.js`**

#### Option A: Incognito Window (FASTEST & GUARANTEED)

1. Close ALL regular browser windows
2. Press `Ctrl+Shift+N` (new incognito window)
3. Navigate to: `https://mycaddipro.com/`
4. F12 → Console should show:
   ```
   [ServiceWorker] Loaded - Version: 2025-11-02T22:30:00Z
   ```
5. Log in with LINE
6. Test event registration

#### Option B: Force URL

1. Navigate to: `https://mycaddipro.com/?forceUpdate=1`
2. Wait 2 seconds for automatic reload
3. F12 → Console should show: `[ServiceWorker] Loaded - Version: 2025-11-02T22:30:00Z`
4. Test registration

#### Option C: Nuclear Cache Clear

Run this in DevTools Console:
```javascript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
    console.log('✅ All service workers unregistered');
});

// Clear all caches
caches.keys().then(keys => {
    keys.forEach(key => caches.delete(key));
    console.log('✅ All caches cleared');
});

// Clear storage
localStorage.clear();
sessionStorage.clear();
console.log('✅ Storage cleared');

// Reload after 1 second
setTimeout(() => {
    console.log('🔄 Reloading...');
    location.reload(true);
}, 1000);
```

---

### Step 3: Test Event Registration

1. **Log in with LINE**
2. **Navigate to Society Events tab**
3. **Select an event**
4. **Click "Register"**

**Expected Console Output:**
```
[SocietyGolf] Using LINE id_token for authentication
POST /functions/v1/event-register → 201 Created
[SocietyGolf] ✅ Registration successful: {...}
```

**Expected Network Tab:**
```
Request:
POST https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/event-register
{
  "id_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "event_id": "uuid-here",
  "want_transport": false,
  "want_competition": false,
  "total_fee": 0,
  "payment_status": "pending"
}

Response: 201 Created
{
  "ok": true,
  "id": "registration-uuid",
  "created_at": "2025-11-02T...",
  "message": "Successfully registered Pete for Event Name"
}
```

---

## ✅ Success Criteria

### Console Logs:
- ✅ `[ServiceWorker] Loaded - Version: 2025-11-02T22:30:00Z`
- ✅ `[SocietyGolf] Using LINE id_token for authentication`
- ✅ `[SocietyGolf] ✅ Registration successful:`
- ❌ NO "chat-system-full.js:931 Uncaught SyntaxError"
- ❌ NO "Not authenticated - please log in"

### Network Tab:
- ✅ `POST /functions/v1/event-register` → **201 Created**
- ❌ NO direct inserts to `/rest/v1/event_registrations`
- ❌ NO 400 errors

### Database:
- ✅ New row in `event_registrations` table
- ✅ `user_id` is UUID (not LINE ID)
- ✅ `event_id` is UUID
- ✅ `payment_status` = 'pending'

---

## 🔧 Troubleshooting

### Still seeing "Not authenticated" error

**Problem:** Old `society-golf-system.js` still cached

**Fix:** Use incognito mode (guaranteed fresh cache):
1. Close all browser windows
2. Ctrl+Shift+N (incognito)
3. Navigate to mycaddipro.com
4. Check SW version in console

---

### Still seeing parse error at chat-system-full.js:931

**Problem:** Old minified/cached version of chat file

**Fix:** The source file is correct. Cache issue. Use incognito mode.

---

### Edge Function returns 404

**Problem:** Function not deployed

**Fix:**
```bash
cd C:\Users\pete\Documents\MciPro
npx supabase functions deploy event-register --project-ref pyeeplwsnupmhgbguwqs
```

---

### "User profile not found" error

**Problem:** Profile doesn't exist in database for this LINE user

**Fix:** User needs to complete onboarding first (create profile)

---

### "Invalid id_token" error

**Problem:** Token expired or missing

**Fix:**
1. Log out
2. Clear sessionStorage: `sessionStorage.clear()`
3. Log in with LINE again
4. Try registration

---

## 📝 Files Changed

**This deployment:**
- `public/society-golf-system.js` (lines 230-267) - registerPlayer using Edge Function
- `public/sw.js` (line 4) - Version bump to 2025-11-02T22:30:00Z

**Previous fixes (already deployed):**
- `public/chat/chat-system-full.js` (lines 404, 1128) - Parse error fix
- `supabase/functions/event-register/index.ts` - Edge Function with id_token validation
- `public/index.html` (lines 7561, 32816) - Store and send id_token

---

## 🎯 Quick Test Command

After cache clear, run in console:

```javascript
// Check SW version
navigator.serviceWorker.getRegistrations()
  .then(r => console.log('SW active:', r[0]?.active !== null));

// Check id_token
console.log('id_token:', sessionStorage.getItem('__line_id_token') ? 'PRESENT' : 'MISSING');

// Check society-golf-system.js loaded
console.log('SocietyGolfDB:', window.SocietyGolfDB ? 'LOADED' : 'MISSING');
```

---

**Commit:** 764435ba
**Status:** ✅ Ready to test!
**Last Updated:** 2025-11-02T22:30:00Z
