# Logo Fix Testing Checklist

## Pre-Testing Setup

### 1. Create Supabase Storage Bucket
- [ ] Go to Supabase Dashboard → Storage
- [ ] Create new bucket: `society-logos`
- [ ] Make it **Public**
- [ ] Set file size limit to 2MB
- [ ] Add storage policies (see LOGO-SETUP-INSTRUCTIONS.md)

### 2. Wait for Deployment
- [ ] Wait 1-2 minutes for Vercel deployment to complete
- [ ] Verify deployment at: https://www.mycaddipro.com/

### 3. Verify Database State
Run this SQL to check current logo paths:
```sql
SELECT
    id,
    organizer_id,
    society_name,
    society_logo,
    created_at
FROM society_profiles
ORDER BY society_name;
```

Expected results:
- Travellers Rest Golf Group (U2b6d976f19bca4b2f4374ae0e10ed873): `./societylogos/trgg.jpg`
- JOA Golf Pattaya (JOAGOLFPAT): `./societylogos/JOAgolf.jpeg`
- Ora Ora Golf (ora-ora-golf): `./societylogos/oraora.png` or NULL

## Test Cases

### Test 1: Existing Logo Preservation (Critical!)
1. [ ] Open https://www.mycaddipro.com/
2. [ ] Open browser DevTools Console (F12)
3. [ ] Click **Dev Mode** → **Switch Society** → **JOA Golf Pattaya**
4. [ ] Go to **Profile** tab in organizer dashboard
5. [ ] Verify the JOA logo displays correctly in the preview
6. [ ] Check console logs - should see:
   ```
   [SocietyOrganizer] Loading profile for organizerId: JOAGOLFPAT
   [SocietyOrganizer] Loaded profile: {societyLogo: "./societylogos/JOAgolf.jpeg", ...}
   ```
7. [ ] **Do NOT change anything** - just click **"Save Profile"**
8. [ ] Check console logs - should see:
   ```
   [SocietyOrganizer] Selected organizerId: JOAGOLFPAT
   [SocietyOrganizer] Profile data to save: {organizerId: "JOAGOLFPAT", societyLogo: "./societylogos/JOAgolf.jpeg", ...}
   [SocietyOrganizer] Updating profile for organizerId: JOAGOLFPAT
   ```
9. [ ] **CRITICAL:** Logo should still be visible after save (not disappeared!)
10. [ ] Hard refresh (Ctrl+Shift+R) and verify logo still shows

**Result:** ✅ Logo preserved / ❌ Logo disappeared

---

### Test 2: Travellers Rest Logo
1. [ ] Click **Dev Mode** → **Switch Society** → **Travellers Rest Golf Group**
2. [ ] Go to **Profile** tab
3. [ ] Verify TRGG logo displays
4. [ ] Click **"Save Profile"** without changes
5. [ ] Logo should remain visible
6. [ ] Check console: `organizerId: U2b6d976f19bca4b2f4374ae0e10ed873`

**Result:** ✅ Logo preserved / ❌ Logo disappeared

---

### Test 3: New Logo Upload (Requires Supabase Bucket)
1. [ ] Select any society (e.g., JOA Golf)
2. [ ] Go to **Profile** tab
3. [ ] Click on the logo upload area
4. [ ] Select a new image file (under 2MB)
5. [ ] Check console logs - should see:
   ```
   [SocietyOrganizer] Uploading logo to storage...
   [SocietyOrganizer] Uploading file: society-logos/1234567890-xxxxx.jpg
   [SocietyOrganizer] Upload successful
   [SocietyOrganizer] Public URL: https://...supabase.co/storage/v1/object/public/society-logos/...
   ```
6. [ ] Preview should update immediately
7. [ ] Click **"Save Profile"**
8. [ ] Check console - `societyLogo` should be the Supabase URL (not base64!)
9. [ ] Hard refresh - logo should still display

**Result:** ✅ Upload works / ❌ Upload failed (check error message)

---

### Test 4: Wrong Society Not Updated (Critical!)
1. [ ] Note your current user ID in console (should be U2b6d976f19bca4b2f4374ae0e10ed873)
2. [ ] Switch to **JOA Golf Pattaya**
3. [ ] Edit something (e.g., description)
4. [ ] Click **"Save Profile"**
5. [ ] Check console: `Selected organizerId: JOAGOLFPAT` (NOT your user ID!)
6. [ ] Run SQL to verify:
```sql
SELECT society_name, description FROM society_profiles WHERE organizer_id = 'JOAGOLFPAT';
-- Should show JOA Golf with updated description

SELECT society_name, description FROM society_profiles WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
-- Should show Travellers Rest UNCHANGED
```

**Result:** ✅ Correct society updated / ❌ Wrong society updated

---

## Success Criteria

All tests must pass:
- ✅ Test 1: Existing logos preserved when saving
- ✅ Test 2: Works for all societies
- ✅ Test 3: New uploads work with Supabase Storage
- ✅ Test 4: Correct society is updated (not admin's society)

## Troubleshooting

**If Test 1 fails (logo disappears):**
- Check console for errors
- Verify `tempLogoData` is NOT set to base64
- Verify deployment completed

**If Test 3 fails (upload error):**
- Error: "Bucket not found" → Create the bucket in Supabase
- Error: "Policy violation" → Add storage policies
- Error: "File too large" → Use smaller image (< 2MB)

**If Test 4 fails (wrong society updated):**
- Check `AppState.selectedSociety` in console
- Verify the society selector is working correctly
- Check that organizerId fallback is not using current user ID

## Database Verification

After all tests pass, verify database state:
```sql
SELECT
    organizer_id,
    society_name,
    society_logo,
    updated_at
FROM society_profiles
ORDER BY updated_at DESC;
```

All logo paths should be valid (either `./societylogos/...` or Supabase URLs, NOT base64 data).
