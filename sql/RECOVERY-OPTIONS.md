# EMERGENCY RECOVERY OPTIONS FOR PETE'S DELETED PRIVATE EVENTS

## What Happened
The `FIX-CLEAN-RESTORE.sql` script deleted ALL events between 2025-11-01 and 2026-01-01, not just TRGG events.

This included Pete's private events that were created during those months.

## Recovery Options

### 1. Supabase Point-in-Time Recovery (PITR)
**Supabase Pro/Team plans have automatic backups**

To restore:
1. Go to Supabase Dashboard → Settings → Backups
2. Look for backup before the DELETE was run (check timestamp of FIX-CLEAN-RESTORE.sql execution)
3. Use Point-in-Time Recovery to restore to before the delete

**Timeline:**
- Find when `FIX-CLEAN-RESTORE.sql` was run
- Restore to 5 minutes before that timestamp

### 2. Check Browser LocalStorage/IndexedDB
**Events might be cached in browser**

1. Open browser DevTools (F12)
2. Go to Application → Local Storage → https://www.mycaddipro.com
3. Look for keys containing "events" or "society"
4. Export the data and extract Pete's events

### 3. Check Git History
Look for any commits that might have the event data:
```bash
cd /c/Users/pete/Documents/MciPro
git log --all --grep="private" --grep="event" --oneline
```

### 4. Manual Recreation
If no backups exist, Pete will need to manually recreate the private events.

## Prevent Future Data Loss

**Fix the DELETE statement to be specific:**
```sql
DELETE FROM society_events
WHERE event_date >= '2025-11-01'
  AND event_date < '2026-01-01'
  AND title LIKE 'TRGG%'  -- Only TRGG events
  AND organizer_id IS NULL;  -- Additional safety
```

## Next Steps
1. Run `EMERGENCY-CHECK-DELETED-EVENTS.sql` to see if Supabase has soft-delete
2. Contact Supabase support for backup restoration
3. Check browser cache for event data
