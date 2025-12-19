# Netlify Blobs Setup Guide

## 🚨 Root Cause Fixed

The 500 errors were caused by **Netlify Blobs not being configured**. The bookings function now uses a `makeStore()` helper that works in both scenarios:

1. ✅ **When Blobs is enabled in Netlify** (production, recommended)
2. ✅ **With manual credentials** (local development)

---

## Option A: Enable Blobs in Netlify (Recommended)

This is the **proper production setup** - no code changes or secrets needed.

### Steps:

1. Go to https://app.netlify.com/sites/mcipro-golf-platform/configuration/env
2. Navigate to **Storage & Databases** section
3. Click **Enable Blobs**
4. Redeploy (already done - function is live)

### Test:
- Open https://mcipro-golf-platform.netlify.app
- Create a booking, logout, login → booking should persist
- Check DevTools Network → `/.netlify/functions/bookings` should return **200** ✅

---

## Option B: Local Development with Manual Credentials

For local development, you need to provide credentials via environment variables.

### Setup:

1. **Get your Site ID:**
   - Go to: https://app.netlify.com/sites/mcipro-golf-platform/settings/general
   - Copy the Site ID (under "Site details")

2. **Create a Personal Access Token:**
   - Go to: https://app.netlify.com/user/applications
   - Click "New access token"
   - Give it a name (e.g., "MciPro Local Dev")
   - Copy the token (starts with `ntly_`)

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` with your credentials:**
   ```env
   NETLIFY_SITE_ID=your-actual-site-id
   NETLIFY_ACCESS_TOKEN=ntly_your_actual_token
   SITE_WRITE_KEY=mcipro-site-key-2024
   ```

5. **Test locally:**
   ```bash
   netlify dev
   curl -i "http://localhost:8888/.netlify/functions/bookings" \
     -H "Authorization: Bearer mcipro-site-key-2024"
   ```

   **Expected:** 200 OK with `{"bookings":[],"version":0,...}`

---

## What Was Fixed

### 1. **makeStore() Helper** (bookings.js lines 8-18)
```javascript
function makeStore() {
  const cfg = { name: 'mcipro-data' };

  // Auto-detect: use credentials if available, else rely on enabled Blobs
  if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_ACCESS_TOKEN) {
    cfg.siteID = process.env.NETLIFY_SITE_ID;
    cfg.token = process.env.NETLIFY_ACCESS_TOKEN;
  }

  return getStore(cfg);
}
```

### 2. **Circuit Breaker** (index.html lines 2351-2372, 2505-2530)
- Prevents function spam when server returns 500s
- Opens circuit for 60 seconds after 5xx errors
- Shows "⚠️ Server Down" or "💾 Local Only" status

### 3. **Date Input Format Fix** (index.html lines 8985-8989)
```javascript
function toDateInputValue(d) {
  if (!d) return '';
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10); // YYYY-MM-DD
}
```

### 4. **CORS Headers** (netlify.toml lines 14-19)
```toml
[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, PUT, POST, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization, X-User-Id"
```

### 5. **Duplicate Schedule Events Fixed**
- Removed code that re-created schedule events on every login
- Events now only created once when booking is made

---

## Verification Checklist

### Production (after enabling Blobs):
- [ ] Open https://mcipro-golf-platform.netlify.app
- [ ] DevTools → Network → Check for 500s (should be none)
- [ ] Create a tee time booking with caddie
- [ ] Logout and login → booking and caddie should persist
- [ ] Open on mobile → should see same booking (cross-device sync)

### Local Development:
- [ ] `.env` file created with valid credentials
- [ ] `netlify dev` runs without errors
- [ ] `curl` test returns 200 OK
- [ ] Bookings persist across page refreshes

---

## Environment Variables Needed

### For Production (Netlify UI):
1. Enable Blobs (auto-configures everything)
2. Optional: Set `SITE_WRITE_KEY` if you want custom auth

### For Local Dev (.env file):
```env
NETLIFY_SITE_ID=<your-site-id>
NETLIFY_ACCESS_TOKEN=<your-personal-token>
SITE_WRITE_KEY=mcipro-site-key-2024
```

---

## Quick Test Commands

```bash
# Local test
netlify dev
curl -i "http://localhost:8888/.netlify/functions/bookings" \
  -H "Authorization: Bearer mcipro-site-key-2024"

# Production test
curl -i "https://mcipro-golf-platform.netlify.app/.netlify/functions/bookings" \
  -H "Authorization: Bearer mcipro-site-key-2024"

# Test write
curl -i -X PUT "http://localhost:8888/.netlify/functions/bookings" \
  -H "Authorization: Bearer mcipro-site-key-2024" \
  -H "Content-Type: application/json" \
  -d '{"baseVersion":0,"bookings":[{"id":"test_1","date":"2025-10-08","time":"08:00","updatedAt":1234567890}]}'
```

---

## Files Changed

1. ✅ `netlify/functions/bookings.js` - Added makeStore() helper
2. ✅ `netlify.toml` - Added CORS headers
3. ✅ `index.html` - Circuit breaker + date format fix
4. ✅ `.env.example` - Template for local dev
5. ✅ `package.json` - Already has Node >=18

---

## Next Steps

1. **Enable Blobs in Netlify UI** (recommended for production)
2. **Create `.env` for local dev** (copy from .env.example)
3. **Test cross-device sync** (desktop + mobile)

The function is already deployed and ready. Once you enable Blobs in Netlify, everything should work perfectly! 🚀
