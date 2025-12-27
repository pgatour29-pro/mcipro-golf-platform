# HANDICAP DUAL TABLE SYNC DISASTER (2025-12-25)

## THE FUCKUP

Alan Thomas's handicap was stuck at 12.2 on the system even after updating `society_handicaps` table because **handicaps are stored in TWO places**:

1. `society_handicaps.handicap_index` - The canonical source for WHS calculations
2. `user_profiles.profile_data.golfInfo.handicap` - Legacy field still read by some UI components

**Updating only one table leaves the other stale.**

## ROOT CAUSE

The frontend code in various places reads from `user_profiles.profile_data.golfInfo.handicap` instead of always fetching from `society_handicaps`. This creates a split-brain problem.

## WHAT HAPPENED

1. Alan scored 40 points at Bangpakong (Dec 24)
2. His universal HCP should be reduced from 12.2 to 11.2 (Tier 1 GPR: -1.0)
3. I updated `society_handicaps` to 11.2 ✓
4. But `user_profiles.profile_data.golfInfo.handicap` still had "12.2"
5. UI kept showing 12.2 because it read from the wrong table

## THE FIX

Must update BOTH tables when changing handicaps:

```sql
-- 1. Update society_handicaps (canonical source)
UPDATE society_handicaps
SET handicap_index = 11.2, last_calculated_at = NOW()
WHERE golfer_id = 'U214f2fe47e1681fbb26f0aba95930d64'
AND society_id IS NULL;

-- 2. Update user_profiles.profile_data (legacy field)
UPDATE user_profiles
SET profile_data = jsonb_set(
    profile_data,
    '{golfInfo,handicap}',
    '"11.2"'
)
WHERE line_user_id = 'U214f2fe47e1681fbb26f0aba95930d64';
```

## CURL COMMANDS FOR QUICK FIXES

### Check handicaps
```bash
curl -s "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.GOLFER_ID" \
  -H "apikey: YOUR_ANON_KEY"
```

### Update society_handicaps
```bash
curl -X PATCH "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/society_handicaps?golfer_id=eq.GOLFER_ID&society_id=is.null" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"handicap_index": NEW_VALUE}'
```

### Update user_profiles.profile_data
```bash
curl -X PATCH "https://pyeeplwsnupmhgbguwqs.supabase.co/rest/v1/user_profiles?line_user_id=eq.GOLFER_ID" \
  -H "apikey: SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"profile_data": {...existing data with updated handicap...}}'
```

## PERMANENT FIX - DEPLOYED

### Database Trigger (DEPLOYED 2025-12-25)

A trigger now automatically syncs `user_profiles.profile_data.golfInfo.handicap` whenever `society_handicaps` is updated.

**Migration file:** `supabase/migrations/20251225083000_handicap_sync_trigger.sql`

```sql
CREATE OR REPLACE FUNCTION sync_handicap_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only sync UNIVERSAL handicap (society_id IS NULL) to profile
    IF NEW.society_id IS NULL THEN
        UPDATE user_profiles
        SET profile_data = jsonb_set(
            COALESCE(profile_data, '{}'::jsonb),
            '{golfInfo,handicap}',
            to_jsonb(NEW.handicap_index::text)
        ),
        updated_at = NOW()
        WHERE line_user_id = NEW.golfer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_handicap_trigger
AFTER INSERT OR UPDATE ON society_handicaps
FOR EACH ROW
EXECUTE FUNCTION sync_handicap_to_profile();
```

**Status: ACTIVE AND VERIFIED**

Updating `society_handicaps` now automatically updates `user_profiles.profile_data.golfInfo.handicap`.

## ALAN THOMAS - FINAL VALUES

| Table | Field | Value |
|-------|-------|-------|
| society_handicaps | handicap_index (universal) | 11.2 |
| society_handicaps | handicap_index (Travellers) | 10.9 |
| user_profiles | profile_data.golfInfo.handicap | "11.2" |

Golfer ID: `U214f2fe47e1681fbb26f0aba95930d64`

## TIERED GPR SYSTEM (Deployed)

| Condition | Reduction |
|-----------|-----------|
| 40 stableford pts OR -4 under | -1.0 |
| 41+ stableford pts OR -5 under | -2.0 |

**GPR only applies to UNIVERSAL handicap, not society handicaps.**

## NEVER DO THIS AGAIN

1. **Always update BOTH tables** when manually fixing handicaps
2. **Verify BOTH tables** after any handicap operation
3. **Clear browser cache** after database updates (localStorage caches profiles)
4. **Deploy the sync trigger** to prevent future split-brain issues

## FILES INVOLVED

- `C:\Users\pete\Documents\MciPro\public\index.html` - Main app with GPR logic
- `C:\Users\pete\Documents\MciPro\supabase-config.js` - Supabase connection
- Database tables: `society_handicaps`, `user_profiles`
