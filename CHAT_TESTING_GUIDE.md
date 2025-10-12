# Professional Chat System - Testing Guide

## Quick Start Testing (Console Commands)

### Step 1: Verify Module Loads Correctly

Check that the chat module returns the correct MIME type (should be 200 + text/javascript):

```javascript
fetch('/chat/chat-system-full.js').then(r => console.log(r.status, r.headers.get('content-type')));
// Expected: 200 "text/javascript" or "application/javascript"
```

### Step 2: Clear Service Worker Cache

```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => reg.unregister());
  console.log('✅ All service workers cleared');
  location.reload();
});
```

### Step 3: Sign into Supabase Auth

The chat system requires Supabase Auth (UUID-based), not just LINE authentication.

```javascript
// Get Supabase client
const supabase = await import('/chat/supabaseClient.js')
  .then(m => m.getSupabaseClient());

// Check current auth status
const { data: before } = await supabase.auth.getUser();
console.log('Before login:', before);  // likely null if not logged in

// Sign in with test credentials
await supabase.auth.signInWithPassword({
  email: 'YOUR_EMAIL@example.com',
  password: 'YOUR_PASSWORD'
});

// Verify login worked
const { data: after } = await supabase.auth.getUser();
console.log('After login:', after?.user?.id); // should show a UUID
```

### Step 4: Open Professional Chat

```javascript
window.__professionalChat.openProfessionalChat();
```

## Creating Test Users

If you don't have Supabase Auth credentials yet:

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" and create a user with email/password
3. Ensure the user also exists in the `profiles` table:

```sql
-- Run this in Supabase SQL Editor to backfill profiles
INSERT INTO public.profiles (id, display_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'name', split_part(u.email,'@',1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

## Troubleshooting

### Error: "No authenticated user"

**Cause:** Not logged into Supabase Auth
**Fix:** Run Step 3 above to sign in

### Error: Failed to load module script ... MIME type "text/html"

**Cause:** Module path 404s, Netlify returns HTML error page
**Fix:** Module paths were fixed to use `/chat/` instead of `/public/chat/` or `./`

### Error: 400 Bad Request on profiles query

**Cause:** Trying to filter `profiles.id` (UUID) with a LINE user ID
**Fix:** Already fixed - now uses `supabase.auth.getUser()` to get UUID

### Old ChatSystem Still Loads

**Cause:** Service worker cached the old code
**Fix:** Run Step 2 to clear service worker and hard refresh

## Verifying Supabase Client

Confirm your chat modules are using the same Supabase client as `window.SupabaseDB.client`:

```javascript
import('/chat/supabaseClient.js')
  .then(m => m.getSupabaseClient())
  .then(c => console.log('Same client?', c === window.SupabaseDB.client));
// Should log: Same client? true
```

## Production Deployment Checklist

- [x] Database schema deployed (conversations, messages, participants, etc.)
- [x] RLS policies fixed (no infinite recursion)
- [x] Storage bucket created (chat-media, private)
- [x] Edge functions deployed (chat-notify, chat-media)
- [x] Database webhooks configured (messages INSERT → chat-notify)
- [x] Frontend module paths fixed (/chat/ with cache-busting)
- [x] Supabase client initialization pattern fixed (await getSupabaseClient())
- [ ] Users logged into Supabase Auth (not just LIFF)
- [ ] Test messaging between two users
- [ ] Test media upload and signed URL retrieval
- [ ] Test typing indicators
- [ ] Test real-time message delivery (WebSockets)

## Integration with LINE LIFF (Future)

Currently, the chat requires manual Supabase Auth login. To integrate with LINE LIFF:

1. Create a backend endpoint that exchanges LIFF JWT for Supabase session
2. On client, after LIFF init, call your backend to get Supabase session token
3. Use `supabase.auth.setSession()` to authenticate with Supabase
4. Then the chat system will work automatically

This allows LINE users to seamlessly use the chat without separate login.
