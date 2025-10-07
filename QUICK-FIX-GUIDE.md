# QUICK FIX GUIDE: Booking Disappearance Issue

## Problem Summary
Bookings disappear after 3-5 minutes due to:
1. **Netlify Function in-memory storage** (resets on cold start)
2. **Login function wipes bookings** (every time user logs in)
3. **Poor sync overwrites local data** (with empty cloud data)

---

## Quick Fix (5 Minutes)

### Step 1: Install Dependency
```bash
cd C:/Users/pete/Documents/MciPro
npm install @netlify/blobs
```

### Step 2: Replace Netlify Function
```bash
# Backup
cp netlify/functions/bookings.js netlify/functions/bookings-BACKUP.js

# Replace
cp netlify/functions/bookings-FIXED.js netlify/functions/bookings.js
```

### Step 3: Fix Client Code (6 Critical Changes)

Open `C:/Users/pete/Documents/MciPro/index.html` and make these changes:

#### Change 1: Line 4566 - Comment out clean slate call
```javascript
// BEFORE (Line 4566):
ensureCleanSlateForNewUser(profileData);

// AFTER:
// ensureCleanSlateForNewUser(profileData);  // DISABLED - was wiping bookings
console.log('[FIXED] Skipping clean slate - preserving bookings');
```

#### Change 2: Line 2343 - Fix cloud sync logic
```javascript
// BEFORE (Line 2343):
if (!localData.updatedAt || (cloudData.updatedAt && cloudData.updatedAt > localData.updatedAt)) {

// AFTER:
const cloudVersion = cloudData.version || 0;
const localVersion = localData.lastSyncVersion || 0;
if (cloudVersion > localVersion) {
```

#### Change 3: Line 2350-2351 - Add safety check
```javascript
// BEFORE (Line 2350-2351):
BookingManager.bookings = cloudData.bookings;

// AFTER:
if (cloudData.bookings && cloudData.bookings.length > 0) {
    BookingManager.bookings = cloudData.bookings;
} else if (BookingManager.bookings.length > 0) {
    console.log('[SimpleCloudSync] Skipping empty cloud data - keeping local bookings');
}
```

#### Change 4: Line 9434 - Change to immediate sync
```javascript
// BEFORE (Line 9434):
SimpleCloudSync.saveToCloudSoon();

// AFTER:
SimpleCloudSync.saveToCloud().catch(() => SimpleCloudSync.saveToCloudSoon());
```

#### Change 5: Line 2314 - Faster polling
```javascript
// BEFORE (Line 2314):
}, 15000);

// AFTER:
}, 5000);  // 5 seconds instead of 15
```

#### Change 6: After Line 4545 - Add cross-device sync
```javascript
// ADD this after line 4545 (inside DOMContentLoaded):
window.addEventListener('storage', (e) => {
    if (e.key === 'mcipro_bookings' && e.newValue) {
        try {
            const newBookings = JSON.parse(e.newValue);
            if (typeof BookingManager !== 'undefined') {
                BookingManager.bookings = newBookings;
                console.log('[CrossDevice] Synced bookings from other tab');
            }
        } catch (err) {
            console.error('[CrossDevice] Sync error:', err);
        }
    }
});
```

### Step 4: Deploy
```bash
git add .
git commit -m "Fix: Booking data loss - persistent storage + sync fixes"
git push origin main
```

---

## Verification Checklist

After deploying, test these scenarios:

- [ ] Create booking → Wait 5 minutes → Refresh → Booking still there?
- [ ] Create booking → Logout → Login → Booking still there?
- [ ] Create booking in Tab 1 → Tab 2 shows it?
- [ ] Create booking offline → Go online → Syncs to cloud?
- [ ] Check Netlify function logs - no errors?
- [ ] Check Netlify Blobs dashboard - data stored?

---

## Rollback (If Needed)

```bash
# Restore original function
cp netlify/functions/bookings-BACKUP.js netlify/functions/bookings.js

# Revert git changes
git revert HEAD
git push origin main
```

---

## Detailed Documentation

For complete bug analysis and line-by-line fixes, see:
- `BUG-REPORT-BOOKING-DISAPPEARANCE.md` - Full bug report
- `FIXES-client-side.html` - Complete client-side fixes
- `netlify/functions/bookings-FIXED.js` - Fixed server function

---

## Key Files Modified

### Server-Side
- `netlify/functions/bookings.js` - Use Netlify Blobs for persistence

### Client-Side (index.html)
- Line 4566: Disable clean slate function
- Line 2343: Version-based sync
- Line 2350-2351: Safety check for empty cloud data
- Line 9434: Immediate sync
- Line 2314: Faster polling (5s)
- After 4545: Cross-device sync listener

---

## Success Indicators

You'll know it's fixed when:
1. Bookings survive page refreshes after 5+ minutes
2. Bookings persist through logout/login
3. Bookings sync instantly across browser tabs
4. Netlify function logs show persistent storage working
5. No "bookings disappeared" bug reports

---

## Support

If issues persist:
1. Check Netlify function logs for errors
2. Check browser console for sync errors
3. Verify `@netlify/blobs` package installed
4. Check Netlify Blobs dashboard for stored data
5. Review full bug report for detailed analysis
