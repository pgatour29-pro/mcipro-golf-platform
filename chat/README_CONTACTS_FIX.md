# Chat Contacts Fix - Action Plan

## Root Cause

Pete and Donald **don't exist in `auth.users`** in this Supabase project. The screenshot shows only random test users.

The `chat_users` view joins `auth.users ↔ profiles` on matching UUIDs. If Pete/Donald aren't in `auth.users`, they won't appear - even if they have profile rows elsewhere.

---

## What You Need to Do

### 1. Have Pete and Donald log in to your app ONCE

This creates their `auth.users` rows in Supabase.

**How:**
- Open your app
- Have Pete log in via LINE (or whatever auth you're using)
- Have Donald log in via LINE
- This creates their `auth.users` rows with real UUIDs

---

### 2. Run Step 1 in Supabase SQL Editor

Open `chat/FIX_AUTH_USERS_MAPPING.sql` and run Step 1:

```sql
-- See all current auth users
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC;

-- If using LINE login, pull display names
SELECT
  u.id,
  i.provider,
  COALESCE(i.identity_data->>'name', i.identity_data->>'displayName') AS line_name,
  u.created_at
FROM auth.users u
JOIN auth.identities i ON i.user_id = u.id
WHERE i.provider = 'line'
ORDER BY u.created_at DESC;
```

**Look for Pete and Donald in the results.**

Copy their UUIDs.

---

### 3. Update Step 3 in the SQL file

Replace:
- `<PETE_AUTH_UUID>` with Pete's actual UUID
- `<DONALD_AUTH_UUID>` with Donald's actual UUID

```sql
UPDATE public.profiles
SET user_code = '007',
    username = COALESCE(username, 'pete'),
    display_name = COALESCE(display_name, 'Pete Park')
WHERE id = 'PASTE_PETE_UUID_HERE';

UPDATE public.profiles
SET user_code = '16',
    username = COALESCE(username, 'donald'),
    display_name = COALESCE(display_name, 'Donald Lump')
WHERE id = 'PASTE_DONALD_UUID_HERE';
```

---

### 4. Run the entire `FIX_AUTH_USERS_MAPPING.sql` file

Copy/paste the complete file into Supabase SQL Editor and execute.

This will:
- Add missing columns to profiles
- Create profile rows for all auth users
- Set Pete = '007', Donald = '16'
- Create the `chat_users` view
- Create `list_chat_contacts()` and `search_chat_contacts()` RPCs
- Reload the schema

---

### 5. Verify it works

Run the verification queries at the bottom of the file:

```sql
SELECT * FROM public.chat_users WHERE user_code IN ('007','16');
SELECT * FROM public.list_chat_contacts();
SELECT * FROM public.search_chat_contacts('16');
SELECT * FROM public.search_chat_contacts('donald');
```

**Expected results:**
- Pete (007) and Donald (16) appear in `chat_users`
- `list_chat_contacts()` returns ONE user (the other person, not you)
- Search '16' returns Donald only
- Search 'donald' returns Donald only
- You NEVER see yourself

---

### 6. Test in the frontend

- Wait for Netlify deployment
- Clear service worker cache
- Refresh chat page
- Search for "16", "donald", "007"
- Empty search should show both contacts
- You should never see yourself in the list

---

## Why This Fix Works

**Before:** Trying to seed profiles with fake UUIDs that don't exist in `auth.users`

**After:** Real users log in → create `auth.users` rows → map those UUIDs to profiles → set user codes

The join `auth.users.id = profiles.id` now works because both sides have matching UUIDs.

---

## Files

- `chat/FIX_AUTH_USERS_MAPPING.sql` - Complete SQL fix (use this)
- `chat/chat-system-full.js` - Frontend already uses RPCs ✅
- `chat/README_CONTACTS_FIX.md` - This file

---

## Clean Up (Optional)

After it works, you can manually delete the garbage test users:

1. Go to Supabase Dashboard → Authentication → Users
2. Delete the random test users (manually, can't do via SQL)
3. Run the orphan cleanup queries in Step 7 of the SQL file
