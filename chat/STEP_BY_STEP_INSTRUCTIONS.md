# Chat Contacts Fix - Step-by-Step Instructions

## Problem

Pete and Donald don't exist in `auth.users` yet, OR they exist but their `profiles` table doesn't have `user_code` set.

## Solution (4 Simple Steps)

### STEP 1: Get the UUIDs

1. Open Supabase SQL Editor
2. Run **`STEP_1_GET_UUIDS.sql`**
3. Look at the results - find Pete and Donald's rows
4. **Copy their UUIDs** (the long string like `a1b2c3d4-...`)

**If Pete or Donald are NOT in the results:**
- They haven't logged in yet
- Have them log in to your app ONCE
- Come back and run Step 1 again

---

### STEP 2: Create profiles and set codes

1. Open **`STEP_2_CREATE_PROFILES.sql`**
2. Find these lines:
   ```sql
   WHERE id = 'PASTE_PETE_UUID_HERE';
   ```
   and
   ```sql
   WHERE id = 'PASTE_DONALD_UUID_HERE';
   ```
3. **Replace the placeholders** with the actual UUIDs from Step 1
4. Run the entire file in Supabase SQL Editor
5. Check the results at the end - should show Pete (007) and Donald (16)

---

### STEP 3: Create the RPCs

1. Run **`STEP_3_CREATE_RPCS.sql`** in Supabase
2. Should complete with success message

---

### STEP 4: Verify it works

1. Run **`STEP_4_VERIFY.sql`** in Supabase
2. Check all the test results:
   - `chat_users` view shows both Pete and Donald
   - `list_chat_contacts()` shows ONE user (the other person, not you)
   - Search '16' returns Donald
   - Search 'donald' returns Donald
   - Search '007' returns Pete
   - You NEVER see yourself

---

## If it still doesn't work

**Problem:** Pete or Donald not in Step 1 results
- **Solution:** Have them log in to the app first

**Problem:** Step 2 says "0 rows updated"
- **Solution:** The UUIDs don't match - check Step 1 again

**Problem:** Step 4 shows no results
- **Solution:** The profiles weren't created - check Step 2 results

**Problem:** Frontend still shows "No contacts"
- **Solution:**
  1. Wait for Netlify deployment
  2. Clear service worker cache
  3. Hard refresh (Ctrl+Shift+R)

---

## After everything works

You can optionally clean up the test users:

1. Go to Supabase Dashboard → Authentication → Users
2. Manually delete the random test users
3. Run this in SQL Editor to clean up orphaned data:
   ```sql
   DELETE FROM public.profiles p
   WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);
   ```

---

## Files

- `STEP_1_GET_UUIDS.sql` - Get Pete and Donald's UUIDs
- `STEP_2_CREATE_PROFILES.sql` - Set up profiles with codes
- `STEP_3_CREATE_RPCS.sql` - Create view and RPCs
- `STEP_4_VERIFY.sql` - Test everything works
