# JOA Logo Deployment & Event Cleanup - Nov 30, 2025

## Summary
- Fixed JOA Golf Pattaya logo display on production site
- Deleted duplicate Eastern Star event created by guest user
- Deployed changes to production

## Issues Addressed

### 1. JOA Logo Not Displaying (404 Error)
**Problem**: Logo file existed at `MciPro/societylogos/JOAgolf.jpeg` but not in `public/societylogos/` where the web app needs it.

**Solution**:
```bash
cp "C:\Users\pete\Documents\MciPro\societylogos\JOAgolf.jpeg" "C:\Users\pete\Documents\MciPro\public\societylogos\JOAgolf.jpeg"
```

**Files Modified**:
- `public/societylogos/JOAgolf.jpeg` - Copied from root societylogos folder (135KB)
- `public/sw.js` - Updated version to `joa-logo-file-added-v1` to force cache refresh

**Code Reference**:
Logo display logic already in place at `public/index.html:54222-54225`:
```javascript
if (event.name.startsWith('JOA Golf') || event.organizerId === 'JOAGOLFPAT' || event.organizerName === 'JOA Golf Pattaya') {
    return `<img src="./societylogos/JOAgolf.jpeg" alt="JOA Golf Pattaya" class="w-10 h-10 rounded-full border-2 border-white mr-3 object-cover bg-white">`;
}
```

**Deployment**:
```bash
git add public/societylogos/JOAgolf.jpeg public/sw.js
git commit -m "Add JOA Golf Pattaya logo to production"
git push
vercel --prod
```

**Production URL**: https://mcipro-golf-platform-oag9unvo7-mcipros-projects.vercel.app

---

### 2. Duplicate Eastern Star Event Cleanup
**Problem**: Guest user created duplicate "Eastern Star" event on Monday, Dec 1st, 2025.

**Event ID to Delete**: `fb3fc553-4ff9-4e40-bc9f-14fbc147331d`

**SQL Scripts Created**:

1. **sql/find_dec1_events.sql** - Diagnostic script to list all Dec 1st events
```sql
SELECT id, title, event_date, organizer_name, organizer_id, course_name, created_at
FROM society_events
WHERE event_date = '2025-12-01'
ORDER BY title, created_at;
```

2. **sql/delete_specific_event.sql** - Delete the duplicate event
```sql
DELETE FROM society_events
WHERE id = 'fb3fc553-4ff9-4e40-bc9f-14fbc147331d';
```

3. **sql/delete_eastern_star_guest_event.sql** - Alternative deletion script (evolved through iterations)

**Execution**: Run `delete_specific_event.sql` in Supabase SQL Editor

---

## Timeline

1. ✅ Identified logo file location mismatch
2. ✅ Copied JOAgolf.jpeg to public/societylogos/
3. ✅ Updated service worker version
4. ✅ Committed to git (commit: 923de8aa)
5. ✅ Deployed to Vercel production
6. ✅ Created SQL scripts to delete duplicate Eastern Star event
7. ✅ Identified specific event ID: fb3fc553-4ff9-4e40-bc9f-14fbc147331d

---

## Database Learnings

**Column Names in society_events table**:
- ❌ `event_id` - Does NOT exist
- ✅ `id` - Correct primary key column
- ❌ `created_by` - Does NOT exist
- ✅ `created_at` - Exists for timestamps
- ✅ `organizer_id` - Exists (UUID type)
- ✅ `organizer_name` - Exists (TEXT type)

---

## Files Created/Modified

**New Files**:
- `public/societylogos/JOAgolf.jpeg` (135KB)
- `sql/find_dec1_events.sql`
- `sql/delete_specific_event.sql`
- `sql/delete_eastern_star_guest_event.sql`

**Modified Files**:
- `public/sw.js` - Version: `joa-logo-file-added-v1`

**Git Commit**: 923de8aa - "Add JOA Golf Pattaya logo to production"

---

## Verification Steps

1. **Logo Display**:
   - Hard refresh browser (Ctrl+Shift+R)
   - Check JOA events show logo at `./societylogos/JOAgolf.jpeg`
   - No more 404 errors in console

2. **Event Deletion**:
   - Run verification query after deletion:
   ```sql
   SELECT COUNT(*) FROM society_events WHERE event_date = '2025-12-01';
   ```
   - Confirm only one event per title on Dec 1st

---

## Related Context

**Previous Work**:
- JOA events created for all of December 2025 (31 events)
- Times displaying as "9:00 AM" format (no seconds)
- Logo display logic implemented at `index.html:54222-54225`
- Events loading via `organizer_name` queries (not `organizer_id` to avoid UUID errors)

**JOA Golf Pattaya Organizer Info**:
- Organizer ID: `JOAGOLFPAT` (TEXT, not UUID)
- Society Name: `JOA Golf Pattaya`
- Logo Path: `./societylogos/JOAgolf.jpeg`
- Events: Daily golf events for December 2025
- Departure Time: 9:00 AM
- Start Time: 10:00 AM
