# Event Registration Fix - Deployment Steps

## Overview
Fixed event registration with proper LINE id_token verification and user mapping.

## Steps to Deploy

### 1. Run SQL Migrations in Supabase SQL Editor

Run these SQL files in order:

#### A. Create user_identities table
```sql
-- File: sql/CREATE_USER_IDENTITIES_TABLE.sql
-- Copy and paste the entire contents into Supabase SQL Editor
```

#### B. Seed Pete's identity mapping
```sql
-- File: sql/SEED_PETE_IDENTITY_MAPPING.sql
-- Copy and paste the entire contents into Supabase SQL Editor
-- This will automatically find Pete's UUID and create the mapping
```

### 2. Add LINE_CHANNEL_SECRET Environment Variable

Go to Supabase Dashboard → Edge Functions → event-register → Settings

Add this environment variable:
```
LINE_CHANNEL_SECRET = <YOUR_LINE_CHANNEL_SECRET>
```

**Where to find it:**
- LINE Developers Console
- Your channel → Basic settings → Channel secret

**Existing env vars (should already be set):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LINE_CHANNEL_ID` = 2008228481

### 3. Deploy the Edge Function

```bash
cd C:\Users\pete\Documents\MciPro
supabase functions deploy event-register
```

### 4. Test Registration

1. Open https://mycaddipro.com on mobile
2. Click "More" button in bottom navigation
3. Click "Society Events"
4. Browse to an event
5. Click "Register"
6. Fill in details and submit

**Expected result:** Success message
**If it fails:** The error will now show exactly `where` it failed:
- `env` = Missing environment variables
- `verify` = LINE id_token verification failed
- `map` = No mapping found for this LINE user
- `validate` = Missing event_id
- `insert` = Database error (will show exact column/constraint)

### 5. Verify in Database

```sql
-- Check the registration was created
SELECT * FROM event_registrations
ORDER BY created_at DESC
LIMIT 5;

-- Check the user mapping
SELECT * FROM user_identities
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
```

## What Changed

### Before (Broken)
- Used `user_profiles` table lookup
- No proper id_token verification
- Multiple failed attempts with wrong table/column names
- Tried to insert fields that don't exist

### After (Fixed)
- Proper LINE id_token JWT verification with Channel Secret
- Dedicated `user_identities` mapping table
- Simple payload matching actual database schema
- Clear error messages showing exactly where failures occur

## Troubleshooting

### Error: "no mapping for this LINE user"
Run the SEED_PETE_IDENTITY_MAPPING.sql script again.

### Error: "id_token verify failed"
Check that LINE_CHANNEL_SECRET is set correctly in Edge Function environment.

### Error: "Missing required envs"
Verify all 4 environment variables are set in Edge Function settings.

### Database error on insert
Check the error.hint and error.code fields for exact column/constraint issue.
