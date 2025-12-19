# EVENT RESTORATION INSTRUCTIONS

**Created:** November 1, 2025
**Purpose:** Restore all lost society events for TRGG golfers and organizers

---

## WHAT WAS LOST

During the October 25th rollback and subsequent fixes, all society events were deleted from the database:
- **October 2025**: 11 TRGG events (Oct 20-31)
- **November 2025**: 25 TRGG events (Nov 1-29)
- **Total Lost**: 36 events

---

## QUICK RESTORATION (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/editor
2. Click **New Query**

### Step 2: Run Restoration Script

1. Open this file: `C:\Users\pete\Documents\MciPro\sql\RESTORE_ALL_SOCIETY_EVENTS.sql`
2. Copy **ALL contents** (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor
4. Click **RUN** (or press Ctrl+Enter)

### Step 3: Verify Success

You should see output like:
```
=========================================
EVENT RESTORATION COMPLETE
=========================================
Total Events Restored: 36

=========================================
OCTOBER 2025 EVENTS:
-----------------------------------------
2025-10-20 | TRGG - Pattaya C.C. | Pattaya C.C. | 1950
2025-10-21 | TRGG - Treasure Hill | Treasure Hill | 1750
...

=========================================
NOVEMBER 2025 EVENTS:
-----------------------------------------
2025-11-01 | TRGG - GREENWOOD | GREENWOOD | 1850
2025-11-03 | TRGG - KHAO KHEOW... | KHAO KHEOW... | 2250
...

=========================================
SUCCESS!
=========================================
All TRGG events have been restored.
Events are now visible in:
  - Golfer Society Page
  - Society Organizer Dashboard
=========================================
```

---

## WHERE TO VERIFY

### For Golfers:
1. Open: https://mycaddipro.com
2. Navigate to: **Society Golf** or **Events** section
3. You should see all 36 TRGG events listed

### For Society Organizers:
1. Open: https://mycaddipro.com
2. Go to: **Society Organizer Dashboard**
3. Navigate to: **Events** tab
4. All 36 events should appear with:
   - Event name
   - Date
   - Course
   - Fees
   - Status: "open"
   - Max players: 80

---

## WHAT THE SCRIPT DOES

1. **Cleans up duplicates**: Deletes any partial Oct-Nov events to avoid conflicts
2. **Restores October events**: Inserts 11 events (Oct 20-31)
3. **Restores November events**: Inserts 25 events (Nov 1-29)
4. **Verifies restoration**: Shows count and list of all restored events
5. **Uses transaction**: Wrapped in BEGIN/COMMIT for safety

---

## EVENT DETAILS RESTORED

### All events include:
- ✅ Event name and course
- ✅ Date and start time
- ✅ Base fees (cart & caddy included)
- ✅ Max players: 80
- ✅ Organizer: Travellers Rest Golf Group (Pete Park)
- ✅ Status: Open for registration
- ✅ Cutoff: Day before at 6pm
- ✅ Auto-waitlist: Enabled
- ✅ Departure and tee times in notes

### Special Events Restored:
- **Free Food Fridays** at Burapha (Oct 31, Nov 7, 14, 28)
- **Two Man Scramble** at Burapha (Oct 24, Nov 21)
- **Monthly Medal Stroke** at Bangpra (Oct 29) and Bangpakong (Nov 26)

---

## TROUBLESHOOTING

### Problem: "relation society_events does not exist"

**Solution:** Create the table first:
```bash
# Run this file in Supabase SQL Editor:
C:\Users\pete\Documents\MciPro\sql\society-golf-schema.sql
```

Then run the restoration script again.

---

### Problem: "duplicate key value violates unique constraint"

**Solution:** Some events already exist. The script will clean these up automatically. If error persists:
```sql
-- Manually delete Oct-Nov events first:
DELETE FROM society_events
WHERE organizer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
  AND date >= '2025-10-20'
  AND date <= '2025-11-30';
```

Then run the restoration script.

---

### Problem: Events don't appear in the UI

**Possible causes:**
1. **RLS policies blocking access**: Check Row Level Security policies
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'society_events';
   ```

2. **Wrong organizer_id filter in app**: Verify the app is filtering by correct organizer_id

3. **Cache issue**: Hard refresh browser (Ctrl+Shift+R)

4. **Code still points to localStorage**: Check if app code was updated to use Supabase

---

### Problem: "Restored 0 events"

**Solution:** Check if the organizer_id is correct:
```sql
-- Check what organizer_id exists in the table:
SELECT DISTINCT organizer_id FROM society_events;

-- If empty, the INSERT failed - check error messages
```

---

## IMPORTANT NOTES

1. **Safe to run multiple times**: Script deletes and re-inserts, so you can run it repeatedly

2. **Transaction protected**: Uses BEGIN/COMMIT - if anything fails, nothing changes

3. **No registrations restored**: This only restores event listings. If golfers had registered for these events, those registrations were also lost and would need separate restoration

4. **Organizer ID**: All events use Pete Park's LINE user ID as organizer: `U2b6d976f19bca4b2f4374ae0e10ed873`

---

## AFTER RESTORATION

### Immediate Actions:
1. ✅ Verify events appear in both golfer and organizer views
2. ✅ Test event registration flow
3. ✅ Check that waitlist works
4. ✅ Notify golfers that events are back

### Follow-up:
1. ✅ Commit restoration script to git (for future reference)
2. ✅ Set up database backups (Supabase has automatic backups)
3. ✅ Document what caused the data loss to prevent recurrence
4. ✅ Consider adding event data validation before deployments

---

## DEPLOYMENT NOTES

**IMPORTANT:** The system uses **Vercel** for deployment.

Deployment process:
1. Vercel auto-deploys on git push to master
2. Service worker cache is versioned by BUILD_TIMESTAMP
3. HTML files are never cached (always fresh from network)

See: `DEPLOYMENT.md` for full deployment instructions.

---

## FILES CREATED

| File | Purpose |
|------|---------|
| `sql/RESTORE_ALL_SOCIETY_EVENTS.sql` | Main restoration script (36 events) |
| `EVENT_RESTORATION_INSTRUCTIONS.md` | This file - step-by-step guide |

---

## SUCCESS CRITERIA

✅ **36 total events restored**:
   - 11 October events (Oct 20-31)
   - 25 November events (Nov 1-29)

✅ **Golfer Society Page shows all events**

✅ **Society Organizer Dashboard shows all events**

✅ **Golfers can register for events**

✅ **Waitlist system works**

---

## READY TO RESTORE?

1. **Open Supabase**: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/editor
2. **Open file**: `C:\Users\pete\Documents\MciPro\sql\RESTORE_ALL_SOCIETY_EVENTS.sql`
3. **Copy all contents**
4. **Paste into SQL Editor**
5. **Click RUN**
6. **Verify success message**
7. **Check app**: https://mycaddipro.com

---

**Total Time: ~5 minutes from start to verified restoration**

Good luck! 🚀
